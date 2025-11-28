import pandas as pd
import joblib
import json
import warnings
import numpy as np
import ollama
import os
import simpy
from itertools import product

# --- 0. KONFIGURASI & PATH ---
warnings.filterwarnings('ignore')
DATA_FOLDER = 'data'
MODEL_FOLDER = 'models'

def load_config():
    """Memuat parameter finansial default."""
    return {
        'financial_params': {
            'HargaJualBatuBara': 800000, 
            'HargaSolar': 15000, 
            'BiayaPenaltiKeterlambatanKapal': 100000000,
            'BiayaRataRataInsiden': 50000000,
            'BiayaDemurragePerJam': 50000000
        }
    }

def format_currency(value):
    if value >= 1_000_000_000: return f"{value/1_000_000_000:.2f} Miliar IDR"
    elif value >= 1_000_000: return f"{value/1_000_000:.0f} Juta IDR"
    else: return f"{value:,.0f} IDR"

from data_loader import load_data

CONFIG = load_config()
MODEL_FUEL = None
MODEL_FUEL_REAL = None
MODEL_LOAD = None
MODEL_TONASE = None
MODEL_DELAY = None
MODEL_RISIKO = None
MODEL_COLUMNS = []
LLM_PROVIDER = None
OLLAMA_MODEL = "qwen3:1.7b"

def load_models():
    global MODEL_FUEL, MODEL_FUEL_REAL, MODEL_LOAD, MODEL_TONASE, MODEL_DELAY, MODEL_RISIKO, MODEL_COLUMNS, LLM_PROVIDER, OLLAMA_MODEL
    if MODEL_FUEL is None:
        try:
            print(f"Loading ML models from '{MODEL_FOLDER}'...")
            MODEL_FUEL = joblib.load(os.path.join(MODEL_FOLDER, 'model_fuel.joblib'))
            MODEL_FUEL_REAL = joblib.load(os.path.join(MODEL_FOLDER, 'model_fuel_real.joblib'))
            MODEL_LOAD = joblib.load(os.path.join(MODEL_FOLDER, 'model_load_weight.joblib'))
            MODEL_TONASE = joblib.load(os.path.join(MODEL_FOLDER, 'model_tonase.joblib'))
            MODEL_DELAY = joblib.load(os.path.join(MODEL_FOLDER, 'model_delay_probability.joblib'))
            MODEL_RISIKO = joblib.load(os.path.join(MODEL_FOLDER, 'model_risiko.joblib'))
            
            with open(os.path.join(MODEL_FOLDER, 'numerical_columns.json')) as f: 
                NUM_COLS = json.load(f)
            with open(os.path.join(MODEL_FOLDER, 'categorical_columns.json')) as f: 
                CAT_COLS = json.load(f)
            MODEL_COLUMNS = NUM_COLS + CAT_COLS
            
            print(f"✅ Loaded 6 ML models: fuel, fuel_real, load_weight, tonase, delay_probability, risiko")
            
            print(f"Checking Ollama connection...")
            try:
                ollama.list()
                LLM_PROVIDER = "ollama"
                print(f"✅ SISTEM SIAP. Menggunakan model: {OLLAMA_MODEL}")
            except:
                print("⚠️ OLLAMA TIDAK TERHUBUNG.")
                LLM_PROVIDER = None
        except Exception as e:
            print(f"❌ GAGAL MEMUAT MODEL: {e}")
            LLM_PROVIDER = None

