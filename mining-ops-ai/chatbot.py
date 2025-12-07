import ollama
import pandas as pd
from database import fetch_dataframe
import json
import os
import re
import math
from datetime import datetime, timedelta
from functools import lru_cache
import hashlib
import time

MODEL_NAME = "qwen2.5:7b"

QUERY_CACHE = {}
CACHE_TTL = 60

def get_cached_result(cache_key):
    if cache_key in QUERY_CACHE:
        cached_data, timestamp = QUERY_CACHE[cache_key]
        if time.time() - timestamp < CACHE_TTL:
            return cached_data
        else:
            del QUERY_CACHE[cache_key]
    return None

def set_cached_result(cache_key, data):
    QUERY_CACHE[cache_key] = (data, time.time())

def get_cache_key(query):
    return hashlib.md5(query.encode()).hexdigest()

# ============================================================================
# MINING OPERATIONS KNOWLEDGE BASE
# Real operational parameters based on database statistics
# ============================================================================

MINING_KNOWLEDGE = {
    # Fleet Statistics (from database)
    "fleet": {
        "total_trucks": 601,
        "avg_truck_capacity": 29.33,  # tons
        "max_truck_capacity": 39.0,   # tons
        "min_truck_capacity": 20.0,   # tons
        "total_excavators": 603,
        "avg_bucket_capacity": 10.63,  # cubic meters
        "avg_excavator_production_rate": 5.0,  # tons/min
        "avg_excavator_fuel_consumption": 50.0,  # L/hour
    },
    
    # Hauling Performance Metrics (from database)
    "hauling": {
        "avg_load_weight": 24.13,      # tons per trip
        "avg_distance": 3.87,          # km one way
        "avg_cycle_time": 65.0,        # minutes (full cycle)
        "avg_queue_time": 10.0,        # minutes
        "avg_loading_time": 12.0,      # minutes
        "avg_hauling_time": 18.0,      # minutes (one way)
        "avg_dumping_time": 8.0,       # minutes
        "avg_return_time": 17.0,       # minutes
        "load_efficiency": 0.82,       # 82% of capacity utilized
    },
    
    # Production Metrics (from database)
    "production": {
        "avg_daily_target": 10060,     # tons per day
        "avg_daily_actual": 8993,      # tons per day
        "avg_achievement": 89.5,       # percentage
        "avg_trucks_operating": 10,    # per shift
        "avg_excavators_operating": 8, # per shift
        "avg_utilization_rate": 76.0,  # percentage
    },
    
    # Cost Parameters (industry standard)
    "costs": {
        "fuel_price_per_liter": 15000,   # IDR (solar/diesel)
        "truck_fuel_consumption": 0.8,    # L/km
        "operator_cost_per_hour": 150000, # IDR
        "maintenance_cost_per_hour": 50000, # IDR per truck
        "overhead_cost_per_hour": 100000,  # IDR
    },
    
    # Revenue Parameters (industry standard)
    "revenue": {
        "coal_price_per_ton": 1500000,   # IDR (base price ~$90/ton)
        "premium_coal_price": 1800000,   # IDR (high calorie)
        "low_grade_coal_price": 1200000, # IDR (low calorie)
        "avg_calorie": 5200,             # kcal/kg (GAR)
    },
    
    # Operational Constraints
    "constraints": {
        "max_trucks_per_excavator": 6,
        "shift_duration_hours": 8,
        "shifts_per_day": 3,
        "max_operating_hours_per_day": 22,  # accounting for shift changes
        "weather_impact_factor": 0.85,  # 15% reduction in rainy season
    }
}

def get_operational_stats():
    """Fetch real-time operational statistics from database"""
    stats = {}
    
    try:
        # Get truck availability
        truck_df = fetch_dataframe("""
            SELECT status, COUNT(*) as count 
            FROM trucks 
            WHERE "isActive" = true 
            GROUP BY status
        """)
        stats['truck_status'] = truck_df.to_dict('records') if not truck_df.empty else []
        
        # Get excavator availability  
        exc_df = fetch_dataframe("""
            SELECT status, COUNT(*) as count 
            FROM excavators 
            WHERE "isActive" = true 
            GROUP BY status
        """)
        stats['excavator_status'] = exc_df.to_dict('records') if not exc_df.empty else []
        
        # Get recent production performance
        prod_df = fetch_dataframe("""
            SELECT AVG("actualProduction") as avg_production,
                   AVG(achievement) as avg_achievement
            FROM production_records
            WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days'
        """)
        if not prod_df.empty:
            stats['recent_avg_production'] = float(prod_df['avg_production'].iloc[0] or MINING_KNOWLEDGE['production']['avg_daily_actual'])
            stats['recent_achievement'] = float(prod_df['avg_achievement'].iloc[0] or MINING_KNOWLEDGE['production']['avg_achievement'])
        
        # Get average cycle time from recent hauling
        cycle_df = fetch_dataframe("""
            SELECT AVG("totalCycleTime") as avg_cycle,
                   AVG("loadWeight") as avg_load
            FROM hauling_activities
            WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days'
            AND "totalCycleTime" > 0
        """)
        if not cycle_df.empty:
            stats['recent_avg_cycle_time'] = float(cycle_df['avg_cycle'].iloc[0] or MINING_KNOWLEDGE['hauling']['avg_cycle_time'])
            stats['recent_avg_load'] = float(cycle_df['avg_load'].iloc[0] or MINING_KNOWLEDGE['hauling']['avg_load_weight'])
            
    except Exception as e:
        print(f"Warning: Could not fetch real-time stats: {e}")
        
    return stats

def calculate_production_simulation(num_trucks, target_tons, distance_km=None, truck_capacity=None):
    """
    Calculate production simulation based on truck allocation
    Returns estimated time, trips, fuel, and costs
    """
    # Use defaults if not provided
    if distance_km is None:
        distance_km = MINING_KNOWLEDGE['hauling']['avg_distance']
    if truck_capacity is None:
        truck_capacity = MINING_KNOWLEDGE['fleet']['avg_truck_capacity']
    
    # Load per trip (accounting for efficiency)
    load_per_trip = truck_capacity * MINING_KNOWLEDGE['hauling']['load_efficiency']
    
    # Cycle time calculation (in minutes)
    base_cycle = MINING_KNOWLEDGE['hauling']['avg_cycle_time']
    # Adjust for distance (proportional)
    distance_factor = distance_km / MINING_KNOWLEDGE['hauling']['avg_distance']
    adjusted_cycle = base_cycle * (0.5 + 0.5 * distance_factor)  # 50% fixed, 50% distance-variable
    
    # Trips needed
    total_trips = math.ceil(target_tons / load_per_trip)
    trips_per_truck = math.ceil(total_trips / num_trucks)
    
    # Time calculation
    total_time_minutes = trips_per_truck * adjusted_cycle
    total_time_hours = total_time_minutes / 60
    
    # Actual production (accounting for 82% efficiency)
    actual_production = total_trips * load_per_trip
    
    # Fuel calculation
    total_distance = total_trips * distance_km * 2  # round trip
    fuel_consumed = total_distance * MINING_KNOWLEDGE['costs']['truck_fuel_consumption']
    
    # Cost calculation
    fuel_cost = fuel_consumed * MINING_KNOWLEDGE['costs']['fuel_price_per_liter']
    operator_cost = num_trucks * total_time_hours * MINING_KNOWLEDGE['costs']['operator_cost_per_hour']
    maintenance_cost = num_trucks * total_time_hours * MINING_KNOWLEDGE['costs']['maintenance_cost_per_hour']
    overhead_cost = total_time_hours * MINING_KNOWLEDGE['costs']['overhead_cost_per_hour']
    total_cost = fuel_cost + operator_cost + maintenance_cost + overhead_cost
    
    # Revenue calculation
    revenue = actual_production * MINING_KNOWLEDGE['revenue']['coal_price_per_ton']
    
    # Profit
    profit = revenue - total_cost
    profit_margin = (profit / revenue * 100) if revenue > 0 else 0
    
    return {
        "input": {
            "num_trucks": num_trucks,
            "target_tons": target_tons,
            "distance_km": distance_km,
            "truck_capacity": truck_capacity
        },
        "production": {
            "total_trips": total_trips,
            "trips_per_truck": trips_per_truck,
            "load_per_trip": round(load_per_trip, 2),
            "actual_production": round(actual_production, 2),
            "efficiency": round(actual_production / target_tons * 100, 1)
        },
        "time": {
            "cycle_time_minutes": round(adjusted_cycle, 1),
            "total_time_minutes": round(total_time_minutes, 1),
            "total_time_hours": round(total_time_hours, 2),
            "shifts_needed": math.ceil(total_time_hours / 8)
        },
        "resources": {
            "total_distance_km": round(total_distance, 2),
            "fuel_consumed_liters": round(fuel_consumed, 2)
        },
        "financials": {
            "fuel_cost": round(fuel_cost),
            "operator_cost": round(operator_cost),
            "maintenance_cost": round(maintenance_cost),
            "overhead_cost": round(overhead_cost),
            "total_cost": round(total_cost),
            "revenue": round(revenue),
            "profit": round(profit),
            "profit_margin_percent": round(profit_margin, 1)
        }
    }

def detect_question_type(question):
    """
    Detect what type of question is being asked
    Returns: 'simulation', 'query', 'analysis', 'general'
    """
    question_lower = question.lower()
    
    # Simulation patterns
    simulation_keywords = [
        'jika', 'bila', 'kalau', 'seandainya', 'misalkan', 'simulasi',
        'kira-kira', 'estimasi', 'perkirakan', 'prediksi',
        'alokasi', 'alokasikan', 'target', 'berapa lama', 'butuh waktu',
        'keuntungan', 'profit', 'biaya', 'cost',
        'optimal', 'efisien', 'terbaik', 'rekomendasi'
    ]
    
    # Analysis patterns
    analysis_keywords = [
        'bandingkan', 'compare', 'tren', 'trend', 'analisis', 'analysis',
        'performa', 'performance', 'produktivitas', 'efisiensi',
        'rata-rata', 'average', 'total', 'ringkasan', 'summary'
    ]
    
    # Check for simulation
    if any(kw in question_lower for kw in simulation_keywords):
        # Additional check for numbers/targets
        if re.search(r'\d+\s*(ton|truk|truck|unit|jam|hour)', question_lower):
            return 'simulation'
    
    # Check for analysis
    if any(kw in question_lower for kw in analysis_keywords):
        return 'analysis'
    
    # Default to database query
    return 'query'

def parse_simulation_parameters(question):
    """
    Extract simulation parameters from natural language question
    """
    params = {}
    question_lower = question.lower()
    
    # Extract number of trucks
    truck_patterns = [
        r'(\d+)\s*(?:unit\s*)?(?:truk|truck)',
        r'(?:truk|truck)\s*(\d+)',
        r'(\d+)\s*(?:unit)',
        r'(?:alokasi|pakai|gunakan)\s*(\d+)'
    ]
    for pattern in truck_patterns:
        match = re.search(pattern, question_lower)
        if match:
            params['num_trucks'] = int(match.group(1))
            break
    
    # Extract truck codes (A-F style)
    truck_code_match = re.search(r'truk\s*([A-Za-z])\s*(?:-|sampai|hingga|to)\s*([A-Za-z])', question_lower)
    if truck_code_match:
        start = ord(truck_code_match.group(1).upper())
        end = ord(truck_code_match.group(2).upper())
        params['num_trucks'] = end - start + 1
        params['truck_codes'] = f"{truck_code_match.group(1).upper()}-{truck_code_match.group(2).upper()}"
    
    # Extract target production
    target_patterns = [
        r'target\s*(?:produksi\s*)?(\d+(?:[.,]\d+)?)\s*(?:ton)',
        r'(\d+(?:[.,]\d+)?)\s*ton',
        r'produksi\s*(\d+(?:[.,]\d+)?)',
    ]
    for pattern in target_patterns:
        match = re.search(pattern, question_lower)
        if match:
            params['target_tons'] = float(match.group(1).replace(',', '.'))
            break
    
    # Extract distance
    distance_match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:km|kilometer)', question_lower)
    if distance_match:
        params['distance_km'] = float(distance_match.group(1).replace(',', '.'))
    
    # Extract site/location
    site_match = re.search(r'(?:site|pit|lokasi|tambang)\s*([A-Za-z0-9]+)', question_lower)
    if site_match:
        params['site'] = site_match.group(1)
    
    return params

