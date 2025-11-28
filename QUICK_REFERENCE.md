# 🚀 QUICK REFERENCE - AI Recommendation System

## ⚡ Quick Start (30 seconds)

### Test via API

```bash
curl -X POST http://localhost:8000/get_top_3_strategies \
  -H "Content-Type: application/json" \
  -d '{
    "fixed_conditions": {
      "weatherCondition": "Cerah",
      "roadCondition": "GOOD",
      "shift": "SHIFT_1"
    },
    "decision_variables": {
      "min_trucks": 5,
      "max_trucks": 15,
      "min_excavators": 1,
      "max_excavators": 3
    }
  }'
```

### Test via Frontend

```
1. Open http://localhost:3001
2. Go to AI Recommendations
3. Click "Get Recommendations"
4. Wait 30s
5. See 3 different strategies!
```

---

## 📋 Checklist Sebelum Deploy

### Services Running?

```powershell
# Check Python AI service (port 8000)
curl http://localhost:8000/health

# Check Node backend (port 3000)
curl http://localhost:3000/api/health

# Check React frontend (port 3001)
curl http://localhost:3001
```

### ML Models Loaded?

```bash
# Check startup logs
# Should see: "✅ Loaded 6 ML models: fuel, fuel_real, load_weight, tonase, delay_probability, risiko"
```

### Database Connected?

```bash
# Check Prisma connection
cd backend-express
npx prisma studio
```

---

## 🎯 3 Strategies Explained

| Strategy       | Objective         | Best For                          | Trade-off        |
| -------------- | ----------------- | --------------------------------- | ---------------- |
| **Strategy 1** | Max Profit 💰     | Revenue targets, high demand      | May be slower    |
| **Strategy 2** | Fastest ⚡        | Tight deadlines, vessel schedules | Lower profit     |
| **Strategy 3** | Fuel Efficient 🛢️ | Cost reduction, sustainability    | Lower production |

---

## 🔧 Common Parameters

### Weather Conditions

- `Cerah` - Optimal (baseline)
- `Hujan Ringan` - 20-30% impact
- `Hujan Lebat` - 70%+ impact

### Road Conditions

- `GOOD` - Best performance
- `FAIR` - Moderate
- `POOR` / `LICIN` - Significant delays

### Decision Variables

- **Trucks:** 5-100 (recommended: 5-15 for fast results)
- **Excavators:** 1-20 (recommended: 1-3 for fast results)

---

## 📊 What Changed (Summary)

### Before

```json
{
  "alokasi_truk": [5, 10, 15], // ❌ Confusing
  "jumlah_excavator": [1, 2] // ❌ Confusing
}
```

### After

```json
{
  "min_trucks": 5, // ✅ Intuitive
  "max_trucks": 15, // ✅ Intuitive
  "min_excavators": 1, // ✅ Intuitive
  "max_excavators": 3 // ✅ Intuitive
}
```

---

## 🐛 Quick Fixes

### Problem: All 3 strategies identical

**Fix:** Restart Python service (reload simulator.py)

```bash
# Stop service
Ctrl+C

# Restart
cd mining-ops-ai
uvicorn api:app --reload --port 8000
```

### Problem: Timeout after 60s

**Fix:** Reduce exploration range

```json
{
  "min_trucks": 5,
  "max_trucks": 10, // ← Reduced from 15
  "min_excavators": 1,
  "max_excavators": 2 // ← Reduced from 3
}
```

### Problem: Missing metrics (cycle_time, distance)

**Fix:** Check ML models loaded

```bash
# Should see 6 models in startup logs
grep "Loaded 6 ML models" logs/simulator.log
```

---

## 📁 Key Files

```
mining-ops-ai/
├── simulator.py           ← Core multi-objective algorithm
├── api.py                 ← FastAPI endpoints
└── models/                ← 6 ML models (XGBoost)
    ├── model_fuel.joblib
    ├── model_fuel_real.joblib
    ├── model_load_weight.joblib
    ├── model_tonase.joblib
    ├── model_delay_probability.joblib
    └── model_risiko.joblib

backend-express/src/
├── controllers/ai.controller.js   ← Request handler
└── services/ai.service.js         ← API client

mining-ops-frontend/src/components/AI/
└── ParameterForm.jsx              ← UI form
```

---

## 🧪 Testing

### Validate Multi-Objective

```bash
cd mining-ops-ai
python test_api_multi_objective.py
```

**Expected:**

```
✅ Received 3 strategies
✅ Different configurations
✅ Different KPI values
```

### Validate Integration

```bash
cd backend-express
node scripts/test-multi-objective.js
```

---

## 📖 Documentation

1. **README_SISTEM_REKOMENDASI.md** - User guide (Bahasa Indonesia)
2. **MULTI_OBJECTIVE_IMPLEMENTATION_SUMMARY.md** - Technical deep-dive
3. **MULTI_OBJECTIVE_VALIDATION.md** - Validation procedures
4. **QUICK_REFERENCE.md** - This file

---

## 🎯 Success Criteria

✅ **All 6 ML models loaded**  
✅ **3 different strategies returned**  
✅ **Trade-offs visible** (profit vs speed vs distance)  
✅ **Weather impact working** (71% drop in Hujan Lebat)  
✅ **UI intuitive** (min/max instead of arrays)

---

## 📞 Need Help?

**Check Health:**

```bash
curl http://localhost:8000/health
```

**Check Logs:**

```bash
tail -f mining-ops-ai/logs/simulator.log
tail -f backend-express/logs/app.log
```

**Restart All:**

```bash
# Stop all services (Ctrl+C each)
# Then:
START_ALL_SERVICES.bat
```

---

**Status:** ✅ **PRODUCTION READY**  
**Version:** 3.1.0  
**Last Updated:** 2024

🚀 **Happy Mining!** ⛏️