def load_fresh_data():
    print(f"🔄 Loading fresh data from database...")
    
    DB_TRUCKS = load_data('trucks', 'trucks.csv').set_index('id')
    DB_EXCAVATORS = load_data('excavators', 'excavators.csv').set_index('id')
    DB_OPERATORS = load_data('operators', 'operators.csv').set_index('id')
    DB_ROADS = load_data('road_segments', 'road_segments.csv').set_index('id')
    
    try:
        DB_SCHEDULES = load_data('sailing_schedules', 'sailing_schedules.csv').set_index('id')
        DB_SCHEDULES['etsLoading'] = pd.to_datetime(
            DB_SCHEDULES['etsLoading'], 
            errors='coerce', 
            format='mixed'
        )
        
        invalid_count = DB_SCHEDULES['etsLoading'].isna().sum()
        if invalid_count > 0:
            print(f"   ⚠️ Warning: {invalid_count} jadwal dengan tanggal invalid (diabaikan).")
            DB_SCHEDULES = DB_SCHEDULES.dropna(subset=['etsLoading'])
        
        if len(DB_SCHEDULES) > 0:
            current_time = pd.Timestamp.now(tz='UTC')
            too_old_cutoff = current_time - pd.Timedelta(days=30)
            
            # Convert timezone-naive datetime to timezone-aware UTC
            try:
                DB_SCHEDULES['etsLoading'] = DB_SCHEDULES['etsLoading'].dt.tz_localize('UTC')
            except TypeError:
                # If already timezone-aware, convert to UTC
                DB_SCHEDULES['etsLoading'] = DB_SCHEDULES['etsLoading'].dt.tz_convert('UTC')
            
            DB_SCHEDULES = DB_SCHEDULES.dropna(subset=['etsLoading'])
            
            before_filter = len(DB_SCHEDULES)
            DB_SCHEDULES = DB_SCHEDULES[DB_SCHEDULES['etsLoading'] > too_old_cutoff]
            filtered_count = before_filter - len(DB_SCHEDULES)
            
            if filtered_count > 0:
                print(f"   ⚠️ Warning: {filtered_count} jadwal sudah lewat >30 hari (diabaikan).")
            
        print(f"   > Schedules: {len(DB_SCHEDULES)} jadwal valid dimuat.")
        
        try:
            DB_VESSELS = load_data('vessels', 'vessels.csv').set_index('id')
        except:
            DB_VESSELS = pd.DataFrame()
    except Exception as e:
        print(f"   ⚠️ Warning: Gagal memuat data kapal ({e})")
        DB_SCHEDULES = pd.DataFrame()
        DB_VESSELS = pd.DataFrame()

    maint = load_data('maintenance_logs', 'maintenance_logs.csv')
    maint = maint[maint['status'] == 'COMPLETED']
    maint['completionDate'] = pd.to_datetime(maint['completionDate'])
    DB_MAINTENANCE_SORTED = maint.sort_values('completionDate')
    
    print(f"✅ Fresh data loaded successfully!")
    
    return {
        'trucks': DB_TRUCKS,
        'excavators': DB_EXCAVATORS,
        'operators': DB_OPERATORS,
        'roads': DB_ROADS,
        'schedules': DB_SCHEDULES,
        'vessels': DB_VESSELS,
        'maintenance': DB_MAINTENANCE_SORTED
    }

print("\n--- INITIALIZING SYSTEM (v3.1 - Dynamic Data) ---")
load_models()

# --- 2. LOGIKA SIMULASI ---

