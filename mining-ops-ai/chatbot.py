import ollama
import pandas as pd
from database import fetch_dataframe
import json
import os
import re
import math
from datetime import datetime, timedelta

MODEL_NAME = "qwen2.5:7b"

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

def get_enhanced_schema():
    schema_info = """
=== DATABASE SCHEMA FOR MINING OPERATIONS ===

TABLE: trucks (Truck fleet data)
COLUMNS: id, code, name, brand, model, yearManufacture, capacity (Float - tons), fuelCapacity, fuelConsumption (L/km), averageSpeed (km/h), maintenanceCost, status (TruckStatus enum), lastMaintenance, nextMaintenance, totalHours, totalDistance, currentOperatorId, currentLocation, isActive (Boolean), purchaseDate, retirementDate, remarks, createdAt, updatedAt
STATUS VALUES: 'IDLE', 'HAULING', 'LOADING', 'DUMPING', 'IN_QUEUE', 'MAINTENANCE', 'BREAKDOWN', 'REFUELING', 'STANDBY', 'OUT_OF_SERVICE'
NOTES: To find active/available trucks use "isActive" = true AND status = 'IDLE'. Capacity is in tons.

TABLE: excavators (Excavator equipment data)
COLUMNS: id, code, name, brand, model, yearManufacture, bucketCapacity, productionRate (tons/min), fuelConsumption (L/hour), maintenanceCost, status (ExcavatorStatus enum), lastMaintenance, nextMaintenance, totalHours, currentLocation, isActive (Boolean), purchaseDate, retirementDate, remarks, createdAt, updatedAt
STATUS VALUES: 'ACTIVE', 'IDLE', 'MAINTENANCE', 'BREAKDOWN', 'STANDBY', 'OUT_OF_SERVICE'
NOTES: To find operating excavators use "isActive" = true AND status IN ('ACTIVE', 'IDLE').

TABLE: operators (Equipment operators)
COLUMNS: id, userId, employeeNumber, licenseNumber, licenseType (LicenseType enum), licenseExpiry, competency (JSON), status (OperatorStatus enum), shift (Shift enum), totalHours, rating (1-5), salary, joinDate, resignDate, createdAt, updatedAt
LICENSE VALUES: 'SIM_A', 'SIM_B1', 'SIM_B2', 'OPERATOR_ALAT_BERAT'
STATUS VALUES: 'ACTIVE', 'ON_LEAVE', 'SICK', 'RESIGNED', 'SUSPENDED'
SHIFT VALUES: 'SHIFT_1', 'SHIFT_2', 'SHIFT_3'

TABLE: users (System users)
COLUMNS: id, username, email, password, fullName, role (Role enum), isActive (Boolean), lastLogin, createdAt, updatedAt
ROLE VALUES: 'ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER', 'MAINTENANCE_STAFF'

TABLE: hauling_activities (Hauling trip records)
COLUMNS: id, activityNumber, truckId, excavatorId, operatorId, supervisorId, loadingPointId, dumpingPointId, roadSegmentId, shift (Shift enum), queueStartTime, queueEndTime, loadingStartTime, loadingEndTime, departureTime, arrivalTime, dumpingStartTime, dumpingEndTime, returnTime, queueDuration, loadingDuration, haulingDuration, dumpingDuration, returnDuration, totalCycleTime, loadWeight, targetWeight, loadEfficiency, distance, fuelConsumed, status (HaulingStatus enum), weatherCondition, roadCondition (RoadCondition enum), isDelayed (Boolean), delayMinutes, delayReasonId, delayReasonDetail, predictedDelayRisk, predictedDelayMinutes, remarks, createdAt, updatedAt
HAULING STATUS VALUES: 'PLANNED', 'IN_QUEUE', 'LOADING', 'HAULING', 'DUMPING', 'RETURNING', 'COMPLETED', 'DELAYED', 'CANCELLED', 'INCIDENT'
ROAD CONDITION VALUES: 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'VERY_POOR', 'IMPASSABLE'

TABLE: production_records (Daily production data)
COLUMNS: id, recordDate, shift (Shift enum), miningSiteId, targetProduction, actualProduction, achievement, avgCalori, avgAshContent, avgSulfur, avgMoisture, totalTrips, totalDistance, totalFuel, avgCycleTime, trucksOperating, trucksBreakdown, excavatorsOperating, excavatorsBreakdown, downtimeHours, utilizationRate, equipmentAllocation (JSON), remarks, createdAt, updatedAt

TABLE: mining_sites (Mining locations)
COLUMNS: id, code, name, siteType (SiteType enum), isActive (Boolean), latitude, longitude, elevation, capacity, description, createdAt, updatedAt
SITE TYPE VALUES: 'PIT', 'STOCKPILE', 'PORT', 'CRUSHER', 'CONVEYOR', 'WORKSHOP', 'OFFICE'

TABLE: loading_points (Coal loading points)
COLUMNS: id, code, name, miningSiteId, excavatorId, latitude, longitude, elevation, coalSeam, coalQuality (JSON), maxCapacity, isActive (Boolean), remarks, createdAt, updatedAt

TABLE: dumping_points (Coal dumping points)
COLUMNS: id, code, name, miningSiteId, latitude, longitude, elevation, dumperType (DumperType enum), currentLevel, maxCapacity, coalQuality (JSON), isActive (Boolean), remarks, createdAt, updatedAt
DUMPER TYPE VALUES: 'STOCKPILE', 'CRUSHER', 'BARGE', 'RECLAIM', 'ROM'

TABLE: road_segments (Haul roads)
COLUMNS: id, code, name, startPoint, endPoint, distance (km), roadType (RoadType enum), condition (RoadCondition enum), gradient, maxSpeed, isActive (Boolean), maintenanceRequired (Boolean), lastMaintenance, remarks, createdAt, updatedAt
ROAD TYPE VALUES: 'MAIN_HAUL', 'SECONDARY', 'ACCESS', 'RAMP', 'CROSSOVER'

TABLE: vessels (Ships and barges)
COLUMNS: id, code, name, vesselType (VesselType enum), gt (Gross Tonnage), dwt (Deadweight Tonnage), loa (Length Overall), capacity (tons), owner, isOwned (Boolean), status (VesselStatus enum), currentLocation, isActive (Boolean), remarks, createdAt, updatedAt
VESSEL TYPE VALUES: 'MOTHER_VESSEL', 'BARGE', 'TUG_BOAT'
VESSEL STATUS VALUES: 'AVAILABLE', 'LOADING', 'SAILING', 'DISCHARGING', 'MAINTENANCE', 'CHARTERED'

TABLE: sailing_schedules (Shipping schedules)
COLUMNS: id, scheduleNumber, vesselId, voyageNumber, loadingPort, destination, etaLoading, etsLoading, etaDestination, ataLoading, loadingStart, loadingComplete, atsLoading, ataDestination, plannedQuantity, actualQuantity, buyer, contractNumber, status (SailingStatus enum), remarks, createdAt, updatedAt
SAILING STATUS VALUES: 'SCHEDULED', 'STANDBY', 'LOADING', 'SAILING', 'ARRIVED', 'DISCHARGING', 'COMPLETED', 'CANCELLED'

TABLE: maintenance_logs (Equipment maintenance records)
COLUMNS: id, maintenanceNumber, truckId, excavatorId, supportEquipmentId, maintenanceType (MaintenanceType enum), scheduledDate, actualDate, completionDate, duration, cost, description, partsReplaced (JSON), mechanicName, status (MaintenanceStatus enum), downtimeHours, remarks, createdAt, updatedAt
MAINTENANCE TYPE VALUES: 'PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'OVERHAUL', 'INSPECTION'
MAINTENANCE STATUS VALUES: 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED'

TABLE: incident_reports (Safety incidents)
COLUMNS: id, incidentNumber, incidentDate, reportDate, location, miningSiteCode, truckId, excavatorId, reportedById, operatorId, incidentType (IncidentType enum), severity (Severity enum), description, rootCause, injuries, fatalities, equipmentDamage, productionLoss, estimatedCost, downtimeHours, status (IncidentStatus enum), actionTaken, preventiveMeasure, photos (JSON), documents (JSON), remarks, createdAt, updatedAt
INCIDENT TYPE VALUES: 'ACCIDENT', 'NEAR_MISS', 'EQUIPMENT_FAILURE', 'SPILL', 'FIRE', 'COLLISION', 'ROLLOVER', 'ENVIRONMENTAL', 'SAFETY_VIOLATION'
SEVERITY VALUES: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

TABLE: fuel_consumptions (Fuel usage records)
COLUMNS: id, consumptionDate, truckId, excavatorId, supportEquipmentId, fuelType (FuelType enum), quantity (liters), costPerLiter, totalCost, operatingHours, distance, fuelEfficiency, fuelStation, remarks, createdAt, updatedAt
FUEL TYPE VALUES: 'SOLAR', 'BENSIN', 'PERTAMAX'

TABLE: weather_logs (Weather conditions)
COLUMNS: id, timestamp, miningSiteId, condition (WeatherCondition enum), temperature, humidity, windSpeed, windDirection, rainfall, visibility (Visibility enum), waveHeight, seaCondition, isOperational (Boolean), riskLevel (RiskLevel enum), remarks
WEATHER CONDITION VALUES: 'CERAH', 'BERAWAN', 'MENDUNG', 'HUJAN_RINGAN', 'HUJAN_SEDANG', 'HUJAN_LEBAT', 'BADAI', 'KABUT'
RISK LEVEL VALUES: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

TABLE: delay_reasons (Delay categories)
COLUMNS: id, code, category (DelayCategory enum), name, description, isActive (Boolean)
DELAY CATEGORY VALUES: 'WEATHER', 'EQUIPMENT', 'QUEUE', 'ROAD', 'OPERATOR', 'FUEL', 'ADMINISTRATIVE', 'SAFETY', 'OTHER'

TABLE: support_equipment (Other equipment like graders, dozers)
COLUMNS: id, code, name, equipmentType (SupportEquipmentType enum), brand, model, status (SupportEquipmentStatus enum), lastMaintenance, totalHours, isActive (Boolean), createdAt, updatedAt
EQUIPMENT TYPE VALUES: 'GRADER', 'WATER_TRUCK', 'FUEL_TRUCK', 'DOZER', 'COMPACTOR', 'LIGHT_VEHICLE'

TABLE: queue_logs (Loading point queue data)
COLUMNS: id, loadingPointId, truckId, queueLength, queueStartTime, queueEndTime, waitingTime, timestamp

TABLE: equipment_status_logs (Equipment status history)
COLUMNS: id, timestamp, truckId, excavatorId, supportEquipmentId, previousStatus, currentStatus, statusReason, location, durationMinutes, remarks

TABLE: barge_loading_logs (Barge loading records)
COLUMNS: id, loadingNumber, vesselCode, vesselName, loadingDate, shift, startTime, endTime, stockpileSource, quantity, loaderUsed, bargeTrips, weatherCondition, tidalCondition, delayMinutes, delayReason, remarks, createdAt, updatedAt

TABLE: jetty_berths (Jetty/port berths)
COLUMNS: id, code, name, portName, maxVesselSize, maxDraft, hasConveyor (Boolean), loadingCapacity, isActive (Boolean), remarks, createdAt, updatedAt

TABLE: berthing_logs (Vessel berthing records)
COLUMNS: id, jettyBerthId, vesselCode, vesselName, arrivalTime, berthingTime, loadingStart, loadingEnd, departureTime, draftArrival, draftDeparture, waitingTime, remarks, createdAt, updatedAt

TABLE: shipment_records (Coal shipment records)
COLUMNS: id, shipmentNumber, vesselId, sailingScheduleId, shipmentDate, loadingDate, coalType, quantity, calorie, totalMoisture, ashContent, sulfurContent, stockpileOrigin, buyer, destination, surveyorName, blNumber, coaNumber, freightCost, totalFreight, remarks, createdAt, updatedAt

TABLE: recommendation_logs (AI recommendation history)
COLUMNS: id, recommendationType, scenario (JSON), recommendations (JSON), selectedStrategy, selectedStrategyId, implementedAt, implementedBy, results (JSON), profitActual, profitPredicted, variance, feedback, createdAt, updatedAt

TABLE: prediction_logs (ML prediction history)
COLUMNS: id, predictionType, inputParameters (JSON), results (JSON), accuracy, executionTime, modelVersion, timestamp, createdAt

TABLE: chatbot_interactions (Chatbot history)
COLUMNS: id, userId, sessionId, userQuestion, aiResponse, context (JSON), responseTime, rating, timestamp, createdAt

=== IMPORTANT QUERY RULES ===
1. All camelCase columns MUST use double quotes: "isActive", "loadWeight", "createdAt", etc.
2. Enum values are case-sensitive strings: 'IDLE' not 'idle', 'ACTIVE' not 'active'
3. Boolean values: true/false (lowercase)
4. For "active" trucks: WHERE "isActive" = true
5. For "available/idle" trucks: WHERE status = 'IDLE' AND "isActive" = true  
6. For count queries: SELECT COUNT(*) FROM table_name
7. For maximum/minimum: ORDER BY column DESC/ASC LIMIT 1
8. Always include relevant columns in SELECT for clarity
9. Date comparisons use standard PostgreSQL syntax
10. JOIN tables using their id fields (e.g., trucks.id = hauling_activities."truckId")
"""
    return schema_info

