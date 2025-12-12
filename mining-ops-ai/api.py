import uvicorn
import ollama
import json
import pandas as pd
import os
import uuid
import re
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# --- 1. IMPOR "OTAK" AI DARI SIMULATOR.PY ---
# Ini akan memuat model ML dan database ke memori saat server start
try:
    from simulator import (
        CONFIG,
        get_strategic_recommendations,
        format_konteks_for_llm,
        LLM_PROVIDER,
        OLLAMA_MODEL,
        load_fresh_data,
        analyze_hauling_for_production,
        get_hauling_based_recommendations
    )
    print("✅ Berhasil mengimpor 'otak' dari simulator.py")
except ImportError as e:
    print(f"❌ ERROR CRITICAL: Gagal mengimpor dari 'simulator.py'.")
    print(f"Pastikan file 'simulator.py' ada di folder yang sama.")
    print(f"Detail Error: {e}")
    exit()
except Exception as e:
    print(f"❌ ERROR saat inisialisasi simulator: {e}")
    exit()

from chatbot import execute_and_summarize

# --- 2. INISIALISASI APLIKASI API ---
app = FastAPI(
    title="Mining Ops AI API",
    description="Backend API untuk simulasi tambang hybrid, logistik kapal, dan chatbot KTT (Ollama).",
    version="3.1.0"
)

# --- 3. DEFINISI MODEL INPUT (DATA CONTRACT) ---

# Model untuk Parameter Ekonomi (What-If Analysis)
class FinancialParams(BaseModel):
    """Parameter Finansial Kustom (Opsional)"""
    HargaJualBatuBara: float = Field(800000, description="Harga Jual per Ton (IDR)")
    HargaSolar: float = Field(15000, description="Harga Solar per Liter (IDR)")
    BiayaAntrianPerJam: float = Field(100000, description="Biaya operasional per jam antri (IDR)")
    BiayaPenaltiKeterlambatanKapal: float = Field(100000000, description="Biaya Penalti Flat jika kapal telat (IDR)")
    BiayaRataRataInsiden: float = Field(500000, description="Biaya rata-rata per insiden/delay (IDR)")
    BiayaDemurragePerJam: float = Field(5000000, description="Denda kapal per jam delay (IDR)")

# Model untuk Kondisi Lapangan
class FixedConditions(BaseModel):
    weatherCondition: str = Field("Cerah", example="Hujan Ringan")
    roadCondition: str = Field("GOOD", example="FAIR")
    shift: str = Field("SHIFT_1", example="SHIFT_1")
    target_road_id: Optional[str] = Field(None, description="ID Rute dari database (Optional - AI will explore all if not provided)")
    target_excavator_id: Optional[str] = Field(None, description="ID Excavator dari database (Optional - AI will explore all if not provided)")
    target_schedule_id: Optional[str] = Field(None, description="ID Jadwal Kapal (Opsional)")
    simulation_start_date: Optional[str] = Field(None, description="Tanggal mulai simulasi (ISO 8601)")
    totalProductionTarget: Optional[float] = Field(0, description="Target Produksi Batubara (Ton)")

# Model untuk Variabel Keputusan
class DecisionVariables(BaseModel):
    min_trucks: int = Field(5, ge=1, le=100, description="Minimum number of trucks to test")
    max_trucks: int = Field(15, ge=1, le=100, description="Maximum number of trucks to test")
    min_excavators: int = Field(1, ge=1, le=20, description="Minimum number of excavators to test")
    max_excavators: int = Field(3, ge=1, le=20, description="Maximum number of excavators to test")

# Model Request Utama (Simulasi)
class RecommendationRequest(BaseModel):
    """Payload utama untuk Endpoint Strategi"""
    fixed_conditions: FixedConditions
    decision_variables: DecisionVariables
    # Opsional: Jika user tidak mengirim ini, server pakai default
    financial_params: Optional[FinancialParams] = None 

# Model Request Chatbot
class ChatRequest(BaseModel):
    """Payload untuk Endpoint Chatbot"""
    pertanyaan_user: str
    top_3_strategies_context: Optional[List[Dict[str, Any]]] = None
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None