def get_features_for_prediction(truck_id, operator_id, road_id, excavator_id, weather, road_cond, shift, sim_time, data):
    try:
        truck = data['trucks'].loc[truck_id]
        excavator = data['excavators'].loc[excavator_id]
        operator = data['operators'].loc[operator_id]
        road = data['roads'].loc[road_id]
        
        # Fix timezone handling for truck age
        purchase_date = pd.to_datetime(truck['purchaseDate'])
        if purchase_date.tzinfo is None:
            purchase_date = purchase_date.tz_localize('UTC')
        
        if sim_time.tzinfo is None:
            sim_time = sim_time.tz_localize('UTC')
            
        truck_age_days = (sim_time - purchase_date.tz_convert(sim_time.tz)).days
        
        try: op_exp = json.loads(operator['competency']).get('years_experience', 0)
        except: op_exp = 0
            
        last_maint = data['maintenance'].loc[
            (data['maintenance']['truckId'] == truck_id) &
            (data['maintenance']['completionDate'] < sim_time)
        ]
        days_since_maint = 365 
        if not last_maint.empty:
            last_date = pd.to_datetime(last_maint.iloc[-1]['completionDate'])
            if last_date.tzinfo is None:
                last_date = last_date.tz_localize('UTC')
            days_since_maint = (sim_time - last_date.tz_convert(sim_time.tz)).days

        feature_dict = {
            'capacity': float(truck['capacity']), 
            'bucketCapacity': float(excavator['bucketCapacity']),
            'rating': float(operator['rating']), 
            'operator_experience_years': float(op_exp),
            'distance': float(road['distance']),
            'gradient': float(road['gradient']),
            'truck_age_days': float(truck_age_days), 
            'days_since_last_maintenance': float(days_since_maint),
            'weatherCondition': weather, 
            'roadCondition': road_cond,
            'shift': shift, 
            'brand': truck['brand'], 
            'model_excavator': excavator['model']
        }
        return pd.DataFrame([feature_dict])[MODEL_COLUMNS]
    except Exception as e:
        # print(f"Feature extraction error: {e}") # Debug only
        return pd.DataFrame(columns=MODEL_COLUMNS)

def truck_process_hybrid(env, truck_id, operator_id, resources, global_metrics, skenario, sim_start_time, data):
    weather = skenario['weatherCondition']
    road_cond = skenario['roadCondition']
    shift = skenario['shift']
    
    excavator_id = skenario.get('target_excavator_id')
    if excavator_id not in data['excavators'].index: excavator_id = data['excavators'].index[0]
    road_id = skenario.get('target_road_id')
    if road_id not in data['roads'].index: road_id = data['roads'].index[0]

    excavator_resource = resources['excavator']
    
    try: kapasitas_ton = data['trucks'].loc[truck_id]['capacity']
    except: return 

    weather_factor = 1.25 if "Hujan" in str(weather) else 1.0

    while True:
        start_cycle_time = env.now
        current_sim_time = sim_start_time + pd.Timedelta(seconds=env.now*3600)
        
        feats = get_features_for_prediction(truck_id, operator_id, road_id, excavator_id, weather, road_cond, shift, current_sim_time, data)
        
        # Default values with slight randomization to avoid identical outputs if ML fails
        fuel = 10.0 * np.random.uniform(0.9, 1.1)
        fuel_real = 10.0 * np.random.uniform(0.9, 1.1)
        load = kapasitas_ton * 0.87 * np.random.uniform(0.95, 1.05)
        tonase = load
        delay = 0.05
        risiko = 0.1
        
        if not feats.empty:
            try:
                fuel = MODEL_FUEL.predict(feats)[0]
                fuel_real = MODEL_FUEL_REAL.predict(feats)[0]
                raw_load = MODEL_LOAD.predict(feats)[0]
                load = raw_load * 0.87
                tonase = MODEL_TONASE.predict(feats)[0]
                delay = MODEL_DELAY.predict_proba(feats)[0][1]
                risiko = MODEL_RISIKO.predict(feats)[0]
                
                fuel = max(fuel, fuel_real)
                load = max(load, tonase * 0.87)
                
            except Exception as e:
                # print(f"ML Prediction error: {e}")
                pass

        avg_hauling = 31.76 * weather_factor
        yield env.timeout(avg_hauling / 60.0)
        
        waktu_masuk_antrian = env.now
        
        with excavator_resource.request() as req:
            yield req
            
            waktu_keluar_antrian = env.now
            
            durasi_antri = waktu_keluar_antrian - waktu_masuk_antrian
            global_metrics['total_waktu_antri_jam'] += durasi_antri
            
            avg_loading = 11.02
            actual_loading = avg_loading * (1.1 if "Hujan" in str(weather) else 1.0)
            yield env.timeout(actual_loading / 60.0)
            
        avg_return = 25.29 * weather_factor
        yield env.timeout(avg_return / 60.0)
        
        avg_dump = 8.10
        yield env.timeout(avg_dump / 60.0)
        
        cycle_duration_hours = env.now - start_cycle_time
        global_metrics['total_cycle_time_hours'] += cycle_duration_hours
        
        global_metrics['total_tonase'] += load
        global_metrics['total_bbm_liter'] += (fuel * 1.6)
        global_metrics['total_probabilitas_delay'] += delay
        global_metrics['jumlah_siklus_selesai'] += 1