SCHEMA_CONTEXT = get_enhanced_schema()

PREDEFINED_QUERIES = {
    "idle_trucks_count": """SELECT COUNT(*) as total_idle FROM trucks WHERE status = 'IDLE' AND "isActive" = true""",
    "largest_truck": """SELECT code, name, brand, model, capacity FROM trucks WHERE "isActive" = true ORDER BY capacity DESC LIMIT 1""",
    "active_excavators": """SELECT COUNT(*) as total_active, AVG("bucketCapacity") as avg_bucket FROM excavators WHERE "isActive" = true""",
    "mining_sites": """SELECT code, name, "siteType", latitude, longitude FROM mining_sites WHERE "isActive" = true""",
    "recent_hauling": """SELECT h."activityNumber", h."loadWeight", h."totalCycleTime", h.status, t.code as truck_code FROM hauling_activities h LEFT JOIN trucks t ON h."truckId" = t.id ORDER BY h."createdAt" DESC LIMIT 10""",
    "truck_status_summary": """SELECT status, COUNT(*) as count FROM trucks WHERE "isActive" = true GROUP BY status ORDER BY count DESC""",
    "production_summary": """SELECT SUM("actualProduction") as total_production, AVG(achievement) as avg_achievement FROM production_records""",
}

def get_predefined_query(question):
    question_lower = question.lower()
    
    if 'idle' in question_lower and 'truk' in question_lower:
        if 'kapasitas' in question_lower and ('terbesar' in question_lower or 'maksimum' in question_lower):
            return """SELECT 
                (SELECT COUNT(*) FROM trucks WHERE status = 'IDLE' AND "isActive" = true) as idle_trucks,
                t.code, t.name, t.brand, t.model, t.capacity
            FROM trucks t 
            WHERE "isActive" = true 
            ORDER BY capacity DESC LIMIT 1"""
        return PREDEFINED_QUERIES["idle_trucks_count"]
    
    if 'excavator' in question_lower and ('aktif' in question_lower or 'active' in question_lower):
        return PREDEFINED_QUERIES["active_excavators"]
    
    if 'mining site' in question_lower or 'tambang' in question_lower or 'site' in question_lower:
        if 'aktif' in question_lower or 'active' in question_lower or 'daftar' in question_lower:
            return PREDEFINED_QUERIES["mining_sites"]
    
    if 'hauling' in question_lower and ('terbaru' in question_lower or 'recent' in question_lower or 'terakhir' in question_lower):
        return PREDEFINED_QUERIES["recent_hauling"]
    
    if 'status' in question_lower and 'truk' in question_lower:
        return PREDEFINED_QUERIES["truck_status_summary"]
    
    if 'produksi' in question_lower and ('total' in question_lower or 'aktual' in question_lower):
        return PREDEFINED_QUERIES["production_summary"]
    
    return None

