# REMAINING TASKS GUIDE - SEARCH, FILTER, SORT & BAHASA INDONESIA

## STATUS: PARTIALLY COMPLETE - READY FOR FINAL TOUCHES

### ✅ COMPLETED SO FAR

1. **Database Schema** - All fields ready
2. **Calculation Utilities** - Backend & Frontend
3. **Production Page** - Dropdown with search, auto-calculation
4. **Dashboard** - Operational data preview
5. **Operator Salary** - CRUD ready, ML integration complete
6. **ML Simulator** - Operator cost calculation included
7. **Operator Salaries Updated** - 480 operators with realistic salaries (Rp 4.9M - Rp 10.2M)

---

## 🎯 PRIORITY 1: SEARCH, FILTER, SORT COMPONENTS

### Target Pages:

1. TruckList
2. ExcavatorList
3. OperatorList (already has salary)
4. ProductionList
5. HaulingActivityList
6. MaintenanceList
7. WeatherList
8. VesselList

### Implementation Pattern:

**Example for TruckList:**

```jsx
// Add state
const [searchTerm, setSearchTerm] = useState('');
const [filterStatus, setFilterStatus] = useState('ALL');
const [sortField, setSortField] = useState('code');
const [sortOrder, setSortOrder] = useState('asc');

// Filter & Sort logic
const filteredTrucks = trucks
  .filter((truck) => {
    const matchesSearch = truck.code.toLowerCase().includes(searchTerm.toLowerCase()) || truck.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || truck.status === filterStatus;
    return matchesSearch && matchesStatus;
  })
  .sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

// UI Component
<div className="mb-4 flex gap-4">
  <div className="flex-1">
    <div className="relative">
      <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
      <input type="text" placeholder="Cari kode atau model truck..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
    </div>
  </div>

  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg">
    <option value="ALL">Semua Status</option>
    <option value="OPERATIONAL">Operational</option>
    <option value="MAINTENANCE">Maintenance</option>
    <option value="BREAKDOWN">Breakdown</option>
  </select>

  <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="px-4 py-2 border rounded-lg">
    <option value="code">Kode</option>
    <option value="capacity">Kapasitas</option>
    <option value="fuelConsumption">Konsumsi BBM</option>
  </select>

  <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="px-4 py-2 border rounded-lg flex items-center gap-2">
    {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
  </button>
</div>;
```

### Quick Implementation Steps:

1. Copy pattern from ProductionList dropdown search
2. Add state variables for search, filter, sort
3. Apply filter/sort logic before mapping
4. Add UI controls above table
5. Test with existing data

---

## 🌏 PRIORITY 2: BAHASA INDONESIA TRANSLATION

### Translation Map:

**Common Terms:**

```javascript
const translations = {
  // Navigation
  Dashboard: 'Dasbor',
  Production: 'Produksi',
  Equipment: 'Peralatan',
  Operators: 'Operator',
  Maintenance: 'Pemeliharaan',
  Reports: 'Laporan',

  // Actions
  Add: 'Tambah',
  Edit: 'Ubah',
  Delete: 'Hapus',
  View: 'Lihat',
  Save: 'Simpan',
  Cancel: 'Batal',
  Search: 'Cari',
  Filter: 'Saring',
  Sort: 'Urutkan',
  Export: 'Ekspor',

  // Status
  OPERATIONAL: 'Beroperasi',
  MAINTENANCE: 'Pemeliharaan',
  BREAKDOWN: 'Rusak',
  ACTIVE: 'Aktif',
  INACTIVE: 'Tidak Aktif',

  // Fields
  Code: 'Kode',
  Name: 'Nama',
  Model: 'Model',
  Capacity: 'Kapasitas',
  Status: 'Status',
  Shift: 'Shift',
  Date: 'Tanggal',
  Target: 'Target',
  Actual: 'Aktual',
  Achievement: 'Pencapaian',

  // Shifts
  PAGI: 'Pagi',
  SIANG: 'Siang',
  MALAM: 'Malam',

  // Weather
  CERAH: 'Cerah',
  BERAWAN: 'Berawan',
  HUJAN_RINGAN: 'Hujan Ringan',
  HUJAN_SEDANG: 'Hujan Sedang',
  HUJAN_LEBAT: 'Hujan Lebat',
  KABUT: 'Kabut',
  BADAI: 'Badai',

  // Messages
  'Are you sure you want to delete this record?': 'Apakah Anda yakin ingin menghapus data ini?',
  'Record created successfully': 'Data berhasil dibuat',
  'Record updated successfully': 'Data berhasil diperbarui',
  'Record deleted successfully': 'Data berhasil dihapus',
  'Failed to save record': 'Gagal menyimpan data',
  'Loading...': 'Memuat...',
  'No data available': 'Tidak ada data',
};
```

### Implementation Strategy:

**Option 1: Direct Replacement (Quick)**

```jsx
// Before
<h1>Dashboard</h1>
<button>Add Production Record</button>

// After
<h1>Dasbor</h1>
<button>Tambah Catatan Produksi</button>
```

**Option 2: i18n Library (Professional)**