def calculate_shipment_risk(simulated_tonnage_8h, schedule_id, financial_params, sim_start_time, data):
    if data['schedules'].empty or schedule_id not in data['schedules'].index:
        return {"status": "NO_SHIP", "demurrage_cost": 0, "info": "Tidak ada jadwal", "days_to_complete": 0, "vessel_name": "N/A", "hours_needed": 0, "delay_risk_level": "NONE"}

    schedule = data['schedules'].loc[schedule_id]
    target = schedule.get('plannedQuantity', 0)
    current = schedule.get('actualQuantity', 0)
    if pd.isna(current): current = 0
    remaining_target = max(0, target - current)
    
    vessel_name = schedule['vesselId']
    if not data['vessels'].empty and schedule['vesselId'] in data['vessels'].index:
        vessel_name = data['vessels'].loc[schedule['vesselId']]['name']

    now = sim_start_time
    deadline = schedule['etsLoading']
    if deadline.tzinfo is None: deadline = deadline.tz_localize('UTC')
    if now.tzinfo is None: now = now.tz_localize('UTC')
    time_remaining_hours = (deadline - now).total_seconds() / 3600.0
    
    prod_per_hour_8h = simulated_tonnage_8h / 8.0
    daily_production_rate = prod_per_hour_8h * 16
    
    if daily_production_rate <= 0:
        hours_needed = 9999
        days_needed = 9999
    else:
        hours_needed = (remaining_target / daily_production_rate) * 24
        days_needed = hours_needed / 24.0
    
    if time_remaining_hours <= 0:
        hours_late = abs(time_remaining_hours)
        
        if hours_late > 720:
            return {
                "status": "NO_SHIP",
                "demurrage_cost": 0,
                "info": "Jadwal kapal sudah terlalu lama lewat (>30 hari)",
                "vessel_name": "N/A",
                "days_to_complete": 0,
                "hours_needed": 0,
                "delay_risk_level": "NONE"
            }
        
        late_penalty = financial_params.get('BiayaPenaltiKeterlambatanKapal', 100000000)
        additional_demurrage = hours_late * financial_params.get('BiayaDemurragePerJam', 5000000)
        
        return {
            "status": "LATE",
            "demurrage_cost": late_penalty + additional_demurrage,
            "info": f"Kapal {vessel_name} telat {hours_late:.1f} jam!",
            "vessel_name": vessel_name,
            "days_to_complete": days_needed,
            "hours_needed": hours_needed,
            "delay_risk_level": "CRITICAL"
        }

    prod_per_hour_8h = simulated_tonnage_8h / 8.0
    
    daily_production_rate = prod_per_hour_8h * 16
    
    if daily_production_rate <= 0:
        hours_needed = 9999
        days_needed = 9999
    else:
        hours_needed = (remaining_target / daily_production_rate) * 24
        days_needed = hours_needed / 24.0
   
    variance_hours = time_remaining_hours - hours_needed
    demurrage = 0
    status = "ON_SCHEDULE"
    delay_risk_level = "LOW"
    
    if variance_hours < 0:
        status = "DELAY_RISK"
        hours_short = abs(variance_hours)
        demurrage = hours_short * financial_params.get('BiayaDemurragePerJam', 5000000)
        
        if hours_short > 48:
            delay_risk_level = "CRITICAL"
        elif hours_short > 24:
            delay_risk_level = "HIGH"
        else:
            delay_risk_level = "MEDIUM"
    elif variance_hours < 24:
        delay_risk_level = "MEDIUM"
        status = "TIGHT_SCHEDULE"

    return {
        "vessel_name": vessel_name,
        "status": status,
        "demurrage_cost": demurrage,
        "hours_needed": hours_needed,
        "days_to_complete": days_needed,
        "delay_risk_level": delay_risk_level,
        "info": f"Selesai dalam {days_needed:.1f} Hari ({hours_needed:.1f} Jam)"
    }

