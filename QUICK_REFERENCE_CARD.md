# ⚡ QUICK REFERENCE CARD - PRODUCTION FLOW CALCULATIONS

## 🎯 CORE FORMULAS

### Loading Time

```
Loading Time (minutes) = (Truck Capacity tons × 1000) / (Excavator Rate tons/min × 1000 / 60)

Example:
Truck: 50 tons
Excavator: 5 tons/min
Result: (50 × 1000) / (5 × 1000 / 60) = 6 minutes
```

### Travel Time

```
Travel Time (minutes) = (Distance km / Speed km/h) × 60

Example:
Distance: 10 km
Speed: 30 km/h
Result: (10 / 30) × 60 = 20 minutes
```

### Cycle Time

```
Cycle Time = Loading + Hauling + Dumping + Return

All travel segments affected by:
- Weather Factor (0.50 - 1.0)
- Road Condition Factor (0.50 - 1.0)
```

### Trips Required

```
Trips = CEILING(Target Tonnage / Truck Capacity)

Example:
Target: 500 tons
Truck: 50 tons
Result: CEILING(500/50) = 10 trips
```

### Fuel Consumption

```
Fuel (L) = Distance × Fuel Rate × Weather Factor × Load Factor

Load Factor: 1.3 (loaded trucks consume 30% more)
Weather Factor: 1.0 - 1.5 based on risk level
```

---

## 🌤️ WEATHER FACTORS

### Speed Impact

```
CERAH:          1.00 (no impact)
BERAWAN:        0.95 (5% slower)
HUJAN_RINGAN:   0.85 (15% slower)
HUJAN_SEDANG:   0.75 (25% slower)
HUJAN_LEBAT:    0.60 (40% slower)
KABUT:          0.80 (20% slower)
BADAI:          0.50 (50% slower)
```

### Fuel Impact (Risk Level)

```
LOW:      1.00 (normal)
MEDIUM:   1.15 (15% increase)
HIGH:     1.30 (30% increase)
CRITICAL: 1.50 (50% increase)
```

---

## 🛣️ ROAD CONDITION FACTORS

```
EXCELLENT: 1.00 (optimal speed)
GOOD:      0.95 (5% slower)
FAIR:      0.85 (15% slower)
POOR:      0.70 (30% slower)
CRITICAL:  0.50 (50% slower)
```

---

## 💰 COST CALCULATIONS

### Fuel Cost

```
Fuel Cost = Total Fuel (L) × Price per Liter

Default Price: Rp 15,000/L
```

### Maintenance Cost

```
Maintenance Cost = Equipment Count × Cost/Hour × Operating Hours

Typical Rate: Rp 50,000/hour per equipment
```

### Operator Cost

```
Operator Cost = (Count × Monthly Salary / 30 / 24) × Operating Hours

Average Salary: Rp 7,390,880/month
Operator Count = Trucks + Excavators
```

### Total Cost

```
Total = Fuel + Maintenance + Operator + Queue + Risk + Demurrage
```

### Net Profit

```
Net Profit = (Tonnage × Coal Price) - Total Cost

Default Coal Price: Rp 800,000/ton
```

---

## 📱 PRODUCTION PAGE USAGE

### Creating Record with Auto-Calc

**Step 1: Basic Info**

- Date, Shift, Mining Site

**Step 2: Operational Parameters**

- Target Production (tons)
- Haul Distance (km)
- Weather Condition
- Road Condition
- Risk Level

**Step 3: Equipment Selection**

- Click Truck dropdown → Search → Select
- Click Excavator dropdown → Search → Select

**Step 4: Auto-Calculation**
✅ Total Trips (auto)
✅ Total Distance (auto)
✅ Total Fuel (auto)
✅ Avg Cycle Time (auto)

**Step 5: Actual Data**

- Enter Actual Production
- Enter Utilization Rate (optional)
- Add Remarks

**Step 6: Save**

- Click "Create"

---

## 📊 DASHBOARD FEATURES

### Operational Preview

**Button:** "Tampilkan Preview Data Operasional"

**Tables:**

1. **Trucks** - Code, Model, Capacity, Status
2. **Excavators** - Code, Model, Rate, Status
3. **Operators** - Number, Name, Shift, **Salary**
4. **Production** - Date, Site, Target, Actual

**Stats:**

- Active Trucks
- Active Excavators
- Total Hauling
- Today's Production

---

## 🤖 ML SIMULATOR - OPERATOR COSTS

### How It Works

```
1. Counts equipment: Trucks + Excavators
2. Determines operator count = equipment count
3. Gets average salary from database (or default)
4. Calculates hourly cost:
   (Monthly Salary / 30 days / 24 hours) × Operator Count
5. Multiplies by operation duration
6. Includes in total cost
7. Adjusts profit calculation
```

### Example

```
Scenario:
- 5 Trucks
- 2 Excavators
- 8 Hour Operation
- Avg Salary: Rp 7,390,880

Calculation:
- Operators: 5 + 2 = 7
- Hourly: (7,390,880 / 30 / 24) × 7 = Rp 715,500
- Total: 715,500 × 8 = Rp 5,724,000

Result: Included in financial breakdown
```