```bash
npm install react-i18next i18next
```

```jsx
// src/i18n/id.json
{
  "dashboard": "Dasbor",
  "addProductionRecord": "Tambah Catatan Produksi"
}

// Component
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();

<h1>{t('dashboard')}</h1>
<button>{t('addProductionRecord')}</button>
```

### Files to Translate:

1. All page components (`/src/pages/**/*.jsx`)
2. Navigation menu (`/src/components/Layout/Navbar.jsx`)
3. Forms and modals
4. Status badges
5. Error messages
6. Button labels

---

## 📊 PRIORITY 3: CHATBOT CONTEXT EXPANSION

**File:** `mining-ops-ai/chatbot.py`

### Current Schema Awareness:

- Basic table names
- Simple relationships

### Expand To Include:

```python
EXPANDED_SCHEMA = """
=== MINING OPERATIONS DATABASE ===

TABLES & RELATIONSHIPS:

1. TRUCKS (trucks)
   - id, code, model, plateNumber, capacity (tons)
   - fuelConsumption (L/km), averageSpeed (km/h)
   - status: OPERATIONAL, MAINTENANCE, BREAKDOWN
   - maintenanceCost (per hour)
   - Linked to: operators (driver), hauling_activities

2. EXCAVATORS (excavators)
   - id, code, model, serialNumber
   - productionRate (tons/min) - LOADING RATE
   - bucketCapacity (cubic meters)
   - status: OPERATIONAL, MAINTENANCE, BREAKDOWN
   - maintenanceCost (per hour)
   - Linked to: operators (operator), production_records

3. OPERATORS (operators)
   - id, employeeNumber, userId
   - licenseType, licenseNumber, licenseExpiry
   - shift: SHIFT_1, SHIFT_2, SHIFT_3
   - status: ACTIVE, INACTIVE
   - salary (IDR per month) - NEW FIELD
   - rating (1-5), totalHours
   - competency: {dump_truck, heavy_equipment, years_experience}
   - Linked to: users (user details)

4. PRODUCTION_RECORDS (production_records)
   - id, recordDate, shift, miningSiteId
   - targetProduction, actualProduction, achievement (%)
   - totalTrips, totalDistance (km), totalFuel (L)
   - avgCycleTime (minutes)
   - trucksOperating, trucksBreakdown
   - excavatorsOperating, excavatorsBreakdown
   - utilizationRate (%) - NEW FIELD
   - downtimeHours
   - avgCalori, avgAshContent, avgSulfur, avgMoisture
   - equipmentAllocation (JSON)
   - remarks

5. HAULING_ACTIVITIES (hauling_activities)
   - id, activityDate, shift, truckId, operatorId
   - loadingPointId, dumpingPointId, roadSegmentId
   - loadWeight (tons), tripNumber
   - loadingDuration, haulDuration, dumpingDuration, returnDuration (minutes)
   - totalDuration (minutes)
   - fuelUsed (L), distance (km)
   - remarks

CALCULATION FORMULAS:

Loading Time (min) = (Truck Capacity tons × 1000) / (Excavator Rate tons/min × 1000 / 60)
Travel Time (min) = (Distance km / Speed km/h) × 60
Cycle Time (min) = Loading + Hauling + Dumping + Return
Trips Required = CEILING(Target Tonnage / Truck Capacity)
Total Distance (km) = Trips × Distance × 2
Fuel Consumption (L) = Distance × Fuel Rate × Weather Factor × Load Factor

WEATHER IMPACT:
- CERAH: speed×1.0, fuel×1.0
- HUJAN_RINGAN: speed×0.85, fuel×1.15
- HUJAN_LEBAT: speed×0.60, fuel×1.30
- BADAI: speed×0.50, fuel×1.50

ROAD CONDITION IMPACT:
- EXCELLENT: ×1.0
- GOOD: ×0.95
- POOR: ×0.70
- CRITICAL: ×0.50

COST CALCULATIONS:
- Fuel Cost = Total Fuel (L) × Price per Liter
- Maintenance Cost = Equipment Count × Cost/Hour × Operating Hours
- Operator Cost = (Operator Count × Monthly Salary / 30 / 24) × Operating Hours
- Total Cost = Fuel + Maintenance + Operator + Queue + Risk + Demurrage

COMPLEX QUERY EXAMPLES:

Q: "Berapa total biaya operator bulan ini?"
A: SELECT SUM(salary) FROM operators WHERE status = 'ACTIVE'

Q: "Truck mana yang paling efisien bahan bakar?"
A: SELECT code, model, fuelConsumption
   FROM trucks
   WHERE status = 'OPERATIONAL'
   ORDER BY fuelConsumption ASC
   LIMIT 5

Q: "Rata-rata cycle time per shift?"
A: SELECT shift, AVG(avgCycleTime) as avg_cycle
   FROM production_records
   GROUP BY shift

Q: "Production achievement by mining site?"
A: SELECT ms.name, AVG(pr.achievement) as avg_achievement
   FROM production_records pr
   JOIN mining_sites ms ON pr.miningSiteId = ms.id
   GROUP BY ms.name
   ORDER BY avg_achievement DESC
"""
```