def generate_sql_query(user_question):
    predefined = get_predefined_query(user_question)
    if predefined:
        return predefined
    
    prompt = f"""You are an expert PostgreSQL query generator for a mining operations database.

{SCHEMA_CONTEXT}

USER QUESTION: {user_question}

TASK: Generate a valid PostgreSQL SELECT query to answer the user's question.

CRITICAL RULES:
1. Output ONLY the raw SQL query - no explanations, no markdown, no code blocks
2. Use double quotes for camelCase columns: "isActive", "loadWeight", "createdAt"
3. Use single quotes for string/enum values: 'IDLE', 'ACTIVE', 'COMPLETED'
4. For "largest/biggest/most" use ORDER BY ... DESC LIMIT 1
5. For "smallest/least" use ORDER BY ... ASC LIMIT 1
6. For "how many/count/total" use COUNT(*)
7. For "available trucks" use: status = 'IDLE' AND "isActive" = true
8. For "operating excavators" use: status = 'ACTIVE' AND "isActive" = true
9. Boolean values are lowercase: true, false
10. Always select useful columns, not just *

COMMON PATTERNS:
- Biggest truck by capacity: SELECT code, name, brand, model, capacity FROM trucks WHERE "isActive" = true ORDER BY capacity DESC LIMIT 1
- Count active trucks: SELECT COUNT(*) FROM trucks WHERE "isActive" = true
- Recent hauling: SELECT * FROM hauling_activities ORDER BY "createdAt" DESC LIMIT 10
- Truck with operator: SELECT t.code, t.name, o."employeeNumber" FROM trucks t LEFT JOIN operators o ON t."currentOperatorId" = o.id

SQL Query:"""
    
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'system', 'content': 'You are a PostgreSQL expert. Output ONLY the raw SQL query without any formatting, explanation, or code blocks. Just the pure SQL statement.'},
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
    """Enhanced streaming response with simulation capability"""
    
    yield json.dumps({"type": "step", "status": "thinking", "message": "Menganalisis pertanyaan..."}) + "\n"
    
    # Detect question type
    question_type = detect_question_type(user_question)
    
    # ============================================================
    # SIMULATION MODE - for what-if questions
    # ============================================================
    if question_type == 'simulation':
        yield json.dumps({"type": "step", "status": "simulation_mode", "message": "Mendeteksi pertanyaan simulasi..."}) + "\n"
        
        # Parse parameters
        params = parse_simulation_parameters(user_question)
        
        if 'num_trucks' not in params and 'target_tons' not in params:
            # Can't determine simulation parameters, fall back to AI interpretation
            yield json.dumps({"type": "step", "status": "parsing", "message": "Mengekstrak parameter dari pertanyaan..."}) + "\n"
            
            # Use LLM to extract parameters
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
                # Try to parse JSON
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
        
        # Set defaults if still missing
        if 'num_trucks' not in params:
            params['num_trucks'] = 5
        if 'target_tons' not in params:
            params['target_tons'] = 500
        
        yield json.dumps({
            "type": "step", 
            "status": "calculating", 
            "message": f"Menghitung simulasi: {params.get('num_trucks')} truk, {params.get('target_tons')} ton target..."
        }) + "\n"
        
        # Run simulation
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
        
        # Generate response
        response = generate_simulation_response(params, sim_result)
        
        yield json.dumps({"type": "answer", "content": response}) + "\n"
        yield json.dumps({"type": "step", "status": "completed", "message": "Simulasi selesai"}) + "\n"
        return
    
    # ============================================================
    # DATABASE QUERY MODE - for data lookup questions
    # ============================================================
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