---

## 🔧 OPERATOR SALARY INFO

### Current Statistics

```
Total Operators: 480
Coverage: 100% (all have salary)
Average: Rp 7,390,880/month
Minimum: Rp 4,972,237
Maximum: Rp 10,187,162
```

### Salary Factors

```
Base: Shift level (SHIFT_1/2/3)
Multiplier 1: Experience years × 3%
Multiplier 2: Rating (above 3.0) × 5%

Formula:
Base × (1 + exp×0.03) × (1 + (rating-3)×0.05)
```

### Shift Base Ranges

```
SHIFT_1 (Pagi):  Rp 4,500,000 - 6,500,000
SHIFT_2 (Siang): Rp 5,000,000 - 7,000,000
SHIFT_3 (Malam): Rp 5,500,000 - 7,500,000
```

---

## ⚙️ DATABASE FIELDS REFERENCE

### Operator

```sql
id, userId, employeeNumber
licenseNumber, licenseType, licenseExpiry
competency (JSON: dump_truck, heavy_equipment, years_experience)
status (ACTIVE, INACTIVE)
shift (SHIFT_1, SHIFT_2, SHIFT_3)
totalHours, rating
salary ✨ NEW - Monthly salary in IDR
joinDate, resignDate
```

### ProductionRecord

```sql
id, recordDate, shift, miningSiteId
targetProduction, actualProduction, achievement
totalTrips, totalDistance, totalFuel
avgCycleTime
trucksOperating, trucksBreakdown
excavatorsOperating, excavatorsBreakdown
utilizationRate ✨ NEW - Equipment utilization %
downtimeHours
avgCalori, avgAshContent, avgSulfur, avgMoisture
equipmentAllocation (JSON)
remarks
```

---

## 🎯 TYPICAL SCENARIOS

### Scenario 1: Clear Weather, Good Road

```
Input:
- Target: 500 tons
- Distance: 10 km
- Trucks: 5 × 50 tons capacity
- Excavators: 2 × 5 tons/min
- Weather: CERAH (1.0)
- Road: GOOD (0.95)
- Risk: LOW (1.0)

Results:
- Trips: 10 (per truck)
- Cycle Time: ~46 minutes
- Total Distance: 1,000 km
- Fuel: ~1,300 L
- Operator Cost: ~Rp 5.7M (for 8 hours)
```

### Scenario 2: Heavy Rain, Poor Road

```
Input:
- Target: 500 tons
- Distance: 10 km
- Trucks: 5 × 50 tons capacity
- Excavators: 2 × 5 tons/min
- Weather: HUJAN_LEBAT (0.60)
- Road: POOR (0.70)
- Risk: HIGH (1.30)

Results:
- Trips: 10 (per truck)
- Cycle Time: ~75 minutes (63% slower)
- Total Distance: 1,000 km
- Fuel: ~1,690 L (30% more)
- Operator Cost: ~Rp 9.2M (longer operation)
```

---

## 🆘 TROUBLESHOOTING

### Auto-Calculation Not Working

```
Check:
✅ Target Production entered?
✅ Haul Distance entered?
✅ At least 1 truck selected?
✅ At least 1 excavator selected?
✅ Wait 500ms after input change (debounce)
```

### Operator Salary Not Showing

```
Solutions:
✅ Refresh dashboard
✅ Check database connection
✅ Run: node scripts/verify-salary-field.js
✅ Verify operators have salary > 0
```

### ML Recommendations Inaccurate

```
Check:
✅ Equipment selected matches simulation
✅ Weather/road conditions set correctly
✅ Operator salaries loaded from database
✅ System configs (COAL_PRICE_IDR, FUEL_PRICE_IDR)
```

---

## 📞 QUICK SCRIPTS

### Verify Database Fields

```bash
cd backend-express
node scripts/verify-salary-field.js
```

### Update Operator Salaries

```bash
cd backend-express
node scripts/update-operator-salaries.js
```

### Comprehensive System Check

```bash
cd backend-express
node scripts/comprehensive-verification.js
```

---

## 📚 DOCUMENTATION

**Main Docs:**

- `FINAL_SUCCESS_REPORT.md` - Complete implementation details
- `COMPREHENSIVE_IMPLEMENTATION_SUMMARY.md` - Technical specifications
- `REMAINING_TASKS_GUIDE.md` - Future enhancements

**Code References:**

- Backend Calculations: `backend-express/src/utils/productionCalculations.js`
- Frontend Calculations: `mining-ops-frontend/src/utils/productionCalculations.js`
- Production Page: `mining-ops-frontend/src/pages/production/ProductionList.jsx`
- Dashboard: `mining-ops-frontend/src/pages/Dashboard.jsx`
- ML Simulator: `mining-ops-ai/simulator.py`

---

**Version:** 1.0
**Last Updated:** 2 Desember 2025
**Status:** ✅ Production Ready