def run_hybrid_simulation(skenario, financial_params, data, duration_hours=8):
    sim_start_str = skenario.get('simulation_start_date', pd.Timestamp.now(tz='UTC').isoformat())
    try:
        sim_start_time = pd.to_datetime(sim_start_str)
        if sim_start_time.tzinfo is None: sim_start_time = sim_start_time.tz_localize('UTC')
    except:
        sim_start_time = pd.Timestamp.now(tz='UTC')

    env = simpy.Environment()
    res = {'excavator': simpy.Resource(env, capacity=skenario.get('jumlah_excavator', 1))}
    metrics = {
        'total_tonase': 0, 'total_bbm_liter': 0, 
        'jumlah_siklus_selesai': 0, 'total_waktu_antri_jam': 0.0,
        'total_probabilitas_delay': 0.0,
        'total_cycle_time_hours': 0.0
    }
    
    trucks = data['trucks'].index.tolist()
    ops = data['operators'].index.tolist()
    if not trucks: return skenario 

    for i in range(skenario['alokasi_truk']):
        t_id = trucks[i % len(trucks)]
        o_id = ops[i % len(ops)]

        env.process(truck_process_hybrid(env, t_id, o_id, res, metrics, skenario, sim_start_time, data))
        
    env.run(until=duration_hours)
    
    p = financial_params
    rev = metrics['total_tonase'] * p['HargaJualBatuBara']
    cost = metrics['total_bbm_liter'] * p['HargaSolar']
    
    # FIX: Use operational queue cost (e.g. 100k/hr) instead of vessel penalty (100M)
    risk_antri = metrics['total_waktu_antri_jam'] * p.get('BiayaAntrianPerJam', 100000)
    
    # FIX: Use a smaller cost for operational delays, not major incidents
    risk_insiden = metrics['total_probabilitas_delay'] * p.get('BiayaRataRataInsiden', 500000) 
    
    schedule_id = skenario.get('target_schedule_id')
    ship_res = calculate_shipment_risk(metrics['total_tonase'], schedule_id, p, sim_start_time, data)
    biaya_demurrage = ship_res['demurrage_cost']
    
    profit = rev - cost - risk_antri - risk_insiden - biaya_demurrage
    
    result = skenario.copy()
    result.update(metrics)
    result.update({
        'Z_SCORE_PROFIT': profit,
        'total_biaya_risiko_antrian': risk_antri,
        'total_biaya_risiko_insiden': risk_insiden,
        'shipment_analysis': ship_res
    })
    return result

# --- 3. AGEN & HELPER ---

def get_operational_guidelines(weather, road_cond, total_trucks, total_excavators):
    guidelines = []
    if "Hujan" in str(weather): guidelines.append("⚠️ SLIPPERY: Batasi kecepatan 20 km/jam")
    if total_trucks/total_excavators > 5: guidelines.append("🔄 TRAFIK: Aktifkan Waiting Bay")
    return guidelines