FULL_DATABASE_SCHEMA = """
=== MINING OPERATIONS DATABASE - COMPLETE SCHEMA ===

[TABLES & RELATIONSHIPS]

1. trucks - Armada truk hauling
   - id (PK), code (unique), name, brand, model, yearManufacture
   - capacity (Float, tons), fuelCapacity, fuelConsumption (L/km), averageSpeed (km/h)
   - maintenanceCost, status, lastMaintenance, nextMaintenance
   - totalHours (Int), totalDistance (Float), currentOperatorId (FK->operators)
   - currentLocation, isActive (Boolean), purchaseDate, retirementDate
   - STATUS: 'IDLE'|'HAULING'|'LOADING'|'DUMPING'|'IN_QUEUE'|'MAINTENANCE'|'BREAKDOWN'|'REFUELING'|'STANDBY'|'OUT_OF_SERVICE'

2. excavators - Excavator untuk loading
   - id (PK), code (unique), name, brand, model, yearManufacture
   - bucketCapacity (Float, m³), productionRate (tons/min), fuelConsumption (L/hour)
   - maintenanceCost, status, lastMaintenance, nextMaintenance, totalHours
   - currentLocation, isActive (Boolean), purchaseDate, retirementDate
   - STATUS: 'ACTIVE'|'IDLE'|'MAINTENANCE'|'BREAKDOWN'|'STANDBY'|'OUT_OF_SERVICE'

3. operators - Operator alat berat
   - id (PK), userId (FK->users), employeeNumber (unique), licenseNumber
   - licenseType, licenseExpiry, competency (JSON), status, shift
   - totalHours, rating (1-5), salary, joinDate, resignDate
   - LICENSE: 'SIM_A'|'SIM_B1'|'SIM_B2'|'OPERATOR_ALAT_BERAT'
   - STATUS: 'ACTIVE'|'ON_LEAVE'|'SICK'|'RESIGNED'|'SUSPENDED'
   - SHIFT: 'SHIFT_1'|'SHIFT_2'|'SHIFT_3'

4. users - Pengguna sistem
   - id (PK), username (unique), email (unique), password, fullName
   - role, isActive (Boolean), lastLogin, createdAt
   - ROLE: 'ADMIN'|'SUPERVISOR'|'OPERATOR'|'DISPATCHER'|'MAINTENANCE_STAFF'

5. hauling_activities - Aktivitas hauling batubara
   - id (PK), activityNumber (unique)
   - truckId (FK->trucks), excavatorId (FK->excavators)
   - operatorId (FK->operators), supervisorId (FK->users)
   - loadingPointId (FK->loading_points), dumpingPointId (FK->dumping_points)
   - roadSegmentId (FK->road_segments), shift
   - queueStartTime, queueEndTime, loadingStartTime, loadingEndTime
   - departureTime, arrivalTime, dumpingStartTime, dumpingEndTime, returnTime
   - queueDuration, loadingDuration, haulingDuration, dumpingDuration, returnDuration
   - totalCycleTime (Int, minutes), loadWeight (Float, tons), targetWeight, loadEfficiency
   - distance (Float, km), fuelConsumed, status, weatherCondition, roadCondition
   - isDelayed (Boolean), delayMinutes, delayReasonId (FK->delay_reasons)
   - STATUS: 'PLANNED'|'IN_QUEUE'|'LOADING'|'HAULING'|'DUMPING'|'RETURNING'|'COMPLETED'|'DELAYED'|'CANCELLED'|'INCIDENT'
   - ROAD_CONDITION: 'EXCELLENT'|'GOOD'|'FAIR'|'POOR'|'CRITICAL'

6. production_records - Rekap produksi harian
   - id (PK), recordDate (Date), shift, miningSiteId (FK->mining_sites)
   - targetProduction (Float), actualProduction (Float), achievement (Float, %)
   - avgCalori, avgAshContent, avgSulfur, avgMoisture
   - totalTrips, totalDistance, totalFuel, avgCycleTime
   - trucksOperating, trucksBreakdown, excavatorsOperating, excavatorsBreakdown
   - downtimeHours, utilizationRate, equipmentAllocation (JSON)

7. mining_sites - Lokasi tambang
   - id (PK), code (unique), name, siteType, isActive (Boolean)
   - latitude, longitude, elevation, capacity, description
   - SITE_TYPE: 'PIT'|'STOCKPILE'|'CRUSHER'|'PORT'|'COAL_HAULING_ROAD'|'ROM_PAD'

8. loading_points - Titik loading batubara
   - id (PK), code (unique), name, miningSiteId (FK->mining_sites)
   - excavatorId (FK->excavators), isActive (Boolean), maxQueueSize
   - latitude, longitude, coalSeam, coalQuality (JSON)

9. dumping_points - Titik dumping batubara
   - id (PK), code (unique), name, miningSiteId (FK->mining_sites)
   - dumpingType, isActive (Boolean), capacity, currentStock
   - latitude, longitude
   - DUMPING_TYPE: 'STOCKPILE'|'CRUSHER'|'WASTE_DUMP'|'ROM_STOCKPILE'|'PORT'

10. road_segments - Segmen jalan hauling
    - id (PK), code (unique), name, miningSiteId (FK->mining_sites)
    - startPoint, endPoint, distance (Float, km), roadCondition, maxSpeed
    - gradient, isActive (Boolean), lastMaintenance
    - ROAD_CONDITION: 'EXCELLENT'|'GOOD'|'FAIR'|'POOR'|'CRITICAL'

11. vessels - Kapal dan tongkang
    - id (PK), code (unique), name, vesselType
    - gt (Gross Tonnage), dwt (Deadweight Tonnage), loa (Length Overall)
    - capacity (Float, tons), owner, isOwned (Boolean), status, currentLocation, isActive
    - VESSEL_TYPE: 'MOTHER_VESSEL'|'BARGE'|'TUG_BOAT'
    - VESSEL_STATUS: 'AVAILABLE'|'LOADING'|'SAILING'|'DISCHARGING'|'MAINTENANCE'|'CHARTERED'

12. sailing_schedules - Jadwal pelayaran
    - id (PK), scheduleNumber (unique), vesselId (FK->vessels), voyageNumber
    - loadingPort, destination, etaLoading, etsLoading, etaDestination
    - ataLoading, loadingStart, loadingComplete, atsLoading, ataDestination
    - plannedQuantity (Float), actualQuantity, buyer, contractNumber, status
    - STATUS: 'SCHEDULED'|'STANDBY'|'LOADING'|'SAILING'|'ARRIVED'|'DISCHARGING'|'COMPLETED'|'CANCELLED'

13. maintenance_logs - Log perawatan alat
    - id (PK), maintenanceNumber (unique)
    - truckId (FK->trucks), excavatorId (FK->excavators), supportEquipmentId (FK)
    - maintenanceType, scheduledDate, actualDate, completionDate
    - duration, cost, description, partsReplaced (JSON), mechanicName
    - status, downtimeHours
    - MAINTENANCE_TYPE: 'PREVENTIVE'|'CORRECTIVE'|'PREDICTIVE'|'OVERHAUL'|'INSPECTION'
    - STATUS: 'SCHEDULED'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'|'DELAYED'

14. incident_reports - Laporan insiden
    - id (PK), incidentNumber (unique), incidentDate, reportDate
    - location, miningSiteCode, truckId (FK), excavatorId (FK)
    - reportedById (FK->users), operatorId (FK->operators)
    - incidentType, severity, description, rootCause
    - injuries, fatalities, equipmentDamage, productionLoss, estimatedCost, downtimeHours
    - status, actionTaken, preventiveMeasure, photos (JSON), documents (JSON)
    - INCIDENT_TYPE: 'ACCIDENT'|'NEAR_MISS'|'EQUIPMENT_FAILURE'|'SPILL'|'FIRE'|'COLLISION'|'ROLLOVER'|'ENVIRONMENTAL'|'SAFETY_VIOLATION'
    - SEVERITY: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'

15. fuel_consumptions - Konsumsi BBM
    - id (PK), consumptionDate, truckId (FK), excavatorId (FK), supportEquipmentId (FK)
    - fuelType, quantity (Float, liters), costPerLiter, totalCost
    - operatingHours, distance, fuelEfficiency, fuelStation
    - FUEL_TYPE: 'SOLAR'|'BENSIN'|'PERTAMAX'

16. weather_logs - Log cuaca
    - id (PK), timestamp, miningSiteId (FK->mining_sites)
    - condition, temperature, humidity, windSpeed, windDirection, rainfall
    - visibility, waveHeight, seaCondition, isOperational (Boolean), riskLevel
    - CONDITION: 'CERAH'|'BERAWAN'|'MENDUNG'|'HUJAN_RINGAN'|'HUJAN_SEDANG'|'HUJAN_LEBAT'|'BADAI'|'KABUT'
    - VISIBILITY: 'EXCELLENT'|'GOOD'|'MODERATE'|'POOR'|'VERY_POOR'
    - RISK_LEVEL: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'

17. delay_reasons - Kategori alasan delay
    - id (PK), code (unique), category, name, description, isActive (Boolean)
    - CATEGORY: 'WEATHER'|'EQUIPMENT'|'QUEUE'|'ROAD'|'OPERATOR'|'FUEL'|'ADMINISTRATIVE'|'SAFETY'|'OTHER'

18. support_equipment - Peralatan pendukung
    - id (PK), code (unique), name, equipmentType, brand, model
    - status, lastMaintenance, totalHours, isActive (Boolean)
    - TYPE: 'GRADER'|'WATER_TRUCK'|'FUEL_TRUCK'|'DOZER'|'COMPACTOR'|'LIGHT_VEHICLE'
    - STATUS: 'ACTIVE'|'IDLE'|'MAINTENANCE'|'BREAKDOWN'|'OUT_OF_SERVICE'

19. queue_logs - Log antrian loading
    - id (PK), loadingPointId (FK), truckId, queueLength, queueStartTime, queueEndTime, waitingTime, timestamp

20. equipment_status_logs - Riwayat status alat
    - id (PK), timestamp, truckId (FK), excavatorId (FK), supportEquipmentId (FK)
    - previousStatus, currentStatus, statusReason, location, durationMinutes

21. barge_loading_logs - Log muat tongkang
    - id (PK), loadingNumber (unique), vesselCode, vesselName
    - loadingDate, shift, startTime, endTime, stockpileSource, quantity
    - loaderUsed, bargeTrips, weatherCondition, tidalCondition, delayMinutes, delayReason

22. jetty_berths - Dermaga kapal
    - id (PK), code (unique), name, portName, maxVesselSize, maxDraft
    - hasConveyor (Boolean), loadingCapacity, isActive (Boolean)

23. berthing_logs - Log sandar kapal
    - id (PK), jettyBerthId (FK), vesselCode, vesselName
    - arrivalTime, berthingTime, loadingStart, loadingEnd, departureTime
    - draftArrival, draftDeparture, waitingTime

24. shipment_records - Rekap pengiriman
    - id (PK), shipmentNumber (unique), vesselId (FK), sailingScheduleId (FK)
    - shipmentDate, loadingDate, coalType, quantity, calorie
    - totalMoisture, ashContent, sulfurContent, stockpileOrigin
    - buyer, destination, surveyorName, blNumber, coaNumber, freightCost, totalFreight

25. recommendation_logs - Log rekomendasi AI
    - id (PK), recommendationType, scenario (JSON), recommendations (JSON)
    - selectedStrategy, selectedStrategyId, implementedAt, implementedBy (FK)
    - results (JSON), profitActual, profitPredicted, variance, feedback

26. prediction_logs - Log prediksi ML
    - id (PK), predictionType, inputParameters (JSON), results (JSON)
    - accuracy, executionTime, modelVersion, timestamp

27. chatbot_interactions - Riwayat chatbot
    - id (PK), userId (FK), sessionId, userQuestion, aiResponse
    - context (JSON), responseTime, rating, timestamp

28. model_training_logs - Log training model
    - id (PK), modelType, modelVersion, trainingDataSize
    - trainingAccuracy, validationAccuracy, testAccuracy
    - hyperparameters (JSON), featureImportance (JSON), trainedAt, status

29. system_configs - Konfigurasi sistem
    - id (PK), configKey (unique), configValue, dataType, category
    - description, isActive (Boolean), updatedBy (FK)

[KEY RELATIONSHIPS]
- hauling_activities connects: trucks, excavators, operators, users, loading_points, dumping_points, road_segments, delay_reasons
- production_records -> mining_sites (site performance)
- vessels -> sailing_schedules -> shipment_records (shipping chain)
- maintenance_logs -> trucks/excavators/support_equipment
- fuel_consumptions -> trucks/excavators/support_equipment
- incident_reports -> trucks/excavators/users/operators

[POSTGRESQL RULES]
1. CamelCase columns MUST use double quotes: "isActive", "loadWeight", "createdAt", "totalCycleTime"
2. Enum values are UPPERCASE strings with single quotes: 'IDLE', 'ACTIVE', 'COMPLETED'
3. Boolean: true/false (lowercase, no quotes)
4. Date filtering: WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days'
5. Active equipment: "isActive" = true
6. Available trucks: status = 'IDLE' AND "isActive" = true
7. For aggregations: COALESCE(SUM/AVG(...), 0) to handle NULLs
8. JOINs use quoted FK: JOIN trucks t ON h."truckId" = t.id
"""