# Model untuk Menambah Data Baru (Kapal/Jadwal)
class NewVessel(BaseModel):
    name: str
    type: str = "Bulk Carrier"
    capacity: float

class NewSchedule(BaseModel):
    vesselId: str
    loadingPort: str
    destination: str
    etaLoading: str # Format ISO
    etsLoading: str # Deadline
    plannedQuantity: float
    buyer: str

# --- 4. ENDPOINT API UTAMA ---

@app.get("/")
def read_root():
    return {"status": "online", "service": "Mining Ops AI Assistant v3.0"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Mining Ops AI",
        "version": "3.1.0",
        "llm_provider": LLM_PROVIDER,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/get_top_3_strategies")
async def dapatkan_rekomendasi_strategis(request: RecommendationRequest):
    try:
        print(f"📡 Menerima request strategi baru...")
        
        active_financial_params = {}
        if request.financial_params:
            active_financial_params = request.financial_params.dict()
            print("   ℹ️ Menggunakan Parameter Finansial Kustom (User Input)")
        else:
            active_financial_params = CONFIG['financial_params']
            print("   ℹ️ Menggunakan Parameter Finansial Default Server")
        
        top_3_list = get_strategic_recommendations(
            request.fixed_conditions.dict(),
            request.decision_variables.dict(),
            active_financial_params 
        )
        
        if top_3_list:
            data = load_fresh_data()
            formatted_json_str = format_konteks_for_llm(top_3_list, data)
            formatted_data = json.loads(formatted_json_str)
            
            return {"top_3_strategies": formatted_data}
        else:
            raise HTTPException(status_code=500, detail="Simulasi selesai tapi tidak menghasilkan rekomendasi valid.")
            
    except Exception as e:
        print(f"❌ Error di /get_top_3_strategies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.post("/get_strategies_with_hauling")
async def dapatkan_strategi_dengan_hauling(request: RecommendationRequest):
    """
    ENDPOINT ENHANCED: Get AI strategies WITH matching hauling activity data.
    This enables production creation from REAL hauling data instead of simulations only.
    """
    try:
        print(f"📡 Menerima request strategi dengan integrasi hauling...")
        
        active_financial_params = {}
        if request.financial_params:
            active_financial_params = request.financial_params.dict()
        else:
            active_financial_params = CONFIG['financial_params']
        
        # Use enhanced function that includes hauling analysis
        top_3_list = get_hauling_based_recommendations(
            request.fixed_conditions.dict(),
            request.decision_variables.dict(),
            active_financial_params 
        )
        
        if top_3_list:
            data = load_fresh_data()
            formatted_json_str = format_konteks_for_llm(top_3_list, data)
            formatted_data = json.loads(formatted_json_str)
            
            # Add hauling analysis to each strategy in the response
            for i, strategy in enumerate(formatted_data):
                key = f"OPSI_{i+1}"
                if key in strategy and i < len(top_3_list):
                    raw_strategy = top_3_list[i]
                    strategy[key]['HAULING_DATA'] = {
                        'has_hauling_data': raw_strategy.get('has_hauling_data', False),
                        'hauling_activity_count': raw_strategy.get('hauling_activity_count', 0),
                        'hauling_analysis': raw_strategy.get('hauling_analysis', {})
                    }
            
            return {"top_3_strategies": formatted_data}
        else:
            raise HTTPException(status_code=500, detail="Simulasi selesai tapi tidak menghasilkan rekomendasi valid.")
            
    except Exception as e:
        print(f"❌ Error di /get_strategies_with_hauling: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.post("/analyze_hauling_activities")
async def analyze_hauling(request: FixedConditions):
    """
    ENDPOINT: Analyze existing hauling activities without running full simulation.
    Returns aggregated metrics and activity IDs that can be used for production creation.
    """
    try:
        print(f"📡 Analyzing hauling activities for production...")
        
        data = load_fresh_data()
        analysis = analyze_hauling_for_production(request.dict(), data)
        
        return analysis
        
    except Exception as e:
        print(f"❌ Error di /analyze_hauling_activities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.post("/ask_chatbot")
async def tanya_jawab_chatbot(request: ChatRequest):
    """
    ENDPOINT 2: AGEN CHATBOT (Ollama Local)
    Menjawab pertanyaan user berdasarkan konteks 3 strategi terbaik ATAU data database.
    Mendukung percakapan berkelanjutan dengan conversation history.
    """
    
    if LLM_PROVIDER != "ollama":
        raise HTTPException(status_code=503, detail="Layanan Chatbot (Ollama) tidak terhubung di server.")

    try:
        print(f"💬 Menerima pertanyaan chatbot: {request.pertanyaan_user}")

        q = (request.pertanyaan_user or "").lower()
        has_id = bool(re.search(r"\b(cm[a-z0-9]{5,}|trk[-_]?[a-z0-9]+|exc[-_]?[a-z0-9]+|ves[-_]?[a-z0-9]+|sch[-_]?[a-z0-9]+)\b", q))
        remaining_words = (
            "berapa ton lagi" in q
            or "sisa" in q
            or "kurang berapa" in q
            or "harus dipenuhi" in q
            or "butuh berapa" in q
            or "maksud saya" in q
            or "yang saya maksud" in q
        )

        history_has_id = False
        if request.conversation_history and isinstance(request.conversation_history, list):
            for item in request.conversation_history[-10:]:
                if isinstance(item, dict):
                    txt = (item.get("content") or item.get("question") or "").lower()
                    if re.search(r"\b(cm[a-z0-9]{5,}|trk[-_]?[a-z0-9]+|exc[-_]?[a-z0-9]+|ves[-_]?[a-z0-9]+|sch[-_]?[a-z0-9]+)\b", txt):
                        history_has_id = True
                        break

        force_db_mode = has_id or remaining_words

        count_by_site = (
            (
                ("jumlah" in q or "berapa" in q or "total" in q or "count" in q or "rekap" in q or "summary" in q or "overall" in q or "cek" in q)
                and ("production record" in q or "record produksi" in q or "production_records" in q)
                and ("site" in q or "lokasi" in q)
            )
            or bool(re.search(r"\bberapa\s+jumlah\s+production\s+record\b", q))
        )

        ops_by_pr = (
            ("operator" in q)
            and ("production" in q or "produksi" in q)
            and ("record" in q)
            and ("id" in q or bool(re.search(r"\bcm[a-z0-9]{5,}\b", q)))
        )

        truck_usage = (
            ("truck" in q or "truk" in q)
            and ("kapasitas" in q or "capacity" in q or "jumlah" in q or "berapa" in q or "total" in q)
            and ("unit" in q or "site" in q or "lokasi" in q)
            and ("id" in q or bool(re.search(r"\bcm[a-z0-9]{5,}\b", q)))
        )

        hauling_summary = (
            ("hauling" in q or "trip" in q or "perjalanan" in q or "angkut" in q)
            and ("ringkasan" in q or "summary" in q or "rekap" in q or "tampilkan" in q or "lihat" in q or "statistik" in q or "laporan" in q or "total" in q or "berapa" in q)
        )

        production_summary = (
            ("produksi" in q or "production" in q or "batubara" in q)
            and ("target" in q or "perbandingan" in q or "efisiensi" in q or "utilisasi" in q or "cycle time" in q or "loading" in q)
        )

        fleet_status = (
            (("truk" in q or "truck" in q) and ("excavator" in q))
            or (("armada" in q or "fleet" in q) and ("status" in q or "aktif" in q or "idle" in q or "maintenance" in q or "perawatan" in q))
            or (("jumlah" in q or "berapa" in q) and ("aktif" in q or "idle" in q or "maintenance" in q) and ("truk" in q or "excavator" in q or "truck" in q))
        )

        force_db_mode = force_db_mode or count_by_site or ops_by_pr or truck_usage or hauling_summary or production_summary or fleet_status

        if request.top_3_strategies_context and len(request.top_3_strategies_context) > 0 and not force_db_mode:
            data_konteks_string = json.dumps(request.top_3_strategies_context, indent=2)
            
            system_prompt = f"""
            !!! PERINTAH UTAMA: RESPONS ANDA HARUS SELALU DALAM BAHASA INDONESIA. !!!
            
            PERAN ANDA:
            Anda adalah KEPALA TEKNIK TAMBANG (KTT) senior yang berpengalaman.
            Tugas Anda adalah menjawab pertanyaan user mengenai 3 STRATEGI TERBAIK yang datanya diberikan di bawah ini.

            DATA 3 STRATEGI TERBAIK (JSON):
            {data_konteks_string}
            
            ATURAN MENJAWAB:
            1. Jawab HANYA berdasarkan data konteks di atas. Jangan halusinasi.
            2. Fokus jawaban Anda pada 3 strategi ini saja.
            3. Gunakan istilah 'ESTIMASI_PROFIT', 'FUEL_RATIO' (L/Ton), dan 'IDLE_ANTRIAN'.
            4. Jika ditanya rekomendasi, jelaskan trade-off antara Profit vs Efisiensi/Antrian.
            5. Gunakan Bahasa Indonesia yang profesional, tegas, dan teknis.
            """
            
            messages_for_ollama = [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': request.pertanyaan_user}
            ]
            
            response = ollama.chat(
                model=OLLAMA_MODEL, 
                messages=messages_for_ollama
            )
            
            jawaban_ai = response['message']['content']
            return {"jawaban_ai": jawaban_ai}
            
        else:
            print("   ℹ️ Mode: Query Database (Text-to-SQL)")
            
            session_id = request.session_id
            conversation_history = request.conversation_history
            
            result = execute_and_summarize(
                request.pertanyaan_user, 
                session_id=session_id,
                conversation_history=conversation_history
            )
            
            if isinstance(result, dict):
                return {
                    "jawaban_ai": result.get("answer"),
                    "steps": result.get("steps"),
                    "sql_query": result.get("sql_query")
                }
            else:
                return {"jawaban_ai": result}

    except Exception as e:
        if "Connection refused" in str(e):
             raise HTTPException(status_code=503, detail="Gagal menghubungi Ollama. Pastikan server Ollama berjalan.")
        print(f"❌ Error di /ask_chatbot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error Chatbot: {str(e)}")

# --- 5. ENDPOINT MANAJEMEN DATA (BONUS) ---

@app.post("/add_vessel")
async def add_vessel(vessel: NewVessel):
    """Menambah data master kapal ke CSV"""
    try:
        file_path = os.path.join('data', 'vessels.csv')
        new_id = f"ves-{uuid.uuid4().hex[:8]}"
        
        new_data = pd.DataFrame([{
            "id": new_id,
            "name": vessel.name,
            "type": vessel.type,
            "capacity": vessel.capacity,
            "createdAt": datetime.now().isoformat()
        }])
        
        if os.path.exists(file_path):
            new_data.to_csv(file_path, mode='a', header=False, index=False)
        else:
            new_data.to_csv(file_path, mode='w', header=True, index=False)
            
        return {"status": "success", "message": f"Kapal {vessel.name} berhasil ditambahkan.", "id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/add_schedule")
async def add_schedule(schedule: NewSchedule):
    """Menambah jadwal pengapalan baru ke CSV"""
    try:
        file_path = os.path.join('data', 'sailing_schedules.csv')
        new_id = f"sch-{uuid.uuid4().hex[:8]}"
        
        new_data = pd.DataFrame([{
            "id": new_id,
            "vesselId": schedule.vesselId,
            "loadingPort": schedule.loadingPort,
            "destination": schedule.destination,
            "etaLoading": schedule.etaLoading,
            "etsLoading": schedule.etsLoading,
            "plannedQuantity": schedule.plannedQuantity,
            "actualQuantity": 0,
            "buyer": schedule.buyer,
            "status": "SCHEDULED",
            "createdAt": datetime.now().isoformat()
        }])
        
        if os.path.exists(file_path):
            new_data.to_csv(file_path, mode='a', header=False, index=False)
        else:
            new_data.to_csv(file_path, mode='w', header=True, index=False)
            
        return {"status": "success", "message": "Jadwal berhasil dibuat.", "id": new_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 6. JALANKAN SERVER ---
if __name__ == "__main__":
    print("🚀 Memulai Server API...")
    print("📄 Dokumentasi tersedia di: http://127.0.0.1:8000/docs")
    uvicorn.run(app, host="127.0.0.1", port=8000)