### Add to chatbot.py:

```python
def generate_sql_with_context(query: str) -> str:
    prompt = f"""
{EXPANDED_SCHEMA}

User Question: {query}

Generate SQL query considering:
1. Use proper table names and column names from schema
2. Include JOINs for related tables
3. Apply appropriate aggregations (SUM, AVG, COUNT)
4. Consider date ranges and filters
5. Return readable column aliases
6. Format for PostgreSQL syntax

SQL Query:
"""
    return generate_with_ollama(prompt)
```

---

## 🚀 IMPLEMENTATION PRIORITY ORDER

### Week 1: Search, Filter, Sort

**Estimated Time:** 8-12 hours
**Impact:** High - Immediate UX improvement

Steps:

1. Start with TruckList (template)
2. Copy pattern to ExcavatorList
3. Apply to OperatorList
4. Extend to ProductionList
5. Add to HaulingActivityList
6. Complete remaining pages

### Week 2: Bahasa Indonesia

**Estimated Time:** 6-10 hours
**Impact:** High - User accessibility

Steps:

1. Create translation object (id.js)
2. Replace navigation labels
3. Update page titles
4. Translate form fields
5. Convert status enums
6. Update messages & alerts

### Week 3: Chatbot Enhancement

**Estimated Time:** 4-6 hours
**Impact:** Medium - Advanced users

Steps:

1. Update schema documentation
2. Add calculation formulas
3. Include complex query examples
4. Test with realistic questions
5. Refine prompt engineering

---

## 📋 CHECKLIST

### Search, Filter, Sort

- [ ] TruckList: Search by code/model, filter by status, sort by capacity
- [ ] ExcavatorList: Search by code/model, filter by status, sort by production rate
- [ ] OperatorList: Search by employee number/name, filter by shift, sort by salary
- [ ] ProductionList: Search by site, filter by shift, sort by date
- [ ] HaulingActivityList: Search by truck, filter by date, sort by duration
- [ ] MaintenanceList: Search by equipment, filter by status, sort by date
- [ ] WeatherList: Search by date, filter by condition
- [ ] VesselList: Search by name, filter by status, sort by capacity

### Bahasa Indonesia

- [ ] Navigation menu labels
- [ ] Page titles (Dashboard → Dasbor, etc.)
- [ ] Button labels (Add → Tambah, Edit → Ubah, Delete → Hapus)
- [ ] Form field labels
- [ ] Status enum display (OPERATIONAL → Beroperasi)
- [ ] Shift names (PAGI → Pagi, SIANG → Siang)
- [ ] Weather conditions
- [ ] Road conditions
- [ ] Alert messages
- [ ] Confirmation dialogs

### Chatbot Context

- [ ] Update schema documentation
- [ ] Add calculation formulas
- [ ] Include weather/road impact factors
- [ ] Add cost calculation formulas
- [ ] Include complex query examples
- [ ] Test with production questions
- [ ] Refine responses for technical queries

---

## 💡 QUICK WINS

### Immediate Improvements (< 2 hours):

1. Add search to TruckList (copy from ProductionList dropdown pattern)
2. Translate dashboard page title and stats
3. Add operator count to chatbot schema

### High Impact (< 4 hours):

1. Complete search/filter for all equipment pages
2. Translate all navigation labels
3. Update chatbot with calculation formulas

### Professional Polish (< 8 hours):

1. Implement i18n library for translations
2. Add export to CSV functionality
3. Create advanced chatbot query templates

---

## 🎯 COMPLETION CRITERIA

### Minimum Viable Product (MVP):

✅ Database schema complete
✅ Calculations working
✅ Auto-calculation functioning
✅ Operator salary integrated
✅ ML simulator with operator costs
✅ Dashboard preview working

### Production Ready:

- [ ] All pages have search functionality
- [ ] All pages have filter options
- [ ] All pages have sort capability
- [ ] Full Bahasa Indonesia translation
- [ ] Chatbot handles complex queries
- [ ] No console errors
- [ ] Realistic seed data (operator salaries DONE)

### Excellence:

- [ ] i18n library integration
- [ ] Export to Excel/PDF
- [ ] Cost reports with breakdown
- [ ] Historical trend analysis
- [ ] Performance optimization

---

## 📞 SUPPORT RESOURCES

### Code Templates:

- Search component: See `ProductionList.jsx` lines 40-45
- Filter dropdown: See `ProductionList.jsx` lines 470-490
- Sort functionality: Use native `.sort()` on filtered array

### Translation Tools:

- Google Translate API (for bulk translation)
- Manual translation file (more accurate)
- Community review (if applicable)

### Testing Checklist:

- [ ] Search returns correct results
- [ ] Filter applies correctly
- [ ] Sort order is correct
- [ ] Pagination works with filters
- [ ] Bahasa Indonesia displays correctly
- [ ] No encoding issues (UTF-8)
- [ ] Chatbot SQL is valid
- [ ] All calculations accurate

---

**CURRENT STATUS:** Core functionality complete, polish phase ready to begin.
**NEXT ACTION:** Implement search/filter/sort pattern on TruckList as template.