QUERY_EXAMPLES = {
    "count": "SELECT COUNT(*) as total FROM {table} WHERE \"isActive\" = true",
    "max": "SELECT * FROM {table} WHERE \"isActive\" = true ORDER BY {column} DESC LIMIT 1",
    "min": "SELECT * FROM {table} WHERE \"isActive\" = true ORDER BY {column} ASC LIMIT 1",
    "avg": "SELECT ROUND(AVG({column})::numeric, 2) as avg_{column} FROM {table} WHERE \"isActive\" = true",
    "sum": "SELECT COALESCE(SUM({column}), 0) as total FROM {table}",
    "group_status": "SELECT status, COUNT(*) as count FROM {table} WHERE \"isActive\" = true GROUP BY status ORDER BY count DESC",
    "recent": "SELECT * FROM {table} ORDER BY \"createdAt\" DESC LIMIT {limit}",
    "join_truck_hauling": "SELECT h.*, t.code as truck_code, t.name as truck_name FROM hauling_activities h JOIN trucks t ON h.\"truckId\" = t.id",
    "date_range": "SELECT * FROM {table} WHERE \"{date_column}\" >= CURRENT_DATE - INTERVAL '{days} days'",
    "top_n": "SELECT {columns} FROM {table} WHERE \"isActive\" = true ORDER BY {order_column} DESC LIMIT {n}",
}

SEMANTIC_QUERY_MAP = {
    "truk": {"table": "trucks", "id_col": "id", "code_col": "code", "name_col": "name"},
    "truck": {"table": "trucks", "id_col": "id", "code_col": "code", "name_col": "name"},
    "excavator": {"table": "excavators", "id_col": "id", "code_col": "code", "name_col": "name"},
    "ekskavator": {"table": "excavators", "id_col": "id", "code_col": "code", "name_col": "name"},
    "alat berat": {"table": "excavators", "id_col": "id", "code_col": "code", "name_col": "name"},
    "operator": {"table": "operators", "id_col": "id", "code_col": "employeeNumber", "name_col": "id"},
    "kapal": {"table": "vessels", "id_col": "id", "code_col": "code", "name_col": "name"},
    "vessel": {"table": "vessels", "id_col": "id", "code_col": "code", "name_col": "name"},
    "tongkang": {"table": "vessels", "id_col": "id", "code_col": "code", "name_col": "name"},
    "barge": {"table": "vessels", "id_col": "id", "code_col": "code", "name_col": "name"},
    "hauling": {"table": "hauling_activities", "id_col": "id", "code_col": "activityNumber", "name_col": "activityNumber"},
    "produksi": {"table": "production_records", "id_col": "id", "code_col": "id", "name_col": "id"},
    "production": {"table": "production_records", "id_col": "id", "code_col": "id", "name_col": "id"},
    "site": {"table": "mining_sites", "id_col": "id", "code_col": "code", "name_col": "name"},
    "tambang": {"table": "mining_sites", "id_col": "id", "code_col": "code", "name_col": "name"},
    "lokasi": {"table": "mining_sites", "id_col": "id", "code_col": "code", "name_col": "name"},
    "loading point": {"table": "loading_points", "id_col": "id", "code_col": "code", "name_col": "name"},
    "titik muat": {"table": "loading_points", "id_col": "id", "code_col": "code", "name_col": "name"},
    "dumping point": {"table": "dumping_points", "id_col": "id", "code_col": "code", "name_col": "name"},
    "titik buang": {"table": "dumping_points", "id_col": "id", "code_col": "code", "name_col": "name"},
    "jalan": {"table": "road_segments", "id_col": "id", "code_col": "code", "name_col": "name"},
    "road": {"table": "road_segments", "id_col": "id", "code_col": "code", "name_col": "name"},
    "maintenance": {"table": "maintenance_logs", "id_col": "id", "code_col": "maintenanceNumber", "name_col": "maintenanceNumber"},
    "perawatan": {"table": "maintenance_logs", "id_col": "id", "code_col": "maintenanceNumber", "name_col": "maintenanceNumber"},
    "insiden": {"table": "incident_reports", "id_col": "id", "code_col": "incidentNumber", "name_col": "incidentNumber"},
    "incident": {"table": "incident_reports", "id_col": "id", "code_col": "incidentNumber", "name_col": "incidentNumber"},
    "kecelakaan": {"table": "incident_reports", "id_col": "id", "code_col": "incidentNumber", "name_col": "incidentNumber"},
    "bbm": {"table": "fuel_consumptions", "id_col": "id", "code_col": "id", "name_col": "id"},
    "fuel": {"table": "fuel_consumptions", "id_col": "id", "code_col": "id", "name_col": "id"},
    "bahan bakar": {"table": "fuel_consumptions", "id_col": "id", "code_col": "id", "name_col": "id"},
    "cuaca": {"table": "weather_logs", "id_col": "id", "code_col": "id", "name_col": "id"},
    "weather": {"table": "weather_logs", "id_col": "id", "code_col": "id", "name_col": "id"},
    "delay": {"table": "delay_reasons", "id_col": "id", "code_col": "code", "name_col": "name"},
    "keterlambatan": {"table": "delay_reasons", "id_col": "id", "code_col": "code", "name_col": "name"},
    "jadwal": {"table": "sailing_schedules", "id_col": "id", "code_col": "scheduleNumber", "name_col": "scheduleNumber"},
    "schedule": {"table": "sailing_schedules", "id_col": "id", "code_col": "scheduleNumber", "name_col": "scheduleNumber"},
    "pelayaran": {"table": "sailing_schedules", "id_col": "id", "code_col": "scheduleNumber", "name_col": "scheduleNumber"},
    "pengiriman": {"table": "shipment_records", "id_col": "id", "code_col": "shipmentNumber", "name_col": "shipmentNumber"},
    "shipment": {"table": "shipment_records", "id_col": "id", "code_col": "shipmentNumber", "name_col": "shipmentNumber"},
    "dermaga": {"table": "jetty_berths", "id_col": "id", "code_col": "code", "name_col": "name"},
    "jetty": {"table": "jetty_berths", "id_col": "id", "code_col": "code", "name_col": "name"},
    "antrian": {"table": "queue_logs", "id_col": "id", "code_col": "id", "name_col": "id"},
    "queue": {"table": "queue_logs", "id_col": "id", "code_col": "id", "name_col": "id"},
}

COLUMN_SYNONYMS = {
    "kapasitas": "capacity",
    "capacity": "capacity",
    "muatan": "loadWeight",
    "load": "loadWeight",
    "berat": "loadWeight",
    "jarak": "distance",
    "distance": "distance",
    "waktu": "totalCycleTime",
    "siklus": "totalCycleTime",
    "cycle": "totalCycleTime",
    "jam": "totalHours",
    "hours": "totalHours",
    "rating": "rating",
    "nilai": "rating",
    "gaji": "salary",
    "salary": "salary",
    "bucket": "bucketCapacity",
    "ember": "bucketCapacity",
    "produksi": "actualProduction",
    "production": "actualProduction",
    "target": "targetProduction",
    "achievement": "achievement",
    "pencapaian": "achievement",
    "bbm": "quantity",
    "fuel": "quantity",
    "biaya": "cost",
    "cost": "cost",
    "harga": "costPerLiter",
    "suhu": "temperature",
    "temperature": "temperature",
    "hujan": "rainfall",
    "rainfall": "rainfall",
    "downtime": "downtimeHours",
    "utilisasi": "utilizationRate",
    "utilization": "utilizationRate",
    "kecepatan": "averageSpeed",
    "speed": "averageSpeed",
}

def get_enhanced_schema():
    return FULL_DATABASE_SCHEMA

SCHEMA_CONTEXT = FULL_DATABASE_SCHEMA

