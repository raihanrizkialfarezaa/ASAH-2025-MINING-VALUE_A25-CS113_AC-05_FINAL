# PANDUAN RESTART & TESTING AI RECOMMENDATION

## PENYEBAB ERROR 500:

Backend Express masih running dengan kode lama (cached). File ai.service.js sudah diperbaiki tapi perlu restart server.

## LANGKAH RESTART:

### 1. Restart Backend Express (Terminal backend-express):

```powershell
# Stop server (Ctrl+C)
# Lalu jalankan lagi:
npm run dev
```

### 2. Pastikan Python AI Service Running (Terminal uvicorn):

```powershell
# Jika belum running:
cd "b:\ASAH FEBE AI\ASAH 2025 MINING VALUE_A25-CS113_AC-05\mining-ops-ai"
.\venv\Scripts\activate
uvicorn api:app --reload --port 8000
```

### 3. Frontend tetap running (tidak perlu restart)

## TESTING SETELAH RESTART:

### Test 1: Quick Health Check

```powershell
cd "b:\ASAH FEBE AI\ASAH 2025 MINING VALUE_A25-CS113_AC-05\backend-express"
node scripts/test-ai-integration.js
```

Hasil yang diharapkan:
✅ AI Service healthy
✅ Backend health check passed
✅ Realtime conditions retrieved (TIDAK ERROR LAGI)
✅ Recommendations received

### Test 2: Via Frontend

1. Buka browser: http://localhost:3000
2. Login dengan admin/password123
3. Navigate ke AI Recommendations page
4. Klik "Generate Recommendations"
5. Lihat 3 strategy muncul tanpa error

## PERBAIKAN YANG SUDAH DILAKUKAN:

### File: backend-express/src/services/ai.service.js

- Line 46-47: Truck status filter → `{ status: 'IDLE' }`
- Line 50-51: Excavator count → `{ status: { in: ['IDLE', 'ACTIVE'] } }`
- Line 55-56: Operational trucks → `{ status: { in: ['IDLE', 'STANDBY'] } }`
- Line 68-69: Operational excavators → `{ status: { in: ['IDLE', 'ACTIVE'] } }`

### File: mining-ops-ai/api.py

- Line 106-113: Added `/health` endpoint

### Konfirmasi:

- ✅ simulator.py sudah menggunakan database langsung (load_fresh_data)
- ✅ data_loader.py fetch dari PostgreSQL via fetch_dataframe()
- ✅ CSV hanya fallback

## JIKA MASIH ERROR SETELAH RESTART:

Check error di terminal Python AI service untuk detail error dari simulator.py