def format_konteks_for_llm(top_3_list, data):
    formatted_data = []
    for i, res in enumerate(top_3_list, 1):
        r_id = res.get('target_road_id')
        e_id = res.get('target_excavator_id')
        
        try: r_name = f"{data['roads'].loc[r_id]['name']} ({data['roads'].loc[r_id]['distance']} km)"
        except: r_name = str(r_id)
        try: e_name = f"{data['excavators'].loc[e_id]['currentLocation']} (Unit: {data['excavators'].loc[e_id]['name']})"
        except: e_name = str(e_id)

        profit_fmt = format_currency(res.get('Z_SCORE_PROFIT', 0))
        ton = res.get('total_tonase', 0)
        bbm = res.get('total_bbm_liter', 0)
        fr_fmt = f"{(bbm/ton):.2f} L/Ton" if ton>0 else "0"
        
        avg_cycle_min = (res.get('total_cycle_time_hours', 0) / res.get('jumlah_siklus_selesai', 1)) * 60 if res.get('jumlah_siklus_selesai', 0) > 0 else 0
        
        sop = get_operational_guidelines(res.get('weatherCondition'), res.get('roadCondition'), res.get('alokasi_truk'), res.get('jumlah_excavator'))
        
        ship = res.get('shipment_analysis', {})
        ship_str = "Tidak ada kapal."
        estimasi_waktu = "N/A"
        delay_risk = "N/A"
        
        if ship.get('status') != "NO_SHIP":
            days = ship.get('days_to_complete', 0)
            estimasi_waktu = f"{days:.1f} Hari" if days < 999 else "Terlalu Lama"
            delay_risk = ship.get('delay_risk_level', 'N/A')
            
            status_map = {
                'ON_SCHEDULE': '✅ Tepat Waktu',
                'TIGHT_SCHEDULE': '⚠️ Ketat',
                'DELAY_RISK': '🔴 Risiko Delay',
                'LATE': '❌ Terlambat'
            }
            
            status_display = status_map.get(ship.get('status'), ship.get('status'))
            
            ship_str = f"Kapal: {ship.get('vessel_name')} | Status: {status_display}"
            ship_str += f" | Estimasi: {estimasi_waktu}"
            
            if ship.get('demurrage_cost', 0) > 0:
                ship_str += f" | Denda: {format_currency(ship.get('demurrage_cost'))}"

        formatted_data.append({
            f"OPSI_{i}": {
                "TYPE": "REKOMENDASI UTAMA" if i==1 else "ALTERNATIF",
                "INSTRUKSI_FLAT": {
                    "JUMLAH_DUMP_TRUCK": f"{res.get('alokasi_truk')} Unit",
                    "JUMLAH_EXCAVATOR": f"{res.get('jumlah_excavator')} Unit",
                    "ALAT_MUAT_TARGET": e_name,
                    "JALUR_ANGKUT": r_name
                },
                "KPI_PREDIKSI": {
                    "PROFIT": profit_fmt,
                    "PRODUKSI": f"{ton:,.0f} Ton",
                    "ESTIMASI_DURASI": estimasi_waktu,
                    "FUEL_RATIO": fr_fmt,
                    "IDLE_ANTRIAN": f"{res.get('total_waktu_antri_jam', 0):.1f} Jam",
                    "CYCLE_TIME_AVG": f"{avg_cycle_min:.1f} Min",
                    "DELAY_RISK": delay_risk
                },
                "ANALISIS_KAPAL": ship_str,
                "SOP_KESELAMATAN": " | ".join(sop)
            }
        })
    return json.dumps(formatted_data, indent=2)