PREDEFINED_QUERIES = {
    "idle_trucks_count": """SELECT COUNT(*) as total FROM trucks WHERE status = 'IDLE' AND "isActive" = true""",
    "largest_truck": """SELECT code, name, brand, model, capacity FROM trucks WHERE "isActive" = true ORDER BY capacity DESC LIMIT 1""",
    "smallest_truck": """SELECT code, name, brand, model, capacity FROM trucks WHERE "isActive" = true ORDER BY capacity ASC LIMIT 1""",
    "active_excavators": """SELECT COUNT(*) as total FROM excavators WHERE "isActive" = true""",
    "idle_excavators": """SELECT COUNT(*) as total FROM excavators WHERE status = 'IDLE' AND "isActive" = true""",
    "mining_sites": """SELECT code, name, "siteType" FROM mining_sites WHERE "isActive" = true""",
    "recent_hauling": """SELECT h."activityNumber", h."loadWeight", h."totalCycleTime", h.status, t.code as truck_code FROM hauling_activities h LEFT JOIN trucks t ON h."truckId" = t.id ORDER BY h."createdAt" DESC LIMIT 10""",
    "truck_status_summary": """SELECT status, COUNT(*) as count FROM trucks WHERE "isActive" = true GROUP BY status ORDER BY count DESC""",
    "excavator_status_summary": """SELECT status, COUNT(*) as count FROM excavators WHERE "isActive" = true GROUP BY status ORDER BY count DESC""",
    "production_summary": """SELECT COALESCE(SUM("actualProduction"), 0) as total_production, COALESCE(AVG(achievement), 0) as avg_achievement FROM production_records""",
    "total_trucks": """SELECT COUNT(*) as total FROM trucks WHERE "isActive" = true""",
    "total_excavators": """SELECT COUNT(*) as total FROM excavators WHERE "isActive" = true""",
    "all_trucks": """SELECT COUNT(*) as total FROM trucks""",
    "all_excavators": """SELECT COUNT(*) as total FROM excavators""",
    "total_operators": """SELECT COUNT(*) as total FROM operators WHERE status = 'ACTIVE'""",
    "all_operators": """SELECT COUNT(*) as total FROM operators""",
    "total_vessels": """SELECT COUNT(*) as total FROM vessels WHERE "isActive" = true""",
    "all_vessels": """SELECT COUNT(*) as total FROM vessels""",
    "total_hauling": """SELECT COUNT(*) as total FROM hauling_activities""",
    "completed_hauling": """SELECT COUNT(*) as total FROM hauling_activities WHERE status = 'COMPLETED'""",
    "total_production_records": """SELECT COUNT(*) as total FROM production_records""",
    "total_maintenance": """SELECT COUNT(*) as total FROM maintenance_logs""",
    "total_incidents": """SELECT COUNT(*) as total FROM incident_reports""",
    "total_fuel": """SELECT COALESCE(SUM(quantity), 0) as total_liters, COALESCE(SUM("totalCost"), 0) as total_cost FROM fuel_consumptions""",
    "total_loading_points": """SELECT COUNT(*) as total FROM loading_points WHERE "isActive" = true""",
    "total_dumping_points": """SELECT COUNT(*) as total FROM dumping_points WHERE "isActive" = true""",
    "total_road_segments": """SELECT COUNT(*) as total FROM road_segments WHERE "isActive" = true""",
    "avg_truck_capacity": """SELECT ROUND(AVG(capacity)::numeric, 2) as avg_capacity, MAX(capacity) as max_capacity, MIN(capacity) as min_capacity FROM trucks WHERE "isActive" = true""",
    "avg_excavator_bucket": """SELECT ROUND(AVG("bucketCapacity")::numeric, 2) as avg_bucket, MAX("bucketCapacity") as max_bucket, MIN("bucketCapacity") as min_bucket FROM excavators WHERE "isActive" = true""",
    "avg_hauling_cycle": """SELECT ROUND(AVG("totalCycleTime")::numeric, 2) as avg_cycle, ROUND(AVG("loadWeight")::numeric, 2) as avg_load, ROUND(AVG(distance)::numeric, 2) as avg_distance FROM hauling_activities WHERE "totalCycleTime" > 0""",
    "daily_production": """SELECT "recordDate", SUM("actualProduction") as production, AVG(achievement) as achievement FROM production_records WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days' GROUP BY "recordDate" ORDER BY "recordDate" DESC""",
    "truck_brands": """SELECT brand, COUNT(*) as count FROM trucks WHERE "isActive" = true GROUP BY brand ORDER BY count DESC""",
    "excavator_brands": """SELECT brand, COUNT(*) as count FROM excavators WHERE "isActive" = true GROUP BY brand ORDER BY count DESC""",
    "maintenance_trucks": """SELECT COUNT(*) as total FROM trucks WHERE status = 'MAINTENANCE' AND "isActive" = true""",
    "breakdown_trucks": """SELECT COUNT(*) as total FROM trucks WHERE status = 'BREAKDOWN' AND "isActive" = true""",
    "hauling_trucks": """SELECT COUNT(*) as total FROM trucks WHERE status = 'HAULING' AND "isActive" = true""",
    "loading_trucks": """SELECT COUNT(*) as total FROM trucks WHERE status = 'LOADING' AND "isActive" = true""",
    "weather_today": """SELECT condition, temperature, humidity, rainfall, "riskLevel" FROM weather_logs ORDER BY timestamp DESC LIMIT 1""",
    "recent_incidents": """SELECT "incidentNumber", "incidentType", severity, "incidentDate" FROM incident_reports ORDER BY "incidentDate" DESC LIMIT 5""",
    "active_schedules": """SELECT "scheduleNumber", status, "plannedQuantity" FROM sailing_schedules WHERE status NOT IN ('COMPLETED', 'CANCELLED') ORDER BY "etaLoading" LIMIT 10""",
    "vessel_status": """SELECT status, COUNT(*) as count FROM vessels WHERE "isActive" = true GROUP BY status ORDER BY count DESC""",
    "operator_shifts": """SELECT shift, COUNT(*) as count FROM operators WHERE status = 'ACTIVE' GROUP BY shift ORDER BY shift""",
    "delay_categories": """SELECT category, COUNT(*) as count FROM delay_reasons WHERE "isActive" = true GROUP BY category ORDER BY count DESC""",
    "road_conditions": """SELECT "roadCondition" as condition, COUNT(*) as count FROM road_segments WHERE "isActive" = true GROUP BY "roadCondition" ORDER BY count DESC""",
    "top_trucks_by_hours": """SELECT code, name, "totalHours" FROM trucks WHERE "isActive" = true ORDER BY "totalHours" DESC LIMIT 10""",
    "top_trucks_by_distance": """SELECT code, name, "totalDistance" FROM trucks WHERE "isActive" = true ORDER BY "totalDistance" DESC LIMIT 10""",
    "largest_excavator": """SELECT code, name, brand, model, "bucketCapacity" FROM excavators WHERE "isActive" = true AND "bucketCapacity" IS NOT NULL ORDER BY "bucketCapacity" DESC LIMIT 1""",
    "smallest_excavator": """SELECT code, name, brand, model, "bucketCapacity" FROM excavators WHERE "isActive" = true AND "bucketCapacity" IS NOT NULL ORDER BY "bucketCapacity" ASC LIMIT 1""",
    "largest_vessel": """SELECT code, name, "vesselType", capacity, dwt FROM vessels WHERE "isActive" = true ORDER BY capacity DESC LIMIT 1""",
    "smallest_vessel": """SELECT code, name, "vesselType", capacity, dwt FROM vessels WHERE "isActive" = true ORDER BY capacity ASC LIMIT 1""",
    "top_operators_by_hours": """SELECT "employeeNumber", "totalHours", rating, shift FROM operators WHERE status = 'ACTIVE' ORDER BY "totalHours" DESC LIMIT 10""",
    "top_operators_by_rating": """SELECT "employeeNumber", "totalHours", rating, shift FROM operators WHERE status = 'ACTIVE' ORDER BY rating DESC LIMIT 10""",
    "hauling_by_shift": """SELECT shift, COUNT(*) as total_trips, ROUND(AVG("loadWeight")::numeric, 2) as avg_load, ROUND(AVG("totalCycleTime")::numeric, 2) as avg_cycle FROM hauling_activities GROUP BY shift ORDER BY shift""",
    "hauling_delayed": """SELECT COUNT(*) as total FROM hauling_activities WHERE "isDelayed" = true""",
    "hauling_completed": """SELECT COUNT(*) as total FROM hauling_activities WHERE status = 'COMPLETED'""",
    "hauling_in_progress": """SELECT COUNT(*) as total FROM hauling_activities WHERE status IN ('LOADING', 'HAULING', 'DUMPING', 'RETURNING')""",
    "production_today": """SELECT COALESCE(SUM("actualProduction"), 0) as total, COALESCE(AVG(achievement), 0) as avg_achievement FROM production_records WHERE "recordDate" = CURRENT_DATE""",
    "production_this_month": """SELECT COALESCE(SUM("actualProduction"), 0) as total, COALESCE(AVG(achievement), 0) as avg_achievement FROM production_records WHERE "recordDate" >= DATE_TRUNC('month', CURRENT_DATE)""",
    "production_by_site": """SELECT ms.name as site_name, SUM(pr."actualProduction") as total_production, AVG(pr.achievement) as avg_achievement FROM production_records pr JOIN mining_sites ms ON pr."miningSiteId" = ms.id GROUP BY ms.name ORDER BY total_production DESC""",
    "incidents_by_type": """SELECT "incidentType", COUNT(*) as count FROM incident_reports GROUP BY "incidentType" ORDER BY count DESC""",
    "incidents_by_severity": """SELECT severity, COUNT(*) as count FROM incident_reports GROUP BY severity ORDER BY count DESC""",
    "incidents_this_month": """SELECT COUNT(*) as total FROM incident_reports WHERE "incidentDate" >= DATE_TRUNC('month', CURRENT_DATE)""",
    "maintenance_by_type": """SELECT "maintenanceType", COUNT(*) as count FROM maintenance_logs GROUP BY "maintenanceType" ORDER BY count DESC""",
    "maintenance_pending": """SELECT COUNT(*) as total FROM maintenance_logs WHERE status IN ('SCHEDULED', 'IN_PROGRESS')""",
    "maintenance_completed_month": """SELECT COUNT(*) as total FROM maintenance_logs WHERE status = 'COMPLETED' AND "completionDate" >= DATE_TRUNC('month', CURRENT_DATE)""",
    "fuel_by_equipment": """SELECT CASE WHEN "truckId" IS NOT NULL THEN 'Truck' WHEN "excavatorId" IS NOT NULL THEN 'Excavator' ELSE 'Support Equipment' END as equipment_type, SUM(quantity) as total_liters, SUM("totalCost") as total_cost FROM fuel_consumptions GROUP BY CASE WHEN "truckId" IS NOT NULL THEN 'Truck' WHEN "excavatorId" IS NOT NULL THEN 'Excavator' ELSE 'Support Equipment' END""",
    "fuel_this_month": """SELECT COALESCE(SUM(quantity), 0) as total_liters, COALESCE(SUM("totalCost"), 0) as total_cost FROM fuel_consumptions WHERE "consumptionDate" >= DATE_TRUNC('month', CURRENT_DATE)""",
    "weather_history": """SELECT condition, COUNT(*) as count FROM weather_logs WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days' GROUP BY condition ORDER BY count DESC""",
    "vessels_by_type": """SELECT "vesselType", COUNT(*) as count FROM vessels WHERE "isActive" = true GROUP BY "vesselType" ORDER BY count DESC""",
    "vessels_loading": """SELECT code, name, capacity FROM vessels WHERE status = 'LOADING' AND "isActive" = true""",
    "schedules_this_month": """SELECT COUNT(*) as total FROM sailing_schedules WHERE "etaLoading" >= DATE_TRUNC('month', CURRENT_DATE) AND "etaLoading" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'""",
    "shipments_this_month": """SELECT COUNT(*) as total_shipments, COALESCE(SUM(quantity), 0) as total_quantity FROM shipment_records WHERE "shipmentDate" >= DATE_TRUNC('month', CURRENT_DATE)""",
    "support_equipment_count": """SELECT "equipmentType", COUNT(*) as count FROM support_equipment WHERE "isActive" = true GROUP BY "equipmentType" ORDER BY count DESC""",
    "queue_avg_wait": """SELECT ROUND(AVG("waitingTime")::numeric, 2) as avg_wait_minutes FROM queue_logs WHERE "waitingTime" IS NOT NULL""",
    "loading_points_with_excavator": """SELECT lp.code, lp.name, e.code as excavator_code, e.name as excavator_name FROM loading_points lp LEFT JOIN excavators e ON lp."excavatorId" = e.id WHERE lp."isActive" = true""",
    "truck_details_all": """SELECT code, name, brand, model, capacity, status, "totalHours", "totalDistance" FROM trucks WHERE "isActive" = true ORDER BY code""",
    "excavator_details_all": """SELECT code, name, brand, model, "bucketCapacity", "productionRate", status, "totalHours" FROM excavators WHERE "isActive" = true ORDER BY code""",
    "operator_details_all": """SELECT "employeeNumber", "licenseType", status, shift, "totalHours", rating, salary FROM operators ORDER BY "employeeNumber" """,
    "hauling_performance": """SELECT DATE("loadingStartTime") as date, COUNT(*) as trips, ROUND(AVG("loadWeight")::numeric, 2) as avg_load, ROUND(AVG("totalCycleTime")::numeric, 2) as avg_cycle, ROUND(SUM("loadWeight")::numeric, 2) as total_hauled FROM hauling_activities WHERE "loadingStartTime" >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE("loadingStartTime") ORDER BY date DESC""",
    "efficiency_summary": """SELECT ROUND(AVG("loadEfficiency")::numeric * 100, 2) as avg_load_efficiency, ROUND(AVG("utilizationRate")::numeric, 2) as avg_utilization FROM hauling_activities h, production_records p WHERE h."loadEfficiency" IS NOT NULL""",
    "downtime_summary": """SELECT SUM("downtimeHours") as total_downtime, AVG("downtimeHours") as avg_downtime FROM production_records WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days'""",
    "delay_analysis": """SELECT dr.category, dr.name, COUNT(h.id) as occurrences FROM hauling_activities h JOIN delay_reasons dr ON h."delayReasonId" = dr.id WHERE h."isDelayed" = true GROUP BY dr.category, dr.name ORDER BY occurrences DESC LIMIT 10""",
    "cost_summary_maintenance": """SELECT SUM(cost) as total_cost, COUNT(*) as total_jobs FROM maintenance_logs WHERE status = 'COMPLETED' AND "completionDate" >= CURRENT_DATE - INTERVAL '30 days'""",
    "cost_summary_fuel": """SELECT SUM("totalCost") as total_cost, SUM(quantity) as total_liters FROM fuel_consumptions WHERE "consumptionDate" >= CURRENT_DATE - INTERVAL '30 days'""",
    "fleet_summary": """SELECT (SELECT COUNT(*) FROM trucks WHERE "isActive" = true) as total_trucks, (SELECT COUNT(*) FROM excavators WHERE "isActive" = true) as total_excavators, (SELECT COUNT(*) FROM vessels WHERE "isActive" = true) as total_vessels, (SELECT COUNT(*) FROM operators WHERE status = 'ACTIVE') as total_operators""",
    "production_vs_target": """SELECT "recordDate", "targetProduction", "actualProduction", achievement, "trucksOperating", "excavatorsOperating" FROM production_records WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days' ORDER BY "recordDate" DESC""",
    "top_hauling_trucks": """SELECT t.code, t.name, COUNT(h.id) as total_trips, SUM(h."loadWeight") as total_hauled FROM hauling_activities h JOIN trucks t ON h."truckId" = t.id WHERE h."createdAt" >= CURRENT_DATE - INTERVAL '7 days' GROUP BY t.code, t.name ORDER BY total_hauled DESC LIMIT 10""",
    "top_hauling_excavators": """SELECT e.code, e.name, COUNT(h.id) as total_trips, SUM(h."loadWeight") as total_loaded FROM hauling_activities h JOIN excavators e ON h."excavatorId" = e.id WHERE h."createdAt" >= CURRENT_DATE - INTERVAL '7 days' GROUP BY e.code, e.name ORDER BY total_loaded DESC LIMIT 10""",
}

QUERY_PATTERNS = [
    (r'truk.*kapasitas.*(?:terbesar|maksimum|tertinggi|paling\s+besar)', 'largest_truck', 'largest_truck'),
    (r'truk.*kapasitas.*(?:terkecil|minimum|terendah|paling\s+kecil)', 'smallest_truck', 'smallest_truck'),
    (r'kapasitas.*(?:terbesar|maksimum|tertinggi).*truk', 'largest_truck', 'largest_truck'),
    (r'kapasitas.*(?:terkecil|minimum|terendah).*truk', 'smallest_truck', 'smallest_truck'),
    (r'(?:truk|truck).*(?:terbesar|terbanyak|maksimum|tertinggi)', 'largest_truck', 'largest_truck'),
    (r'(?:truk|truck).*(?:terkecil|minimum|terendah)', 'smallest_truck', 'smallest_truck'),
    (r'excavator.*bucket.*(?:terbesar|maksimum|tertinggi|paling\s+besar)', 'largest_excavator', 'largest_excavator'),
    (r'excavator.*bucket.*(?:terkecil|minimum|terendah|paling\s+kecil)', 'smallest_excavator', 'smallest_excavator'),
    (r'excavator.*(?:kapasitas|terbesar|tertinggi)', 'largest_excavator', 'largest_excavator'),
    (r'excavator.*(?:terkecil|terendah)', 'smallest_excavator', 'smallest_excavator'),
    (r'bucket.*(?:terbesar|maksimum|tertinggi).*excavator', 'largest_excavator', 'largest_excavator'),
    (r'bucket.*(?:terkecil|minimum|terendah).*excavator', 'smallest_excavator', 'smallest_excavator'),
    (r'(?:kapal|vessel|barge).*(?:kapasitas|dwt).*(?:terbesar|maksimum|tertinggi)', 'largest_vessel', 'largest_vessel'),
    (r'(?:kapal|vessel|barge).*(?:kapasitas|dwt).*(?:terkecil|minimum|terendah)', 'smallest_vessel', 'smallest_vessel'),
    (r'(?:kapal|vessel|barge).*(?:terbesar|maksimum|tertinggi)', 'largest_vessel', 'largest_vessel'),
    (r'(?:kapal|vessel|barge).*(?:terkecil|minimum|terendah)', 'smallest_vessel', 'smallest_vessel'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:truk|truck)(?:\s+(?:yang\s+)?(?:aktif|active))?(?:\s+saat\s+ini)?', 'total_trucks', 'truck_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:excavator|ekskavator|alat\s+berat)', 'total_excavators', 'excavator_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*operator', 'total_operators', 'operator_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:kapal|vessel|barge|tongkang)', 'total_vessels', 'vessel_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:hauling|pengangkutan|trip)', 'total_hauling', 'hauling_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:loading\s+point|titik\s+muat)', 'total_loading_points', 'loading_point_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:dumping\s+point|titik\s+buang)', 'total_dumping_points', 'dumping_point_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:road|jalan|segment)', 'total_road_segments', 'road_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:insiden|incident|kecelakaan)', 'total_incidents', 'incident_count'),
    (r'(?:berapa|jumlah|total|banyak|ada).*(?:maintenance|perawatan)', 'total_maintenance', 'maintenance_count'),
    (r'truk.*(?:idle|tersedia|available|nganggur|menganggur|standby)', 'idle_trucks_count', 'idle_trucks'),
    (r'(?:idle|tersedia|available|nganggur).*truk', 'idle_trucks_count', 'idle_trucks'),
    (r'excavator.*(?:idle|tersedia|available|nganggur)', 'idle_excavators', 'idle_excavators'),
    (r'truk.*(?:maintenance|perawatan|perbaikan|servis)', 'maintenance_trucks', 'maintenance_trucks'),
    (r'truk.*(?:breakdown|rusak|mogok)', 'breakdown_trucks', 'breakdown_trucks'),
    (r'truk.*(?:hauling|mengangkut|berjalan|jalan)', 'hauling_trucks', 'hauling_trucks'),
    (r'truk.*(?:loading|memuat|muat)', 'loading_trucks', 'loading_trucks'),
    (r'status.*truk', 'truck_status_summary', 'truck_status'),
    (r'status.*excavator', 'excavator_status_summary', 'excavator_status'),
    (r'status.*(?:kapal|vessel)', 'vessel_status', 'vessel_status'),
    (r'(?:rata-rata|average|avg|rerata).*kapasitas.*truk', 'avg_truck_capacity', 'avg_truck_capacity'),
    (r'(?:rata-rata|average|avg|rerata).*(?:bucket|ember).*excavator', 'avg_excavator_bucket', 'avg_excavator_bucket'),
    (r'(?:rata-rata|average|avg|rerata).*(?:cycle|siklus).*hauling', 'avg_hauling_cycle', 'avg_hauling_cycle'),
    (r'produksi.*(?:total|keseluruhan|semua)', 'production_summary', 'production_summary'),
    (r'(?:performa|kinerja|performance).*produksi', 'daily_production', 'daily_production'),
    (r'produksi.*(?:harian|per\s+hari|mingguan|7\s+hari|seminggu|minggu)', 'daily_production', 'daily_production'),
    (r'produksi.*(?:hari\s+ini|today)', 'production_today', 'production_today'),
    (r'produksi.*(?:bulan\s+ini|this\s+month)', 'production_this_month', 'production_this_month'),
    (r'produksi.*(?:per\s+site|per\s+lokasi|tiap\s+tambang)', 'production_by_site', 'production_by_site'),
    (r'(?:target|aktual).*produksi', 'production_vs_target', 'production_vs_target'),
    (r'hauling.*(?:terbaru|recent|terakhir)', 'recent_hauling', 'recent_hauling'),
    (r'hauling.*(?:delay|terlambat)', 'hauling_delayed', 'hauling_delayed'),
    (r'hauling.*(?:selesai|complete)', 'hauling_completed', 'hauling_completed'),
    (r'hauling.*(?:berjalan|in\s+progress|sedang)', 'hauling_in_progress', 'hauling_in_progress'),
    (r'hauling.*(?:per\s+shift|tiap\s+shift)', 'hauling_by_shift', 'hauling_by_shift'),
    (r'(?:performa|kinerja).*hauling', 'hauling_performance', 'hauling_performance'),
    (r'(?:mining\s+site|tambang|lokasi\s+tambang|site|pit)', 'mining_sites', 'mining_sites'),
    (r'(?:cuaca|weather)(?:.*(?:hari\s+ini|terkini|sekarang|saat\s+ini))?', 'weather_today', 'weather'),
    (r'(?:riwayat|history).*cuaca', 'weather_history', 'weather_history'),
    (r'insiden.*(?:terbaru|recent|terakhir)', 'recent_incidents', 'recent_incidents'),
    (r'insiden.*(?:per\s+tipe|by\s+type|jenis)', 'incidents_by_type', 'incidents_by_type'),
    (r'insiden.*(?:severity|tingkat|keparahan)', 'incidents_by_severity', 'incidents_by_severity'),
    (r'insiden.*(?:bulan\s+ini|this\s+month)', 'incidents_this_month', 'incidents_this_month'),
    (r'jadwal.*(?:pelayaran|sailing|kapal)', 'active_schedules', 'schedules'),
    (r'jadwal.*(?:bulan\s+ini|this\s+month)', 'schedules_this_month', 'schedules_this_month'),
    (r'(?:merk|brand|merek).*truk', 'truck_brands', 'truck_brands'),
    (r'(?:merk|brand|merek).*excavator', 'excavator_brands', 'excavator_brands'),
    (r'shift.*operator', 'operator_shifts', 'operator_shifts'),
    (r'(?:alasan|kategori|penyebab).*(?:delay|keterlambatan|terlambat)', 'delay_categories', 'delay_categories'),
    (r'(?:analisis|analysis).*delay', 'delay_analysis', 'delay_analysis'),
    (r'kondisi.*(?:jalan|road)', 'road_conditions', 'road_conditions'),
    (r'(?:jalan|road).*kondisi', 'road_conditions', 'road_conditions'),
    (r'truk.*(?:jam\s+operasi|hours|jam).*(?:tertinggi|terbanyak|top)', 'top_trucks_by_hours', 'top_trucks_hours'),
    (r'truk.*(?:jarak\s+tempuh|distance|jarak).*(?:terjauh|terbanyak|top)', 'top_trucks_by_distance', 'top_trucks_distance'),
    (r'(?:konsumsi|penggunaan).*(?:bbm|bahan\s+bakar|fuel|solar)', 'total_fuel', 'fuel_consumption'),
    (r'(?:bbm|fuel).*(?:bulan\s+ini|this\s+month)', 'fuel_this_month', 'fuel_this_month'),
    (r'(?:bbm|fuel).*(?:per\s+alat|per\s+equipment)', 'fuel_by_equipment', 'fuel_by_equipment'),
    (r'maintenance.*(?:per\s+tipe|by\s+type|jenis)', 'maintenance_by_type', 'maintenance_by_type'),
    (r'maintenance.*(?:pending|dijadwalkan|scheduled)', 'maintenance_pending', 'maintenance_pending'),
    (r'maintenance.*(?:selesai|complete).*(?:bulan|month)', 'maintenance_completed_month', 'maintenance_completed_month'),
    (r'operator.*(?:jam|hours).*(?:tertinggi|terbanyak|top)', 'top_operators_by_hours', 'top_operators_hours'),
    (r'operator.*(?:rating|nilai).*(?:tertinggi|terbaik|top)', 'top_operators_by_rating', 'top_operators_rating'),
    (r'(?:kapal|vessel).*(?:per\s+tipe|by\s+type|jenis)', 'vessels_by_type', 'vessels_by_type'),
    (r'(?:kapal|vessel).*(?:loading|muat|sedang\s+muat)', 'vessels_loading', 'vessels_loading'),
    (r'pengiriman.*(?:bulan\s+ini|this\s+month)', 'shipments_this_month', 'shipments_this_month'),
    (r'(?:support\s+equipment|alat\s+pendukung|peralatan\s+pendukung)', 'support_equipment_count', 'support_equipment_count'),
    (r'(?:antrian|queue).*(?:rata-rata|average|avg)', 'queue_avg_wait', 'queue_avg_wait'),
    (r'(?:rata-rata|average|avg).*(?:antrian|queue|tunggu|wait)', 'queue_avg_wait', 'queue_avg_wait'),
    (r'(?:waktu\s+tunggu|waiting\s+time).*(?:rata-rata|average|avg)', 'queue_avg_wait', 'queue_avg_wait'),
    (r'loading\s+point.*excavator', 'loading_points_with_excavator', 'loading_points_with_excavator'),
    (r'(?:detail|daftar|list).*(?:semua\s+)?truk', 'truck_details_all', 'truck_details_all'),
    (r'(?:detail|daftar|list).*(?:semua\s+)?excavator', 'excavator_details_all', 'excavator_details_all'),
    (r'(?:detail|daftar|list).*(?:semua\s+)?operator', 'operator_details_all', 'operator_details_all'),
    (r'(?:efisiensi|efficiency).*(?:summary|ringkasan)?', 'efficiency_summary', 'efficiency_summary'),
    (r'(?:downtime|waktu\s+henti)', 'downtime_summary', 'downtime_summary'),
    (r'(?:biaya|cost).*maintenance', 'cost_summary_maintenance', 'cost_summary_maintenance'),
    (r'(?:biaya|cost).*(?:bbm|fuel)', 'cost_summary_fuel', 'cost_summary_fuel'),
    (r'(?:ringkasan|summary).*(?:armada|fleet)', 'fleet_summary', 'fleet_summary'),
    (r'(?:top|ranking).*truk.*hauling', 'top_hauling_trucks', 'top_hauling_trucks'),
    (r'(?:top|ranking).*excavator.*(?:hauling|loading)', 'top_hauling_excavators', 'top_hauling_excavators'),
]

INTENT_KEYWORDS = {
    "count": ["berapa", "jumlah", "total", "banyak", "ada berapa", "hitung", "count"],
    "max": ["terbesar", "tertinggi", "maksimum", "paling besar", "paling tinggi", "biggest", "largest", "maximum", "top"],
    "min": ["terkecil", "terendah", "minimum", "paling kecil", "paling rendah", "smallest", "lowest", "minimum"],
    "avg": ["rata-rata", "average", "rerata", "mean"],
    "sum": ["total", "jumlah", "sum", "keseluruhan"],
    "list": ["daftar", "list", "semua", "tampilkan", "lihat", "show", "all"],
    "status": ["status", "kondisi", "keadaan", "state"],
    "recent": ["terbaru", "terakhir", "recent", "latest", "baru"],
    "compare": ["bandingkan", "compare", "perbandingan", "versus", "vs"],
    "trend": ["tren", "trend", "perkembangan", "history", "riwayat"],
    "detail": ["detail", "rinci", "lengkap", "info", "informasi"],
}

def get_fast_answer(question):
    question_lower = question.lower().strip()
    
    complex_indicators = [
        'dan', 'serta', 'juga', 'tampilkan', 'breakdown revenue', 'breakdown cost',
        'perbandingan', 'bandingkan', 'analisis', 'simulasi', 'profit', 'estimasi',
        'hitung', 'berdasarkan parameter', 'beserta', 'termasuk', ':'
    ]
    
    word_count = len(question_lower.split())
    has_complex_indicator = any(ind in question_lower for ind in complex_indicators)
    
    if word_count > 20 or has_complex_indicator:
        return None, None
    
    for pattern, query_key, answer_type in QUERY_PATTERNS:
        if re.search(pattern, question_lower):
            query = PREDEFINED_QUERIES.get(query_key)
            if query:
                return query, answer_type
    
    return None, None

def smart_query_builder(question):
    question_lower = question.lower()
    
    entity = None
    for keyword, info in SEMANTIC_QUERY_MAP.items():
        if keyword in question_lower:
            entity = info
            break
    
    if not entity:
        return None
    
    intent = None
    for intent_type, keywords in INTENT_KEYWORDS.items():
        if any(kw in question_lower for kw in keywords):
            intent = intent_type
            break
    
    if not intent:
        intent = "list"
    
    column = None
    for synonym, col_name in COLUMN_SYNONYMS.items():
        if synonym in question_lower:
            column = col_name
            break
    
    table = entity["table"]
    
    if intent == "count":
        return f'SELECT COUNT(*) as total FROM {table} WHERE "isActive" = true'
    elif intent == "max" and column:
        return f'SELECT * FROM {table} WHERE "isActive" = true ORDER BY "{column}" DESC LIMIT 1'
    elif intent == "min" and column:
        return f'SELECT * FROM {table} WHERE "isActive" = true ORDER BY "{column}" ASC LIMIT 1'
    elif intent == "avg" and column:
        return f'SELECT ROUND(AVG("{column}")::numeric, 2) as avg_{column} FROM {table} WHERE "isActive" = true'
    elif intent == "status":
        return f'SELECT status, COUNT(*) as count FROM {table} WHERE "isActive" = true GROUP BY status ORDER BY count DESC'
    elif intent == "recent":
        return f'SELECT * FROM {table} ORDER BY "createdAt" DESC LIMIT 10'
    elif intent == "list":
        return f'SELECT * FROM {table} WHERE "isActive" = true LIMIT 20'
    
    return None