def get_strategic_recommendations(fixed, vars, params):
    print(f"\n--- [Multi-Objective Optimization Engine] ---")
    
    data = load_fresh_data()
    
    user_weather = fixed.get('weatherCondition', 'Cerah')
    user_road_cond = fixed.get('roadCondition', 'GOOD')
    user_shift = fixed.get('shift', 'SHIFT_1')
    
    min_trucks = vars.get('min_trucks', 5)
    max_trucks = vars.get('max_trucks', 15)
    min_excavators = vars.get('min_excavators', 1)
    max_excavators = vars.get('max_excavators', 3)
    
    target_road = fixed.get('target_road_id')
    target_excavator = fixed.get('target_excavator_id')
    target_schedule = fixed.get('target_schedule_id')
    
    all_roads = data['roads'].index.tolist()
    all_excavators = data['excavators'].index.tolist()
    all_schedules = data['schedules'].index.tolist() if not data['schedules'].empty else [None]
    
    print(f"   > Database: {len(all_roads)} roads, {len(all_excavators)} excavators, {len(all_schedules)} schedules")
    print(f"   > Parameters: Weather={user_weather}, RoadCond={user_road_cond}")
    print(f"   > Decision Variables: Trucks [{min_trucks}-{max_trucks}], Excavators [{min_excavators}-{max_excavators}]")
    
    import random
    
    hash_seed = hash((user_weather, user_road_cond, min_trucks, max_trucks, min_excavators, max_excavators, target_road, target_excavator, str(pd.Timestamp.now())))
    random.seed(hash_seed)
    np.random.seed(abs(hash_seed) % (2**32))
    
    num_road_samples = min(30, len(all_roads))
    num_exc_samples = min(20, len(all_excavators))
    num_schedule_samples = min(10, len(all_schedules))
    
    sample_roads = random.sample(all_roads, num_road_samples)
    if target_road and target_road in all_roads and target_road not in sample_roads:
        sample_roads[0] = target_road
    
    sample_excavators = random.sample(all_excavators, num_exc_samples)
    if target_excavator and target_excavator in all_excavators and target_excavator not in sample_excavators:
        sample_excavators[0] = target_excavator
    
    sample_schedules = random.sample(all_schedules, num_schedule_samples)
    if target_schedule and target_schedule in all_schedules and target_schedule not in sample_schedules:
        sample_schedules[0] = target_schedule
    
    if all_schedules[0] is None or len(data['schedules']) == 0:
        sample_schedules = [None]
        print(f"   ⚠️ No valid vessel schedules available")
    
    truck_configs = list(range(min_trucks, max_trucks + 1, max(1, (max_trucks - min_trucks) // 4)))
    if max_trucks not in truck_configs:
        truck_configs.append(max_trucks)
    
    excavator_configs = list(range(min_excavators, max_excavators + 1))
    
    print(f"   > Sampling: {len(sample_roads)} roads, {len(sample_excavators)} excavators")
    print(f"   > Configurations: {len(truck_configs)} truck options, {len(excavator_configs)} excavator options")
    
    print(f"\n   🔬 Running ML-based simulations for multi-objective optimization...")
    
    results = []
    max_scenarios = 300
    scenario_count = 0
    
    for truck_count in truck_configs:
        for exc_count in excavator_configs:
            if scenario_count >= max_scenarios:
                break
            
            combinations_per_config = min(5, len(sample_roads), len(sample_excavators))
            
            for _ in range(combinations_per_config):
                road_id = random.choice(sample_roads)
                excavator_id = random.choice(sample_excavators)
                schedule_id = random.choice(sample_schedules)
                
                scenario = {
                    'weatherCondition': user_weather,
                    'roadCondition': user_road_cond,
                    'shift': user_shift,
                    'target_road_id': road_id,
                    'target_excavator_id': excavator_id,
                    'target_schedule_id': schedule_id,
                    'simulation_start_date': fixed.get('simulation_start_date'),
                    'alokasi_truk': truck_count,
                    'jumlah_excavator': exc_count
                }
                
                res = run_hybrid_simulation(scenario, params, data, duration_hours=8)
                
                road_data = data['roads'].loc[road_id]
                road_distance = road_data['distance']
                
                res['distance_km'] = road_distance
                res['fuel_per_ton'] = res['total_bbm_liter'] / res['total_tonase'] if res['total_tonase'] > 0 else 999
                res['cycle_time_hours'] = 8 / res['jumlah_siklus_selesai'] if res['jumlah_siklus_selesai'] > 0 else 999
                res['production_per_truck'] = res['total_tonase'] / truck_count if truck_count > 0 else 0
                
                results.append(res)
                scenario_count += 1
        
        if scenario_count >= max_scenarios:
            break
    
    print(f"   ✅ Generated {len(results)} scenarios via ML predictions")
    
    print(f"\n   📊 Applying Multi-Objective Ranking...")
    
    strategy_1_profit = sorted(results, key=lambda x: x['Z_SCORE_PROFIT'], reverse=True)[:20]
    
    strategy_2_speed = sorted(results, key=lambda x: x['cycle_time_hours'])[:20]
    
    strategy_3_distance = sorted(results, key=lambda x: x['distance_km'])[:20]
    
    def get_unique_strategy(pool, excluded_configs):
        for candidate in pool:
            config_key = (
                candidate['alokasi_truk'],
                candidate['jumlah_excavator'],
                candidate['target_road_id'],
                candidate['target_excavator_id']
            )
            if config_key not in excluded_configs:
                excluded_configs.add(config_key)
                return candidate
        return pool[0] if pool else None
    
    seen = set()
    
    best_profit = get_unique_strategy(strategy_1_profit, seen)
    best_speed = get_unique_strategy(strategy_2_speed, seen)
    best_distance = get_unique_strategy(strategy_3_distance, seen)
    
    final_strategies = [best_profit, best_speed, best_distance]
    final_strategies = [s for s in final_strategies if s is not None]
    
    print(f"   ✅ Selected 3 strategies with different objectives:")
    for i, strat in enumerate(final_strategies, 1):
        obj = "MAX PROFIT" if i == 1 else ("FASTEST CYCLE" if i == 2 else "SHORTEST ROUTE")
        print(f"      Strategy {i} ({obj}): Trucks={strat['alokasi_truk']}, Exc={strat['jumlah_excavator']}, "
              f"Distance={strat['distance_km']:.2f}km, Profit={format_currency(strat['Z_SCORE_PROFIT'])}, "
              f"CycleTime={strat['cycle_time_hours']:.2f}h")
    
    return final_strategies[:3]

def run_follow_up_chat(top_3, data):
    if not LLM_PROVIDER: return
    print("\n--- [Chatbot AI] Menganalisis... ---")
    context = format_konteks_for_llm(top_3, data)
    prompt = f"""
    PERAN: Kepala Teknik Tambang.
    DATA: {context}
    TUGAS: Analisis 3 strategi ini (Termasuk status Kapal/Demurrage).
    FORMAT WAJIB: Gunakan pemisah "---BATAS_OPSI---".
    """
    try:
        res = ollama.chat(model=OLLAMA_MODEL, messages=[{'role':'system', 'content':prompt}])
        print(f"\n{res['message']['content']}\n")
    except: pass

def run_follow_up_chat(top_3, data):
    if not LLM_PROVIDER: return
    print("\n--- [Chatbot AI] Menganalisis... ---")
    context = format_konteks_for_llm(top_3, data)
    prompt = f"""
    PERAN: Kepala Teknik Tambang.
    DATA: {context}
    TUGAS: Analisis 3 strategi ini (Termasuk status Kapal/Demurrage).
    FORMAT WAJIB: Gunakan pemisah "---BATAS_OPSI---".
    """
    try:
        res = ollama.chat(model=OLLAMA_MODEL, messages=[{'role':'system', 'content':prompt}])
        print(f"\n{res['message']['content']}\n")
    except: pass

if __name__ == "__main__":
    if LLM_PROVIDER:
        data = load_fresh_data()
        if not data['roads'].empty:
            sch_id = data['schedules'].index[0] if not data['schedules'].empty else None
            fixed = {
                'weatherCondition': 'Cerah', 'roadCondition': 'GOOD', 'shift': 'SHIFT_1',
                'target_road_id': data['roads'].index[0], 'target_excavator_id': data['excavators'].index[0],
                'target_schedule_id': sch_id,
                'simulation_start_date': pd.Timestamp.now().isoformat() 
            }
            vars = {'alokasi_truk': [5, 10], 'jumlah_excavator': [1, 2]}
            res = get_strategic_recommendations(fixed, vars, CONFIG['financial_params'])
            if res: run_follow_up_chat(res, data)