def format_fast_answer(query_type, df, question):
    if df.empty:
        return "Tidak ada data yang ditemukan."
    
    row = df.iloc[0]
    
    formatters = {
        'truck_count': lambda r: f"Berdasarkan data yang tersedia, jumlah truk aktif saat ini adalah **{r.get('total', r.iloc[0])} unit**.",
        'excavator_count': lambda r: f"Berdasarkan data yang tersedia, jumlah excavator aktif saat ini adalah **{r.get('total', r.iloc[0])} unit**.",
        'operator_count': lambda r: f"Jumlah operator aktif saat ini adalah **{r.get('total', r.iloc[0])} orang**.",
        'vessel_count': lambda r: f"Jumlah kapal/vessel aktif saat ini adalah **{r.get('total', r.iloc[0])} unit**.",
        'hauling_count': lambda r: f"Total aktivitas hauling yang tercatat adalah **{r.get('total', r.iloc[0]):,} trip**.",
        'loading_point_count': lambda r: f"Jumlah loading point aktif adalah **{r.get('total', r.iloc[0])} lokasi**.",
        'dumping_point_count': lambda r: f"Jumlah dumping point aktif adalah **{r.get('total', r.iloc[0])} lokasi**.",
        'road_count': lambda r: f"Jumlah segment jalan aktif adalah **{r.get('total', r.iloc[0])} segment**.",
        'incident_count': lambda r: f"Total insiden yang tercatat adalah **{r.get('total', r.iloc[0])} kejadian**.",
        'maintenance_count': lambda r: f"Total log maintenance adalah **{r.get('total', r.iloc[0])} record**.",
        'idle_trucks': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit truk** dalam status IDLE (tersedia untuk digunakan).",
        'idle_excavators': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit excavator** dalam status IDLE.",
        'maintenance_trucks': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit truk** dalam status MAINTENANCE.",
        'breakdown_trucks': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit truk** dalam status BREAKDOWN.",
        'hauling_trucks': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit truk** yang sedang melakukan hauling.",
        'loading_trucks': lambda r: f"Saat ini terdapat **{r.get('total', r.iloc[0])} unit truk** yang sedang loading.",
        'largest_truck': lambda r: f"Truk dengan kapasitas terbesar adalah **{r.get('code', '')} ({r.get('name', '')})** dengan kapasitas **{r.get('capacity', 0):.1f} ton**, brand **{r.get('brand', '')}** model **{r.get('model', '')}**.",
        'smallest_truck': lambda r: f"Truk dengan kapasitas terkecil adalah **{r.get('code', '')} ({r.get('name', '')})** dengan kapasitas **{r.get('capacity', 0):.1f} ton**, brand **{r.get('brand', '')}** model **{r.get('model', '')}**.",
        'avg_truck_capacity': lambda r: f"Rata-rata kapasitas truk adalah **{r.get('avg_capacity', 0):.2f} ton** (Max: {r.get('max_capacity', 0):.1f} ton, Min: {r.get('min_capacity', 0):.1f} ton).",
        'avg_excavator_bucket': lambda r: f"Rata-rata kapasitas bucket excavator adalah **{r.get('avg_bucket', 0):.2f} m³** (Max: {r.get('max_bucket', 0):.1f} m³, Min: {r.get('min_bucket', 0):.1f} m³).",
        'avg_hauling_cycle': lambda r: f"Rata-rata siklus hauling: **{r.get('avg_cycle', 0) or 0:.1f} menit**, Rata-rata muatan: **{r.get('avg_load', 0) or 0:.1f} ton**, Rata-rata jarak: **{r.get('avg_distance', 0) or 0:.1f} km**.",
        'production_summary': lambda r: f"Total produksi tercatat: **{r.get('total_production', 0) or 0:,.0f} ton** dengan rata-rata achievement **{r.get('avg_achievement', 0) or 0:.1f}%**.",
        'fuel_consumption': lambda r: f"Total konsumsi BBM: **{r.get('total_liters', 0) or 0:,.0f} liter** dengan total biaya **Rp {r.get('total_cost', 0) or 0:,.0f}**.",
        'largest_excavator': lambda r: f"Excavator dengan bucket terbesar adalah **{r.get('code', 'N/A')} ({r.get('name', 'N/A')})** dengan kapasitas bucket **{r.get('bucketCapacity', 0) or 0:.1f} m³**, brand **{r.get('brand', 'N/A') or 'N/A'}** model **{r.get('model', 'N/A') or 'N/A'}**.",
        'smallest_excavator': lambda r: f"Excavator dengan bucket terkecil adalah **{r.get('code', 'N/A')} ({r.get('name', 'N/A')})** dengan kapasitas bucket **{r.get('bucketCapacity', 0) or 0:.1f} m³**, brand **{r.get('brand', 'N/A') or 'N/A'}** model **{r.get('model', 'N/A') or 'N/A'}**.",
        'largest_vessel': lambda r: f"Kapal dengan kapasitas terbesar adalah **{r.get('code', 'N/A')} ({r.get('name', 'N/A')})** dengan kapasitas **{r.get('capacity', 0) or 0:,.0f} ton**, DWT: **{r.get('dwt', 0) or 0:,.0f}**, tipe: **{r.get('vesselType', 'N/A') or 'N/A'}**.",
        'smallest_vessel': lambda r: f"Kapal dengan kapasitas terkecil adalah **{r.get('code', 'N/A')} ({r.get('name', 'N/A')})** dengan kapasitas **{r.get('capacity', 0) or 0:,.0f} ton**, DWT: **{r.get('dwt', 0) or 0:,.0f}**, tipe: **{r.get('vesselType', 'N/A') or 'N/A'}**.",
    }
    
    if query_type in formatters:
        try:
            return formatters[query_type](row)
        except Exception:
            pass
    
    if query_type == 'truck_status':
        lines = ["**Status Truk Saat Ini:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['status']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'excavator_status':
        lines = ["**Status Excavator Saat Ini:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['status']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'vessel_status':
        lines = ["**Status Vessel Saat Ini:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['status']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'truck_brands':
        lines = ["**Distribusi Brand Truk:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['brand']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'excavator_brands':
        lines = ["**Distribusi Brand Excavator:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['brand']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'mining_sites':
        lines = ["**Daftar Mining Site Aktif:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['code']}: **{r['name']}** (Tipe: {r.get('siteType', 'N/A')})")
        return "\n".join(lines)
    
    if query_type == 'recent_hauling':
        lines = ["**10 Aktivitas Hauling Terakhir:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r.get('activityNumber', 'N/A')}: Truk {r.get('truck_code', 'N/A')}, Muatan {r.get('loadWeight', 0):.1f} ton, Siklus {r.get('totalCycleTime', 0):.0f} menit ({r.get('status', 'N/A')})")
        return "\n".join(lines)
    
    if query_type == 'daily_production':
        lines = ["**Produksi 7 Hari Terakhir:**"]
        for _, r in df.iterrows():
            date_str = str(r.get('recordDate', ''))[:10]
            lines.append(f"- {date_str}: **{r.get('production', 0):,.0f} ton** (Achievement: {r.get('achievement', 0):.1f}%)")
        return "\n".join(lines)
    
    if query_type == 'weather':
        return f"**Cuaca Terkini:** {row.get('condition', 'N/A')}, Suhu: {row.get('temperature', 'N/A')}°C, Kelembaban: {row.get('humidity', 'N/A')}%, Curah Hujan: {row.get('rainfall', 0)} mm, Risk Level: {row.get('riskLevel', 'N/A')}"
    
    if query_type == 'recent_incidents':
        lines = ["**5 Insiden Terakhir:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r.get('incidentNumber', 'N/A')}: {r.get('incidentType', 'N/A')} (Severity: {r.get('severity', 'N/A')}, Tanggal: {str(r.get('incidentDate', ''))[:10]})")
        return "\n".join(lines)
    
    if query_type == 'schedules':
        lines = ["**Jadwal Pelayaran Aktif:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r.get('scheduleNumber', 'N/A')}: Status {r.get('status', 'N/A')}, Qty: {r.get('plannedQuantity', 0):,.0f} ton")
        return "\n".join(lines)
    
    if query_type == 'operator_shifts':
        lines = ["**Distribusi Operator per Shift:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['shift']}: **{r['count']} operator**")
        return "\n".join(lines)
    
    if query_type == 'delay_categories':
        lines = ["**Kategori Delay:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['category']}: **{r['count']} jenis**")
        return "\n".join(lines)
    
    if query_type == 'road_conditions':
        lines = ["**Kondisi Jalan:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['condition']}: **{r['count']} segment**")
        return "\n".join(lines)
    
    if query_type == 'top_trucks_hours':
        lines = ["**Top 10 Truk Berdasarkan Jam Operasi:**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('code', 'N/A')} ({r.get('name', 'N/A')}): **{r.get('totalHours', 0):,.0f} jam**")
        return "\n".join(lines)
    
    if query_type == 'top_trucks_distance':
        lines = ["**Top 10 Truk Berdasarkan Jarak Tempuh:**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('code', 'N/A')} ({r.get('name', 'N/A')}): **{r.get('totalDistance', 0):,.0f} km**")
        return "\n".join(lines)
    
    if query_type == 'largest_excavator':
        return f"Excavator dengan bucket terbesar adalah **{row.get('code', '')} ({row.get('name', '')})** dengan bucket **{row.get('bucketCapacity', 0):.1f} m³**, brand **{row.get('brand', '')}** model **{row.get('model', '')}**."
    
    if query_type == 'smallest_excavator':
        return f"Excavator dengan bucket terkecil adalah **{row.get('code', '')} ({row.get('name', '')})** dengan bucket **{row.get('bucketCapacity', 0):.1f} m³**, brand **{row.get('brand', '')}** model **{row.get('model', '')}**."
    
    if query_type == 'largest_vessel':
        return f"Kapal dengan kapasitas terbesar adalah **{row.get('code', '')} ({row.get('name', '')})** dengan kapasitas **{row.get('capacity', 0):,.0f} ton**, DWT **{row.get('dwt', 0):,.0f} ton**, tipe **{row.get('vesselType', '')}**."
    
    if query_type == 'smallest_vessel':
        return f"Kapal dengan kapasitas terkecil adalah **{row.get('code', '')} ({row.get('name', '')})** dengan kapasitas **{row.get('capacity', 0):,.0f} ton**, DWT **{row.get('dwt', 0):,.0f} ton**, tipe **{row.get('vesselType', '')}**."
    
    if query_type == 'production_today':
        return f"Produksi hari ini: **{row.get('total', 0):,.0f} ton** dengan rata-rata achievement **{row.get('avg_achievement', 0):.1f}%**."
    
    if query_type == 'production_this_month':
        return f"Produksi bulan ini: **{row.get('total', 0):,.0f} ton** dengan rata-rata achievement **{row.get('avg_achievement', 0):.1f}%**."
    
    if query_type == 'production_by_site':
        lines = ["**Produksi per Mining Site:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r.get('site_name', 'N/A')}: **{r.get('total_production', 0):,.0f} ton** (Achievement: {r.get('avg_achievement', 0):.1f}%)")
        return "\n".join(lines)
    
    if query_type == 'production_vs_target':
        lines = ["**Target vs Aktual Produksi (7 Hari Terakhir):**"]
        for _, r in df.iterrows():
            date_str = str(r.get('recordDate', ''))[:10]
            lines.append(f"- {date_str}: Target **{r.get('targetProduction', 0):,.0f}** vs Aktual **{r.get('actualProduction', 0):,.0f}** (Achievement: {r.get('achievement', 0):.1f}%)")
        return "\n".join(lines)
    
    if query_type == 'hauling_delayed':
        return f"Total hauling yang mengalami delay: **{row.get('total', 0):,} trip**."
    
    if query_type == 'hauling_completed':
        return f"Total hauling yang selesai (COMPLETED): **{row.get('total', 0):,} trip**."
    
    if query_type == 'hauling_in_progress':
        return f"Total hauling yang sedang berjalan: **{row.get('total', 0):,} trip**."
    
    if query_type == 'hauling_by_shift':
        lines = ["**Statistik Hauling per Shift:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['shift']}: **{r.get('total_trips', 0):,} trip**, Avg Load: {r.get('avg_load', 0):.1f} ton, Avg Cycle: {r.get('avg_cycle', 0):.0f} menit")
        return "\n".join(lines)
    
    if query_type == 'hauling_performance':
        lines = ["**Performa Hauling 7 Hari Terakhir:**"]
        for _, r in df.iterrows():
            date_str = str(r.get('date', ''))[:10]
            lines.append(f"- {date_str}: **{r.get('trips', 0):,} trip**, Total: {r.get('total_hauled', 0):,.0f} ton, Avg Load: {r.get('avg_load', 0):.1f} ton")
        return "\n".join(lines)
    
    if query_type == 'weather_history':
        lines = ["**Riwayat Cuaca 7 Hari Terakhir:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['condition']}: **{r['count']} kejadian**")
        return "\n".join(lines)
    
    if query_type == 'incidents_by_type':
        lines = ["**Insiden per Tipe:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['incidentType']}: **{r['count']} kejadian**")
        return "\n".join(lines)
    
    if query_type == 'incidents_by_severity':
        lines = ["**Insiden per Severity:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['severity']}: **{r['count']} kejadian**")
        return "\n".join(lines)
    
    if query_type == 'incidents_this_month':
        return f"Total insiden bulan ini: **{row.get('total', 0)} kejadian**."
    
    if query_type == 'maintenance_by_type':
        lines = ["**Maintenance per Tipe:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['maintenanceType']}: **{r['count']} job**")
        return "\n".join(lines)
    
    if query_type == 'maintenance_pending':
        return f"Total maintenance yang pending/scheduled: **{row.get('total', 0)} job**."
    
    if query_type == 'maintenance_completed_month':
        return f"Total maintenance selesai bulan ini: **{row.get('total', 0)} job**."
    
    if query_type == 'fuel_this_month':
        return f"Konsumsi BBM bulan ini: **{row.get('total_liters', 0):,.0f} liter** dengan total biaya **Rp {row.get('total_cost', 0):,.0f}**."
    
    if query_type == 'fuel_by_equipment':
        lines = ["**Konsumsi BBM per Tipe Equipment:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['equipment_type']}: **{r.get('total_liters', 0):,.0f} liter** (Rp {r.get('total_cost', 0):,.0f})")
        return "\n".join(lines)
    
    if query_type == 'vessels_by_type':
        lines = ["**Kapal per Tipe:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['vesselType']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'vessels_loading':
        lines = ["**Kapal Sedang Loading:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['code']}: {r['name']} (Kapasitas: {r.get('capacity', 0):,.0f} ton)")
        return "\n".join(lines)
    
    if query_type == 'schedules_this_month':
        return f"Total jadwal pelayaran bulan ini: **{row.get('total', 0)} jadwal**."
    
    if query_type == 'shipments_this_month':
        return f"Pengiriman bulan ini: **{row.get('total_shipments', 0)} shipment** dengan total quantity **{row.get('total_quantity', 0):,.0f} ton**."
    
    if query_type == 'support_equipment_count':
        lines = ["**Support Equipment per Tipe:**"]
        for _, r in df.iterrows():
            lines.append(f"- {r['equipmentType']}: **{r['count']} unit**")
        return "\n".join(lines)
    
    if query_type == 'queue_avg_wait':
        return f"Rata-rata waktu tunggu antrian: **{row.get('avg_wait_minutes', 0):.1f} menit**."
    
    if query_type == 'loading_points_with_excavator':
        lines = ["**Loading Point dan Excavator:**"]
        for _, r in df.iterrows():
            exc = r.get('excavator_code', 'N/A') or 'Tidak ada'
            lines.append(f"- {r['code']}: {r['name']} → Excavator: {exc}")
        return "\n".join(lines)
    
    if query_type == 'top_operators_hours':
        lines = ["**Top 10 Operator Berdasarkan Jam Kerja:**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('employeeNumber', 'N/A')}: **{r.get('totalHours', 0):,.0f} jam** (Rating: {r.get('rating', 0):.1f}, Shift: {r.get('shift', 'N/A')})")
        return "\n".join(lines)
    
    if query_type == 'top_operators_rating':
        lines = ["**Top 10 Operator Berdasarkan Rating:**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('employeeNumber', 'N/A')}: **Rating {r.get('rating', 0):.1f}** ({r.get('totalHours', 0):,.0f} jam, Shift: {r.get('shift', 'N/A')})")
        return "\n".join(lines)
    
    if query_type == 'delay_analysis':
        lines = ["**Analisis Penyebab Delay (Top 10):**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. [{r.get('category', 'N/A')}] {r.get('name', 'N/A')}: **{r.get('occurrences', 0)} kejadian**")
        return "\n".join(lines)
    
    if query_type == 'efficiency_summary':
        return f"Ringkasan Efisiensi: Load Efficiency **{row.get('avg_load_efficiency', 0):.1f}%**, Utilization Rate **{row.get('avg_utilization', 0):.1f}%**."
    
    if query_type == 'downtime_summary':
        return f"Ringkasan Downtime (7 hari): Total **{row.get('total_downtime', 0):.1f} jam**, Rata-rata **{row.get('avg_downtime', 0):.1f} jam/hari**."
    
    if query_type == 'cost_summary_maintenance':
        return f"Biaya Maintenance (30 hari): Total **Rp {row.get('total_cost', 0):,.0f}** dari **{row.get('total_jobs', 0)} job**."
    
    if query_type == 'cost_summary_fuel':
        return f"Biaya BBM (30 hari): Total **Rp {row.get('total_cost', 0):,.0f}** untuk **{row.get('total_liters', 0):,.0f} liter**."
    
    if query_type == 'fleet_summary':
        return f"**Ringkasan Armada:** Truk: **{row.get('total_trucks', 0)} unit**, Excavator: **{row.get('total_excavators', 0)} unit**, Vessel: **{row.get('total_vessels', 0)} unit**, Operator: **{row.get('total_operators', 0)} orang**."
    
    if query_type == 'top_hauling_trucks':
        lines = ["**Top 10 Truk Hauling (7 Hari Terakhir):**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('code', 'N/A')} ({r.get('name', 'N/A')}): **{r.get('total_trips', 0)} trip**, Total: {r.get('total_hauled', 0):,.0f} ton")
        return "\n".join(lines)
    
    if query_type == 'top_hauling_excavators':
        lines = ["**Top 10 Excavator Loading (7 Hari Terakhir):**"]
        for idx, r in df.iterrows():
            lines.append(f"{idx+1}. {r.get('code', 'N/A')} ({r.get('name', 'N/A')}): **{r.get('total_trips', 0)} trip**, Total: {r.get('total_loaded', 0):,.0f} ton")
        return "\n".join(lines)
    
    if query_type == 'truck_details_all':
        lines = [f"**Daftar Truk Aktif ({len(df)} unit):**"]
        for _, r in df.head(15).iterrows():
            lines.append(f"- {r['code']}: {r['name']} | {r.get('brand', 'N/A')} {r.get('model', '')} | {r.get('capacity', 0):.0f}t | {r['status']}")
        if len(df) > 15:
            lines.append(f"... dan {len(df)-15} truk lainnya")
        return "\n".join(lines)
    
    if query_type == 'excavator_details_all':
        lines = [f"**Daftar Excavator Aktif ({len(df)} unit):**"]
        for _, r in df.head(15).iterrows():
            lines.append(f"- {r['code']}: {r['name']} | {r.get('brand', 'N/A')} | Bucket: {r.get('bucketCapacity', 0):.1f}m³ | {r['status']}")
        if len(df) > 15:
            lines.append(f"... dan {len(df)-15} excavator lainnya")
        return "\n".join(lines)
    
    if query_type == 'operator_details_all':
        lines = [f"**Daftar Operator ({len(df)} orang):**"]
        for _, r in df.head(15).iterrows():
            lines.append(f"- {r['employeeNumber']}: {r.get('licenseType', 'N/A')} | {r['status']} | {r.get('shift', 'N/A')} | Rating: {r.get('rating', 0):.1f}")
        if len(df) > 15:
            lines.append(f"... dan {len(df)-15} operator lainnya")
        return "\n".join(lines)
    
    return f"Data ditemukan: {len(df)} baris."

def get_predefined_query(question):
    question_lower = question.lower()
    
    fast_query, _ = get_fast_answer(question)
    if fast_query:
        return fast_query
    
    smart_query = smart_query_builder(question)
    if smart_query:
        return smart_query
    
    return None

def generate_sql_query(user_question):
    predefined = get_predefined_query(user_question)
    if predefined:
        return predefined
    
    prompt = f"""You are an expert PostgreSQL query generator for a mining operations database.

{FULL_DATABASE_SCHEMA}

QUERY EXAMPLES:
{json.dumps(QUERY_EXAMPLES, indent=2)}

USER QUESTION: {user_question}

TASK: Generate a valid PostgreSQL SELECT query to answer the user's question.

CRITICAL RULES:
1. Output ONLY the raw SQL query - no explanations, no markdown, no code blocks
2. Use double quotes for camelCase columns: "isActive", "loadWeight", "createdAt", "totalCycleTime", "bucketCapacity"
3. Use single quotes for string/enum values: 'IDLE', 'ACTIVE', 'COMPLETED', 'SHIFT_1'
4. For "largest/biggest/most/terbesar" use ORDER BY ... DESC LIMIT 1
5. For "smallest/least/terkecil" use ORDER BY ... ASC LIMIT 1
6. For "how many/count/total/berapa/jumlah" use SELECT COUNT(*) as total
7. For "available/idle trucks" use: status = 'IDLE' AND "isActive" = true
8. For "operating excavators" use: status IN ('ACTIVE', 'IDLE') AND "isActive" = true
9. Boolean values are lowercase: true, false (no quotes)
10. Always include relevant columns in SELECT for clarity
11. Use COALESCE for SUM/AVG to handle NULLs: COALESCE(SUM(...), 0)
12. For date ranges: WHERE "recordDate" >= CURRENT_DATE - INTERVAL '7 days'
13. For JOINs, always use quoted foreign keys: JOIN trucks t ON h."truckId" = t.id
14. LIMIT results to reasonable numbers (10-50 for lists)

COMMON QUERY PATTERNS:
- Truk kapasitas terbesar: SELECT code, name, brand, model, capacity FROM trucks WHERE "isActive" = true ORDER BY capacity DESC LIMIT 1
- Jumlah truk aktif: SELECT COUNT(*) as total FROM trucks WHERE "isActive" = true
- Hauling terbaru: SELECT h.*, t.code as truck_code FROM hauling_activities h JOIN trucks t ON h."truckId" = t.id ORDER BY h."createdAt" DESC LIMIT 10
- Produksi per site: SELECT ms.name, SUM(pr."actualProduction") as total FROM production_records pr JOIN mining_sites ms ON pr."miningSiteId" = ms.id GROUP BY ms.name
- Status summary: SELECT status, COUNT(*) as count FROM trucks WHERE "isActive" = true GROUP BY status

SQL Query:"""
    
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'system', 'content': 'You are a PostgreSQL expert for mining operations. Output ONLY the raw SQL query without any formatting, explanation, or code blocks. Just the pure SQL SELECT statement. Always use double quotes for camelCase columns.'},
            {'role': 'user', 'content': prompt}
        ])
        sql = response['message']['content'].strip()
        
        sql = re.sub(r'```sql\s*', '', sql, flags=re.IGNORECASE)
        sql = re.sub(r'```\s*', '', sql)
        sql = re.sub(r'^SQL:\s*', '', sql, flags=re.IGNORECASE)
        sql = sql.strip()
        
        lines = sql.split('\n')
        clean_lines = []
        for line in lines:
            line = line.strip()
            if line and not line.startswith('--') and not line.lower().startswith('here') and not line.lower().startswith('this'):
                clean_lines.append(line)
        sql = ' '.join(clean_lines)
        
        if not sql.upper().startswith('SELECT'):
            select_match = re.search(r'(SELECT\s+.+)', sql, re.IGNORECASE | re.DOTALL)
            if select_match:
                sql = select_match.group(1)
        
        return sql
    except Exception as e:
        print(f"Error generating SQL: {e}")
        return None

def format_currency(amount):
    """Format number as Indonesian Rupiah"""
    if amount >= 1_000_000_000:
        return f"Rp {amount/1_000_000_000:.2f} Miliar"
    elif amount >= 1_000_000:
        return f"Rp {amount/1_000_000:.2f} Juta"
    elif amount >= 1000:
        return f"Rp {amount/1000:.1f} Ribu"
    return f"Rp {amount:,.0f}"

def format_time(hours):
    """Format hours into human readable time"""
    if hours < 1:
        return f"{int(hours * 60)} menit"
    elif hours < 24:
        h = int(hours)
        m = int((hours - h) * 60)
        if m > 0:
            return f"{h} jam {m} menit"
        return f"{h} jam"
    else:
        days = int(hours / 24)
        remaining_hours = int(hours % 24)
        if remaining_hours > 0:
            return f"{days} hari {remaining_hours} jam"
        return f"{days} hari"

def generate_simulation_response(params, sim_result):
    """Generate a detailed natural language response for simulation results"""
    
    response = f"""## 📊 Hasil Simulasi Produksi

### Input Parameter:
- **Jumlah Truk:** {params.get('num_trucks', sim_result['input']['num_trucks'])} unit
- **Target Produksi:** {sim_result['input']['target_tons']:,.0f} ton
- **Jarak Hauling:** {sim_result['input']['distance_km']:.1f} km (satu arah)
- **Kapasitas Truk:** {sim_result['input']['truck_capacity']:.1f} ton

### ⏱️ Estimasi Waktu:
- **Waktu Siklus per Trip:** {sim_result['time']['cycle_time_minutes']:.0f} menit
- **Total Waktu Operasi:** {format_time(sim_result['time']['total_time_hours'])}
- **Shift Dibutuhkan:** {sim_result['time']['shifts_needed']} shift

### 🚛 Detail Produksi:
- **Total Trip:** {sim_result['production']['total_trips']:,} trip
- **Trip per Truk:** {sim_result['production']['trips_per_truck']:,} trip
- **Muatan per Trip:** {sim_result['production']['load_per_trip']:.1f} ton
- **Produksi Aktual:** {sim_result['production']['actual_production']:,.0f} ton
- **Efisiensi:** {sim_result['production']['efficiency']:.1f}%

### ⛽ Konsumsi Sumber Daya:
- **Total Jarak Tempuh:** {sim_result['resources']['total_distance_km']:,.1f} km
- **BBM Terpakai:** {sim_result['resources']['fuel_consumed_liters']:,.0f} liter

### 💰 Analisis Finansial:
| Komponen | Nilai |
|----------|-------|
| Biaya BBM | {format_currency(sim_result['financials']['fuel_cost'])} |
| Biaya Operator | {format_currency(sim_result['financials']['operator_cost'])} |
| Biaya Maintenance | {format_currency(sim_result['financials']['maintenance_cost'])} |
| Biaya Overhead | {format_currency(sim_result['financials']['overhead_cost'])} |
| **Total Biaya** | **{format_currency(sim_result['financials']['total_cost'])}** |
| **Pendapatan** | **{format_currency(sim_result['financials']['revenue'])}** |
| **PROFIT** | **{format_currency(sim_result['financials']['profit'])}** |
| **Margin Profit** | **{sim_result['financials']['profit_margin_percent']:.1f}%** |

### 📈 Kesimpulan:
"""
    
    profit = sim_result['financials']['profit']
    margin = sim_result['financials']['profit_margin_percent']
    time_hours = sim_result['time']['total_time_hours']
    
    if profit > 0 and margin > 30:
        response += f"Simulasi ini menunjukkan **hasil yang sangat menguntungkan** dengan margin profit {margin:.1f}%. "
    elif profit > 0 and margin > 15:
        response += f"Simulasi ini menunjukkan **hasil yang baik** dengan margin profit {margin:.1f}%. "
    elif profit > 0:
        response += f"Simulasi ini masih menghasilkan **keuntungan tipis** dengan margin {margin:.1f}%. "
    else:
        response += f"⚠️ **Peringatan:** Simulasi ini menunjukkan **potensi kerugian**. Pertimbangkan untuk menambah jumlah truk atau mengurangi jarak. "
    
    if time_hours <= 8:
        response += f"Target dapat dicapai dalam **satu shift** ({format_time(time_hours)})."
    elif time_hours <= 24:
        response += f"Target membutuhkan **{sim_result['time']['shifts_needed']} shift** untuk diselesaikan."
    else:
        response += f"Target membutuhkan waktu **{format_time(time_hours)}** - pertimbangkan penambahan armada."
    
    return response

def handle_simulation_question(user_question):
    """Handle simulation/what-if questions"""
    params = parse_simulation_parameters(user_question)
    
    # Default values if not parsed
    if 'num_trucks' not in params:
        params['num_trucks'] = 5
    if 'target_tons' not in params:
        params['target_tons'] = 500
    
    # Run simulation
    sim_result = calculate_production_simulation(
        num_trucks=params['num_trucks'],
        target_tons=params['target_tons'],
        distance_km=params.get('distance_km'),
        truck_capacity=params.get('truck_capacity')
    )
    
    # Generate response
    response = generate_simulation_response(params, sim_result)
    
    return {
        "type": "simulation",
        "params": params,
        "result": sim_result,
        "response": response
    }

def execute_and_summarize_stream(user_question):
    yield json.dumps({"type": "step", "status": "thinking", "message": "Menganalisis pertanyaan..."}) + "\n"
    
    question_type = detect_question_type(user_question)
    
    if question_type == 'simulation':
        yield json.dumps({"type": "step", "status": "simulation_mode", "message": "Mendeteksi pertanyaan simulasi..."}) + "\n"
        
        params = parse_simulation_parameters(user_question)
        
        if 'num_trucks' not in params and 'target_tons' not in params:
            yield json.dumps({"type": "step", "status": "parsing", "message": "Mengekstrak parameter dari pertanyaan..."}) + "\n"
            
            extract_prompt = f"""Extract simulation parameters from this question:
"{user_question}"

Return JSON only:
{{"num_trucks": <number or null>, "target_tons": <number or null>, "distance_km": <number or null>, "site": "<string or null>"}}

JSON:"""
            
            try:
                extract_response = ollama.chat(model=MODEL_NAME, messages=[
                    {'role': 'system', 'content': 'Extract parameters and return only valid JSON.'},
                    {'role': 'user', 'content': extract_prompt}
                ])
                extracted = extract_response['message']['content'].strip()
                json_match = re.search(r'\{[^}]+\}', extracted)
                if json_match:
                    parsed = json.loads(json_match.group())
                    if parsed.get('num_trucks'):
                        params['num_trucks'] = int(parsed['num_trucks'])
                    if parsed.get('target_tons'):
                        params['target_tons'] = float(parsed['target_tons'])
                    if parsed.get('distance_km'):
                        params['distance_km'] = float(parsed['distance_km'])
            except:
                pass
        
        if 'num_trucks' not in params:
            params['num_trucks'] = 5
        if 'target_tons' not in params:
            params['target_tons'] = 500
        
        yield json.dumps({
            "type": "step", 
            "status": "calculating", 
            "message": f"Menghitung simulasi: {params.get('num_trucks')} truk, {params.get('target_tons')} ton target..."
        }) + "\n"
        
        sim_result = calculate_production_simulation(
            num_trucks=params['num_trucks'],
            target_tons=params['target_tons'],
            distance_km=params.get('distance_km'),
            truck_capacity=params.get('truck_capacity')
        )
        
        yield json.dumps({
            "type": "simulation_result",
            "params": params,
            "result": sim_result
        }) + "\n"
        
        response = generate_simulation_response(params, sim_result)
        
        yield json.dumps({"type": "answer", "content": response}) + "\n"
        yield json.dumps({"type": "step", "status": "completed", "message": "Simulasi selesai"}) + "\n"
        return
    
    fast_query, query_type = get_fast_answer(user_question)
    if fast_query:
        yield json.dumps({"type": "step", "status": "fast_path", "message": "Menggunakan fast-path untuk query sederhana"}) + "\n"
        yield json.dumps({"type": "sql", "query": fast_query}) + "\n"
        
        try:
            cache_key = get_cache_key(fast_query)
            cached = get_cached_result(cache_key)
            if cached is not None:
                yield json.dumps({"type": "step", "status": "cached", "message": "Data dari cache"}) + "\n"
                df = cached
            else:
                df = fetch_dataframe(fast_query)
                set_cached_result(cache_key, df)
            
            answer = format_fast_answer(query_type, df, user_question)
            yield json.dumps({"type": "answer", "content": answer}) + "\n"
            yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
            return
        except Exception as e:
            yield json.dumps({"type": "step", "status": "fallback", "message": f"Fast-path gagal: {str(e)}, mencoba metode standar..."}) + "\n"
    
    yield json.dumps({"type": "step", "status": "thinking", "message": "Menyusun query ke database"}) + "\n"
    sql_query = generate_sql_query(user_question)
    
    if not sql_query:
        yield json.dumps({"type": "error", "message": "Gagal membuat query SQL"}) + "\n"
        yield json.dumps({"type": "answer", "content": "Maaf, saya tidak dapat memahami pertanyaan Anda. Silakan coba dengan pertanyaan yang lebih spesifik."}) + "\n"
        return

    yield json.dumps({"type": "step", "status": "generated_sql", "message": "Berhasil membuat query ke database", "detail": sql_query}) + "\n"
    yield json.dumps({"type": "sql", "query": sql_query}) + "\n"

    if not sql_query.upper().strip().startswith("SELECT"):
        yield json.dumps({"type": "error", "message": "Query ditolak (Bukan SELECT)"}) + "\n"
        yield json.dumps({"type": "answer", "content": "Maaf, query yang dihasilkan tidak valid. Silakan coba pertanyaan lain."}) + "\n"
        return

    yield json.dumps({"type": "step", "status": "executing", "message": "Mencari data di database..."}) + "\n"
    
    max_retries = 2
    last_error = None
    df = None
    
    for attempt in range(max_retries):
        try:
            df = fetch_dataframe(sql_query)
            break
        except Exception as e:
            last_error = str(e)
            if attempt == 0 and ("column" in last_error.lower() or "relation" in last_error.lower() or "syntax" in last_error.lower()):
                yield json.dumps({"type": "step", "status": "retrying", "message": "Query error, mencoba perbaikan..."}) + "\n"
                
                fix_prompt = f"""The following SQL query failed with error: {last_error}

Original query: {sql_query}

Fix the query to work with PostgreSQL. Common fixes:
- Use double quotes for camelCase columns: "isActive", "createdAt"
- Check table/column names exist
- Use correct enum values

Output ONLY the corrected SQL query:"""
                
                try:
                    fix_response = ollama.chat(model=MODEL_NAME, messages=[
                        {'role': 'system', 'content': 'Fix the SQL query. Output only the corrected query.'},
                        {'role': 'user', 'content': fix_prompt}
                    ])
                    fixed_sql = fix_response['message']['content'].strip()
                    fixed_sql = re.sub(r'```sql\s*', '', fixed_sql, flags=re.IGNORECASE)
                    fixed_sql = re.sub(r'```\s*', '', fixed_sql)
                    fixed_sql = fixed_sql.strip()
                    
                    if fixed_sql.upper().startswith('SELECT'):
                        sql_query = fixed_sql
                        yield json.dumps({"type": "step", "status": "fixed_sql", "message": "Query diperbaiki", "detail": sql_query}) + "\n"
                except:
                    pass
            else:
                break
    
    if df is None:
        yield json.dumps({"type": "step", "status": "error", "message": f"Database error: {last_error}"}) + "\n"
        yield json.dumps({"type": "answer", "content": f"Maaf, terjadi kesalahan saat mengakses database. Silakan coba pertanyaan dengan kata-kata berbeda."}) + "\n"
        return
        
    if df.empty:
        yield json.dumps({"type": "step", "status": "empty_result", "message": "Data tidak ditemukan"}) + "\n"
        yield json.dumps({"type": "answer", "content": "Query berhasil dijalankan namun tidak ada data yang ditemukan untuk kriteria tersebut."}) + "\n"
        return
        
    yield json.dumps({"type": "step", "status": "data_found", "message": f"Data ditemukan ({len(df)} baris), memuat jawaban.."}) + "\n"
    
    if len(df) > 50:
        df = df.head(50)
        
    data_str = df.to_string(max_rows=50, max_cols=15)
    
    # Enhanced summary prompt with mining context
    summary_prompt = f"""Anda adalah Asisten AI Operasi Pertambangan yang profesional dan berpengetahuan luas.

PERTANYAAN USER: {user_question}

DATA DARI DATABASE:
{data_str}

KONTEKS OPERASI TAMBANG:
- Rata-rata kapasitas truk: {MINING_KNOWLEDGE['fleet']['avg_truck_capacity']} ton
- Rata-rata waktu siklus hauling: {MINING_KNOWLEDGE['hauling']['avg_cycle_time']} menit
- Target produksi harian: {MINING_KNOWLEDGE['production']['avg_daily_target']} ton
- Harga batubara: Rp {MINING_KNOWLEDGE['revenue']['coal_price_per_ton']:,}/ton

INSTRUKSI:
1. Jawab pertanyaan user berdasarkan data di atas dengan jelas, detail, dan profesional
2. Jika data menunjukkan hasil spesifik (nama, kode, angka), sebutkan dengan jelas
3. Gunakan Bahasa Indonesia yang profesional dan teknis
4. Jangan mengarang informasi yang tidak ada di data
5. Jika diminta "terbesar/terkecil/tertinggi", identifikasi dengan tepat dari data
6. Format angka dengan satuan yang sesuai (ton, km, liter, dll)
7. Berikan insight atau rekomendasi jika relevan
8. Jika ada data performa, bandingkan dengan rata-rata industri

JAWABAN:"""
    
    yield json.dumps({"type": "step", "status": "summarizing", "message": "Menyusun jawaban..."}) + "\n"
    
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'system', 'content': 'Anda adalah asisten pertambangan profesional. Jawab berdasarkan data yang diberikan saja, dalam Bahasa Indonesia dengan gaya yang informatif dan helpful.'},
            {'role': 'user', 'content': summary_prompt}
        ])
        
        answer = response['message']['content'].strip()
        
        if not answer:
            answer = "Data berhasil ditemukan, namun saya mengalami kesulitan menyusun jawaban. Silakan lihat data mentah di atas."
        
        yield json.dumps({"type": "answer", "content": answer}) + "\n"
        yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
        
    except Exception as e:
        yield json.dumps({"type": "step", "status": "error", "message": f"Error summarizing: {str(e)}"}) + "\n"
        
        simple_answer = f"Data ditemukan ({len(df)} baris). "
        if len(df) == 1:
            row = df.iloc[0]
            cols = df.columns.tolist()
            details = []
            for col in cols[:5]:
                val = row[col]
                if pd.notna(val):
                    details.append(f"{col}: {val}")
            simple_answer += ", ".join(details)
        else:
            simple_answer += f"Terdapat {len(df)} data yang sesuai dengan kriteria pencarian."
        
        yield json.dumps({"type": "answer", "content": simple_answer}) + "\n"
        yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"

def execute_and_summarize(user_question):
    # Legacy wrapper for non-streaming calls if any
    steps = []
    answer = ""
    sql_query = None
    
    for chunk in execute_and_summarize_stream(user_question):
        data = json.loads(chunk)
        if data['type'] == 'step':
            steps.append({"status": data['status'], "message": data['message'], "detail": data.get('detail')})
        elif data['type'] == 'sql':
            sql_query = data['query']
        elif data['type'] == 'answer':
            answer = data['content']
            
    return {
        "answer": answer,
        "steps": steps,
        "sql_query": sql_query
    }
