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

def get_financial_params(data=None):
    defaults = {
        'HargaJualBatuBara': 800000, 
        'HargaSolar': 15000, 
        'BiayaPenaltiKeterlambatanKapal': 100000000,
        'BiayaRataRataInsiden': 50000000,
        'BiayaDemurragePerJam': 50000000,
        'GajiOperatorRataRata': 5000000
    }
    
    if data and 'system_configs' in data and not data['system_configs'].empty:
        configs = data['system_configs']
        def get_val(key, default):
            row = configs[configs['configKey'] == key]
            if not row.empty:
                try: return float(row.iloc[0]['configValue'])
                except: return default
            return default
            
        defaults['HargaJualBatuBara'] = get_val('COAL_PRICE_IDR', defaults['HargaJualBatuBara'])
        defaults['HargaSolar'] = get_val('FUEL_PRICE_IDR', defaults['HargaSolar'])
        defaults['BiayaPenaltiKeterlambatanKapal'] = get_val('VESSEL_PENALTY_IDR', defaults['BiayaPenaltiKeterlambatanKapal'])
        defaults['BiayaDemurragePerJam'] = get_val('DEMURRAGE_COST_IDR', defaults['BiayaDemurragePerJam'])
        defaults['GajiOperatorRataRata'] = get_val('OPERATOR_SALARY_IDR', defaults['GajiOperatorRataRata'])
        
    return defaults

def load_config():
    """Memuat parameter finansial default."""
    return {
        'financial_params': get_financial_params()
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
    
    try:
        DB_CONFIGS = load_data('system_configs', 'system_configs.csv')
    except:
        DB_CONFIGS = pd.DataFrame()

    print(f"✅ Fresh data loaded successfully!")
    
    return {
        'trucks': DB_TRUCKS,
        'excavators': DB_EXCAVATORS,
        'operators': DB_OPERATORS,
        'roads': DB_ROADS,
        'schedules': DB_SCHEDULES,
        'vessels': DB_VESSELS,
        'maintenance': DB_MAINTENANCE_SORTED,
        'hauling_activities': load_data('hauling_activities', 'hauling_activities.csv'),
        'system_configs': DB_CONFIGS
    }

def calibrate_simulation_parameters(data):
    """
    Auto-calibrates simulation parameters based on recent hauling activities (last 24h).
    If no recent data, falls back to historical averages or defaults.
    """
    print("⚙️ Auto-Calibrating Simulation Parameters...")
    
    defaults = {
        'avg_hauling_speed_kmh': 25.0,
        'avg_return_speed_kmh': 30.0,
        'avg_loading_time_min': 3.0,
        'avg_dumping_time_min': 2.0,
        'avg_queue_time_min': 5.0
    }
    
    try:
        df = data.get('hauling_activities')
        if df is None or df.empty:
            print("   ⚠️ No hauling data found. Using defaults.")
            return defaults
            
        # Ensure timestamps are datetime
        # Assuming columns: loadingStart, loadingEnd, dumpingStart, dumpingEnd, etc.
        # Or if we have duration columns directly
        
        # Let's check if we have duration columns
        required_cols = ['loadingDuration', 'haulingDuration', 'dumpingDuration', 'returnDuration', 'distance']
        available_cols = [c for c in required_cols if c in df.columns]
        
        if len(available_cols) < len(required_cols):
             print(f"   ⚠️ Missing duration columns in hauling data. Using defaults. Found: {available_cols}")
             return defaults

        # Filter for last 24 hours if possible, otherwise use all
        # For now, let's use all valid data to be robust against sparse data
        valid_df = df.dropna(subset=available_cols)
        
        if valid_df.empty:
             print("   ⚠️ No valid hauling rows after dropna. Using defaults.")
             return defaults
             
        # Calculate Averages
        avg_loading = valid_df['loadingDuration'].mean()
        avg_dumping = valid_df['dumpingDuration'].mean()
        
        # Calculate Speeds (Distance is usually in km, Duration in minutes)
        # Speed = Distance / (Duration / 60) = km/h
        
        # Filter out zero durations to avoid division by zero
        valid_haul = valid_df[valid_df['haulingDuration'] > 0]
        if not valid_haul.empty:
            avg_hauling_speed = (valid_haul['distance'] / (valid_haul['haulingDuration'] / 60.0)).mean()
        else:
            avg_hauling_speed = defaults['avg_hauling_speed_kmh']
            
        valid_return = valid_df[valid_df['returnDuration'] > 0]
        if not valid_return.empty:
            avg_return_speed = (valid_return['distance'] / (valid_return['returnDuration'] / 60.0)).mean()
        else:
            avg_return_speed = defaults['avg_return_speed_kmh']
            
        # Sanity Checks (Clamp values to reasonable ranges)
        avg_loading = max(0.5, min(avg_loading, 15.0))
        avg_dumping = max(0.5, min(avg_dumping, 10.0))
        avg_hauling_speed = max(5.0, min(avg_hauling_speed, 60.0))
        avg_return_speed = max(5.0, min(avg_return_speed, 70.0))
        
        calibrated = {
            'avg_hauling_speed_kmh': avg_hauling_speed,
            'avg_return_speed_kmh': avg_return_speed,
            'avg_loading_time_min': avg_loading,
            'avg_dumping_time_min': avg_dumping,
            'avg_queue_time_min': defaults['avg_queue_time_min'] # Queue is dynamic in sim
        }
        
        print(f"   ✅ Calibrated: Load={avg_loading:.1f}m, Dump={avg_dumping:.1f}m, Haul={avg_hauling_speed:.1f}km/h, Return={avg_return_speed:.1f}km/h")
        return calibrated
        
    except Exception as e:
        print(f"   ❌ Calibration failed: {e}. Using defaults.")
        return defaults

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

def truck_process_hybrid(env, truck_id, operator_id, resources, global_metrics, skenario, sim_start_time, data, calibrated_params):
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

    # Get Truck Specifics
    try: 
        truck_data = data['trucks'].loc[truck_id]
        fuel_rate = float(truck_data.get('fuelConsumption', 1.0)) # L/km
        maint_rate = float(truck_data.get('maintenanceCost', 0.0)) # IDR/hour
    except: 
        fuel_rate = 1.0
        maint_rate = 0.0

    # Weather Impact Factors
    weather_speed_factor = 1.0
    if "Hujan Ringan" in str(weather): weather_speed_factor = 0.85
    elif "Hujan Lebat" in str(weather): weather_speed_factor = 0.60
    
    road_cond_factor = 1.0
    if road_cond == "FAIR": road_cond_factor = 0.9
    elif road_cond == "POOR": road_cond_factor = 0.7
    
    total_speed_factor = weather_speed_factor * road_cond_factor

    # Get Road Distance
    try: road_distance_km = data['roads'].loc[road_id]['distance']
    except: road_distance_km = 5.0 # Default

    while True:
        start_cycle_time = env.now
        current_sim_time = sim_start_time + pd.Timedelta(seconds=env.now*3600)
        
        feats = get_features_for_prediction(truck_id, operator_id, road_id, excavator_id, weather, road_cond, shift, current_sim_time, data)
        
        fuel_baseline = (road_distance_km * 2) * fuel_rate
        fuel = fuel_baseline * np.random.uniform(0.95, 1.05)
        
        load = kapasitas_ton * 0.87 * np.random.uniform(0.95, 1.05)
        tonase = load
        delay = 0.05
        risiko = 0.1
        
        if not feats.empty:
            try:
                ml_fuel = MODEL_FUEL.predict(feats)[0]
                fuel = (fuel * 0.7) + (ml_fuel * 0.3)
                
                fuel_real = MODEL_FUEL_REAL.predict(feats)[0]
                raw_load = MODEL_LOAD.predict(feats)[0]
                load = raw_load * 0.87
                tonase = MODEL_TONASE.predict(feats)[0]
                delay = MODEL_DELAY.predict_proba(feats)[0][1]
                risiko = MODEL_RISIKO.predict(feats)[0]
                
                load = max(load, tonase * 0.87)
                
            except Exception as e:
                pass

        avg_hauling_speed = calibrated_params['avg_hauling_speed_kmh'] * total_speed_factor
        hauling_time_hours = road_distance_km / avg_hauling_speed
        haul_start = env.now
        yield env.timeout(hauling_time_hours)
        haul_end = env.now
        global_metrics['total_hauling_time_hours'] += (haul_end - haul_start)
        
        waktu_masuk_antrian = env.now
        
        with excavator_resource.request() as req:
            yield req
            
            waktu_keluar_antrian = env.now
            
            durasi_antri = waktu_keluar_antrian - waktu_masuk_antrian
            global_metrics['total_waktu_antri_jam'] += durasi_antri
            
            avg_loading_min = calibrated_params['avg_loading_time_min']
            loading_factor = 1.1 if "Hujan" in str(weather) else 1.0
            loading_time_hours = (avg_loading_min * loading_factor) / 60.0
            loading_start = env.now
            yield env.timeout(loading_time_hours)
            loading_end = env.now
            global_metrics['total_loading_time_hours'] += (loading_end - loading_start)
            
        avg_return_speed = calibrated_params['avg_return_speed_kmh'] * total_speed_factor
        return_time_hours = road_distance_km / avg_return_speed
        return_start = env.now
        yield env.timeout(return_time_hours)
        return_end = env.now
        global_metrics['total_return_time_hours'] += (return_end - return_start)
        
        avg_dump_min = calibrated_params['avg_dumping_time_min']
        dumping_time_hours = avg_dump_min / 60.0
        dump_start = env.now
        yield env.timeout(dumping_time_hours)
        dump_end = env.now
        global_metrics['total_dumping_time_hours'] += (dump_end - dump_start)
        
        cycle_duration_hours = env.now - start_cycle_time
        global_metrics['total_cycle_time_hours'] += cycle_duration_hours
        
        global_metrics['total_tonase'] += load
        global_metrics['total_bbm_liter'] += fuel
        global_metrics['total_probabilitas_delay'] += delay
        global_metrics['jumlah_siklus_selesai'] += 1
        global_metrics['total_maintenance_cost'] += (cycle_duration_hours * maint_rate)

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
        delay_risk_level = "HIGH" if hours_short > 24 else "MEDIUM"
    elif variance_hours < 24:
        status = "TIGHT_SCHEDULE"
        delay_risk_level = "MEDIUM"

    return {
        "status": status,
        "demurrage_cost": demurrage,
        "info": f"Kapal {vessel_name} status: {status}",
        "vessel_name": vessel_name,
        "days_to_complete": days_needed,
        "hours_needed": hours_needed,
        "delay_risk_level": delay_risk_level
    }
def run_hybrid_simulation(skenario, financial_params, data, duration_hours=8, calibrated_params=None):
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
        'total_cycle_time_hours': 0.0,
        'total_maintenance_cost': 0.0,
        'total_operator_cost': 0.0,
        'total_loading_time_hours': 0.0,
        'total_dumping_time_hours': 0.0,
        'total_hauling_time_hours': 0.0,
        'total_return_time_hours': 0.0
    }
    
    if 'status' in data['trucks'].columns:
        active_trucks = data['trucks'][~data['trucks']['status'].isin(['MAINTENANCE', 'BREAKDOWN'])]
        trucks = active_trucks.index.tolist()
    else:
        trucks = data['trucks'].index.tolist()

    ops = data['operators'].index.tolist()
    
    if not trucks: 
        print("⚠️ No active trucks available for simulation!")
        return skenario 

    if calibrated_params is None:
        calibrated_params = {
            'avg_hauling_speed_kmh': 25.0,
            'avg_return_speed_kmh': 30.0,
            'avg_loading_time_min': 3.0,
            'avg_dumping_time_min': 2.0,
            'avg_queue_time_min': 5.0
        }

    used_truck_ids = []
    for i in range(skenario['alokasi_truk']):
        t_id = trucks[i % len(trucks)]
        used_truck_ids.append(t_id)
        o_id = ops[i % len(ops)]

        env.process(truck_process_hybrid(env, t_id, o_id, res, metrics, skenario, sim_start_time, data, calibrated_params))
        
    used_excavator_ids = []
    
    if 'status' in data['excavators'].columns:
        active_excavators = data['excavators'][~data['excavators']['status'].isin(['MAINTENANCE', 'BREAKDOWN'])]
        excavators_list = active_excavators.index.tolist()
    else:
        excavators_list = data['excavators'].index.tolist()

    target_exc_id = skenario.get('target_excavator_id')
    
    if excavators_list:
        start_idx = 0
        if target_exc_id in excavators_list:
            start_idx = excavators_list.index(target_exc_id)
        
        for i in range(skenario['jumlah_excavator']):
            e_id = excavators_list[(start_idx + i) % len(excavators_list)]
            used_excavator_ids.append(e_id)

    env.run(until=duration_hours)
    
    p = financial_params
    rev = metrics['total_tonase'] * p['HargaJualBatuBara']
    
    num_trucks = skenario['alokasi_truk']
    num_excavators = skenario['jumlah_excavator']
    num_hauling_operators = num_trucks
    num_loading_operators = num_excavators
    num_dumping_operators = num_excavators
    total_operators_needed = num_hauling_operators + num_loading_operators + num_dumping_operators
    
    avg_operator_salary = p.get('GajiOperatorRataRata', 5000000)
    if 'operators' in data and not data['operators'].empty and 'salary' in data['operators'].columns:
        salaries = data['operators']['salary'].dropna()
        if len(salaries) > 0:
            avg_operator_salary = salaries.mean()
    
    duration_hours_actual = env.now
    salary_per_hour_per_operator = avg_operator_salary / 30 / 24
    metrics['total_operator_cost'] = salary_per_hour_per_operator * total_operators_needed * duration_hours_actual
    metrics['num_hauling_operators'] = num_hauling_operators
    metrics['num_loading_operators'] = num_loading_operators
    metrics['num_dumping_operators'] = num_dumping_operators
    metrics['total_operators_needed'] = total_operators_needed
    metrics['avg_operator_salary_monthly'] = avg_operator_salary
    metrics['operator_salary_per_hour'] = salary_per_hour_per_operator
    
    cost = metrics['total_bbm_liter'] * p['HargaSolar']
    cost += metrics['total_maintenance_cost']
    cost += metrics['total_operator_cost']
    
    risk_antri = metrics['total_waktu_antri_jam'] * p.get('BiayaAntrianPerJam', 100000)
    risk_insiden = metrics['total_probabilitas_delay'] * p.get('BiayaRataRataInsiden', 500000) 
    
    schedule_id = skenario.get('target_schedule_id')
    ship_res = calculate_shipment_risk(metrics['total_tonase'], schedule_id, p, sim_start_time, data)
    biaya_demurrage = ship_res['demurrage_cost']
    
    profit = rev - cost - risk_antri - risk_insiden - biaya_demurrage
    
    road_id = skenario.get('target_road_id')
    try: road_dist = data['roads'].loc[road_id]['distance']
    except: road_dist = 5.0
    total_distance_km = metrics['jumlah_siklus_selesai'] * road_dist * 2
    
    result = skenario.copy()
    result.update(metrics)
    result.update({
        'Z_SCORE_PROFIT': profit,
        'total_biaya_risiko_antrian': risk_antri,
        'total_biaya_risiko_insiden': risk_insiden,
        'shipment_analysis': ship_res,
        'used_truck_ids': used_truck_ids,
        'used_excavator_ids': used_excavator_ids,
        'total_distance_km': total_distance_km,
        'financial_params': p,
        'financial_breakdown': {
            'revenue': rev,
            'fuel_cost': metrics['total_bbm_liter'] * p['HargaSolar'],
            'maintenance_cost': metrics['total_maintenance_cost'],
            'operator_cost': metrics['total_operator_cost'],
            'queue_cost': risk_antri,
            'incident_risk_cost': risk_insiden,
            'demurrage_cost': biaya_demurrage,
            'total_cost': cost,
            'net_profit': profit
        }
    })
    return result

def get_operational_guidelines(weather, road_cond, trucks, excavators):
    guidelines = []
    
    # Weather based guidelines
    if weather and ("Hujan" in str(weather) or "Rain" in str(weather)):
        guidelines.append("Waspada jalan licin, kurangi kecepatan unit.")
        guidelines.append("Pastikan drainase area loading/dumping berfungsi baik.")
        guidelines.append("Gunakan mode 4WD jika diperlukan.")
    elif weather and "Kabut" in str(weather):
        guidelines.append("Nyalakan lampu kabut dan lampu hazard.")
        guidelines.append("Jaga jarak aman antar unit minimal 50 meter.")
        
    # Road Condition based guidelines
    if road_cond == "POOR":
        guidelines.append("Perbaikan jalan prioritas di segmen kritis (grade/undulation).")
        guidelines.append("Hindari muatan berlebih (overload) untuk mencegah kerusakan jalan.")
        guidelines.append("Kurangi kecepatan di tikungan tajam.")
    elif road_cond == "FAIR":
        guidelines.append("Lakukan maintenance rutin grading jalan.")
        
    # Fleet density based guidelines
    if trucks and trucks > 10:
        guidelines.append("Atur jarak iring antar unit (min 30m) untuk hindari antrian.")
        guidelines.append("Waspada potensi antrian panjang di area dumping/loading.")
        guidelines.append("Optimalkan traffic management di persimpangan.")
        
    # Excavator based guidelines
    if excavators and excavators > 2:
        guidelines.append("Pastikan area loading cukup luas untuk manuver multiple excavator.")
        guidelines.append("Koordinasi antar operator excavator untuk pembagian front loading.")
        
    # Default safety guidelines
    if not guidelines:
        guidelines.append("Lakukan P5M (Pembicaraan Pagi) sebelum operasi.")
        guidelines.append("Patuhi rambu batas kecepatan dan aturan lalu lintas tambang.")
        guidelines.append("Gunakan APD lengkap dan sabuk pengaman.")
        
    return guidelines

def format_konteks_for_llm(simulation_results, data):
    formatted_data = []
    i = 0
    for res in simulation_results:
        i += 1
        
        r_id = res.get('target_road_id')
        e_id = res.get('target_excavator_id')
        
        r_name = r_id
        if not data['roads'].empty and r_id in data['roads'].index:
            r_name = data['roads'].loc[r_id, 'name']
            
        e_name = e_id
        if not data['excavators'].empty and e_id in data['excavators'].index:
            e_name = data['excavators'].loc[e_id, 'name']
            
        profit_fmt = format_currency(res.get('Z_SCORE_PROFIT', 0))
        ton = res.get('total_tonase', 0)
        fr_fmt = f"{res.get('total_bbm_liter', 0) / ton:.2f} L/Ton" if ton > 0 else "N/A"

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

        fin = res.get('financial_breakdown', {})
        
        detailed_equipment = []
        used_trucks = res.get('used_truck_ids', [])
        used_excavators = res.get('used_excavator_ids', [])
        
        truck_counts = {}
        for t_id in used_trucks:
            if not data['trucks'].empty and t_id in data['trucks'].index:
                t_data = data['trucks'].loc[t_id]
                name = f"{t_data['brand']} {t_data['model']} ({t_id})"
                detailed_equipment.append({"type": "Truck", "id": t_id, "name": name})
        
        for e_id in used_excavators:
            if not data['excavators'].empty and e_id in data['excavators'].index:
                e_data = data['excavators'].loc[e_id]
                name = f"{e_data['brand']} {e_data['model']} ({e_id})"
                detailed_equipment.append({"type": "Excavator", "id": e_id, "name": name})

        cycles = res.get('jumlah_siklus_selesai', 0)
        
        loading_time_total = res.get('total_loading_time_hours', 0)
        hauling_time_total = res.get('total_hauling_time_hours', 0)
        dumping_time_total = res.get('total_dumping_time_hours', 0)
        return_time_total = res.get('total_return_time_hours', 0)
        queue_time_total = res.get('total_waktu_antri_jam', 0)
        
        loading_avg_min = (loading_time_total / cycles * 60) if cycles > 0 else 0
        hauling_avg_min = (hauling_time_total / cycles * 60) if cycles > 0 else 0
        dumping_avg_min = (dumping_time_total / cycles * 60) if cycles > 0 else 0
        return_avg_min = (return_time_total / cycles * 60) if cycles > 0 else 0
        queue_avg_min = (queue_time_total / cycles * 60) if cycles > 0 else 0
        
        road_id = res.get('target_road_id')
        try: road_dist = data['roads'].loc[road_id]['distance']
        except: road_dist = 5.0
        
        num_hauling_ops = res.get('num_hauling_operators', res.get('alokasi_truk', 0))
        num_loading_ops = res.get('num_loading_operators', res.get('jumlah_excavator', 0))
        num_dumping_ops = res.get('num_dumping_operators', res.get('jumlah_excavator', 0))

        total_ops_needed = res.get('total_operators_needed', num_hauling_ops + num_loading_ops + num_dumping_ops)
        
        flow_breakdown = (
            f"Rincian Alur Operasi Per Siklus (Hulu - Hilir)\n"
            f"\n"
            f"Siklus Lengkap: {avg_cycle_min:.1f} menit rata-rata per trip\n"
            f"\n"
            f"FASE 1: LOADING di Hulu (Area Tambang)\n"
            f"   Waktu per Trip: {loading_avg_min:.1f} menit\n"
            f"   Lokasi: Loading Point\n"
            f"   Proses: Excavator memuat batubara ke dump truck\n"
            f"   Equipment: {res.get('jumlah_excavator')} unit excavator - {e_name}\n"
            f"   Operator Loading: {num_loading_ops} orang\n"
            f"\n"
            f"FASE 2: HAULING (Pengangkutan Terisi - Tambang ke Pelabuhan)\n"
            f"   Waktu per Trip: {hauling_avg_min:.1f} menit\n"
            f"   Jarak Tempuh: {road_dist:.2f} km\n"
            f"   Kecepatan Rata-rata: {(road_dist / (hauling_avg_min / 60)):.1f} km/jam\n"
            f"   Kondisi Jalan: {res.get('roadCondition')}\n"
            f"   Kondisi Cuaca: {res.get('weatherCondition')}\n"
            f"   Equipment: {res.get('alokasi_truk')} unit dump truck\n"
            f"   Operator Hauling: {num_hauling_ops} orang\n"
            f"\n"
            f"FASE 3: QUEUE di Hilir (Antrian Dumping Point)\n"
            f"   Waktu Tunggu per Trip: {queue_avg_min:.1f} menit\n"
            f"   Status Antrian: {'Tinggi - Perlu Optimasi' if queue_avg_min > 10 else 'Lancar'}\n"
            f"\n"
            f"FASE 4: DUMPING di Hilir (Transfer ke Vessel)\n"
            f"   Waktu per Trip: {dumping_avg_min:.1f} menit\n"
            f"   Lokasi: Vessel Loading Area (Dermaga)\n"
            f"   Proses: Transfer batubara dari truck ke vessel\n"
            f"   Equipment: {res.get('jumlah_excavator')} unit excavator\n"
            f"   Operator Dumping: {num_dumping_ops} orang\n"
            f"\n"
            f"FASE 5: RETURN (Perjalanan Kosong - Pelabuhan ke Tambang)\n"
            f"   Waktu per Trip: {return_avg_min:.1f} menit\n"
            f"   Jarak Tempuh: {road_dist:.2f} km\n"
            f"   Kecepatan Rata-rata: {(road_dist / (return_avg_min / 60)):.1f} km/jam\n"
            f"\n"
            f"RINGKASAN PRODUKSI\n"
            f"   Total Siklus Selesai: {cycles} trips\n"
            f"   Total Jarak Tempuh: {res.get('total_distance_km', 0):.1f} km\n"
            f"   Total Produksi: {ton:,.0f} ton\n"
            f"   Rata-rata Muatan per Trip: {ton / cycles:.1f} ton/trip\n"
            f"   Total BBM Terpakai: {res.get('total_bbm_liter', 0):,.0f} liter\n"
            f"   Efisiensi BBM: {res.get('total_bbm_liter', 0) / ton:.2f} liter/ton\n"
            f"   Total Operator Dibutuhkan: {total_ops_needed} orang\n"
            f"   - Operator Hauling: {num_hauling_ops} orang\n"
            f"   - Operator Loading: {num_loading_ops} orang\n"
            f"   - Operator Dumping: {num_dumping_ops} orang"
        )
        
        rev_val = fin.get('revenue', 0)
        fuel_cost_val = fin.get('fuel_cost', 0)
        queue_cost_val = fin.get('queue_cost', 0)
        incident_cost_val = fin.get('incident_risk_cost', 0)
        demurrage_val = fin.get('demurrage_cost', 0)
        maint_cost_val = res.get('total_maintenance_cost', 0)
        operator_cost_val = res.get('total_operator_cost', 0)
        net_profit_val = fin.get('net_profit', 0)
        
        coal_price = res.get('financial_params', {}).get('HargaJualBatuBara', 800000)
        fuel_price = res.get('financial_params', {}).get('HargaSolar', 15000)
        avg_operator_salary = res.get('avg_operator_salary_monthly', res.get('financial_params', {}).get('GajiOperatorRataRata', 5000000))
        
        num_hauling_ops = res.get('num_hauling_operators', res.get('alokasi_truk', 0))
        num_loading_ops = res.get('num_loading_operators', res.get('jumlah_excavator', 0))
        num_dumping_ops = res.get('num_dumping_operators', res.get('jumlah_excavator', 0))
        total_ops = res.get('total_operators_needed', num_hauling_ops + num_loading_ops + num_dumping_ops)
        operator_hourly = res.get('operator_salary_per_hour', avg_operator_salary / 30 / 24)
        duration_hours = 8
        
        financial_explanation = (
            f"Perhitungan Laba Bersih:\n"
            f"\n"
            f"1. Pendapatan (Revenue)\n"
            f"   Formula: Total Tonase × Harga Batubara per Ton\n"
            f"   Perhitungan: {ton:,.0f} ton × {format_currency(coal_price)}/ton\n"
            f"   Total Pendapatan: {format_currency(rev_val)}\n"
            f"\n"
            f"2. Rincian Biaya Operasional\n"
            f"   a. Biaya Bahan Bakar\n"
            f"      Total Konsumsi: {res.get('total_bbm_liter', 0):,.0f} liter\n"
            f"      Harga Solar: {format_currency(fuel_price)}/liter\n"
            f"      Subtotal: {format_currency(fuel_cost_val)}\n"
            f"\n"
            f"   b. Biaya Maintenance & Perawatan\n"
            f"      Estimasi aus komponen & servis rutin\n"
            f"      Subtotal: {format_currency(maint_cost_val)}\n"
            f"\n"
            f"   c. Biaya Gaji Operator\n"
            f"      - Operator Pengangkutan (Truck): {num_hauling_ops} orang\n"
            f"      - Operator Loading (Excavator Hulu): {num_loading_ops} orang\n"
            f"      - Operator Dumping (Excavator Hilir): {num_dumping_ops} orang\n"
            f"      Total Operator: {total_ops} orang\n"
            f"      Gaji Rata-rata: {format_currency(avg_operator_salary)}/bulan\n"
            f"      Tarif Per Jam: {format_currency(operator_hourly)}/jam/operator\n"
            f"      Durasi Operasi: {duration_hours} jam\n"
            f"      Formula: {total_ops} operator × {format_currency(operator_hourly)}/jam × {duration_hours} jam\n"
            f"      Subtotal: {format_currency(operator_cost_val)}\n"
            f"\n"
            f"   d. Biaya Inefisiensi Antrian\n"
            f"      Biaya peluang dari waktu tunggu\n"
            f"      Subtotal: {format_currency(queue_cost_val)}\n"
            f"\n"
            f"   e. Biaya Risiko Insiden\n"
            f"      Perhitungan probabilistik model keselamatan\n"
            f"      Subtotal: {format_currency(incident_cost_val)}\n"
            f"\n"
            f"   f. Denda Demurrage Kapal\n"
            f"      Penalti keterlambatan pengiriman\n"
            f"      Subtotal: {format_currency(demurrage_val)}\n"
            f"\n"
            f"3. Laba Bersih\n"
            f"   Formula: Pendapatan - Total Biaya\n"
            f"   Perhitungan: {format_currency(rev_val)} - {format_currency(fuel_cost_val + maint_cost_val + operator_cost_val + queue_cost_val + incident_cost_val + demurrage_val)}\n"
            f"   Hasil Akhir: {format_currency(net_profit_val)}"
        )

        # Production Target Details
        cycles = res.get('jumlah_siklus_selesai', 0)
        avg_load = ton / cycles if cycles > 0 else 0
        production_explanation = (
            f"Analisis Produksi:\n"
            f"\n"
            f"Total Output: {ton:,.0f} ton\n"
            f"\n"
            f"Analisis Siklus:\n"
            f"   - Total Siklus: {cycles} trip selesai\n"
            f"   - Rata-rata Muatan: {avg_load:.2f} ton/trip\n"
            f"   - Basis: Kapasitas truk & densitas material batubara\n"
            f"\n"
            f"Konteks Pencapaian:\n"
            f"Output ini merepresentasikan tonase maksimum yang dapat dicapai\n"
            f"dengan konfigurasi {res.get('alokasi_truk')} truk dan {res.get('jumlah_excavator')} excavator\n"
            f"pada kondisi cuaca {res.get('weatherCondition')} dan jalan {res.get('roadCondition')}."
        )

        # Fuel Efficiency Details
        fuel_total = res.get('total_bbm_liter', 0)
        fuel_efficiency_val = fuel_total / ton if ton > 0 else 0
        total_dist = res.get('total_distance_km', 0)
        avg_fuel_per_km = fuel_total / total_dist if total_dist > 0 else 0
        
        fuel_explanation = (
            f"Rincian Efisiensi Bahan Bakar:\n"
            f"\n"
            f"1. Sumber Data\n"
            f"   Telemetri real-time & prediksi ML (Model XGBoost)\n"
            f"\n"
            f"2. Formula Efisiensi\n"
            f"   Efisiensi (liter/ton) = Total BBM / Total Produksi\n"
            f"\n"
            f"3. Perhitungan Detail\n"
            f"   - Total Jarak: {cycles} siklus × {res.get('distance_km', 0)*2:.2f} km/trip = {total_dist:.1f} km\n"
            f"   - Tingkat Konsumsi: {avg_fuel_per_km:.2f} liter/km\n"
            f"     (Rata-rata berdasarkan gradien & muatan)\n"
            f"   - Total BBM: {total_dist:.1f} km × {avg_fuel_per_km:.2f} liter/km = {fuel_total:,.0f} liter\n"
            f"   - Skor Efisiensi: {fuel_total:,.0f} liter / {ton:,.0f} ton = {fuel_efficiency_val:.2f} liter/ton\n"
            f"\n"
            f"4. Interpretasi\n"
            f"   Skor lebih rendah = efisiensi lebih baik\n"
            f"   Dipengaruhi oleh kondisi jalan {res.get('roadCondition')} dan cuaca {res.get('weatherCondition')}"
        )

        # Configuration Rationale
        match_factor = (res.get('alokasi_truk') * res.get('avg_loading_time_min', 3)) / (res.get('jumlah_excavator') * res.get('avg_cycle_time_min', 20)) if res.get('jumlah_excavator') > 0 and res.get('avg_cycle_time_min', 0) > 0 else 0
        config_explanation = (
            f"Rasional Konfigurasi Armada:\n"
            f"\n"
            f"Konfigurasi Terpilih: {res.get('alokasi_truk')} Truk + {res.get('jumlah_excavator')} Excavator\n"
            f"\n"
            f"Analisis Match Factor: {match_factor:.2f}\n"
            f"   - {('Under-trucked (< 1.0): Excavator mungkin menunggu. Prioritas efisiensi BBM.' if match_factor < 1.0 else 'Over-trucked (> 1.0): Truk mungkin mengantre. Prioritas volume produksi maksimal.')}\n"
            f"\n"
            f"Tujuan Optimasi:\n"
            f"Kombinasi ini menghasilkan Laba Bersih tertinggi dengan menyeimbangkan\n"
            f"biaya penambahan unit terhadap keuntungan marjinal dalam tonase produksi."
        )

        # Vessel Status Details
        vessel_name = ship.get('vessel_name', 'N/A')
        eta = ship.get('eta', 'N/A')
        planned = ship.get('target_tonase', 0)
        remaining = ship.get('remaining_target', 0)
        daily_rate = ship.get('daily_production_rate', 0)
        
        vessel_explanation = (
            f"Rincian Status Kapal:\n"
            f"\n"
            f"Identitas Kapal: {vessel_name}\n"
            f"\n"
            f"Kebutuhan Kargo:\n"
            f"   - Sisa Target: {remaining:,.0f} ton\n"
            f"   - Target Harian: {daily_rate:,.0f} ton/hari\n"
            f"\n"
            f"Analisis Waktu:\n"
            f"   - Estimasi Selesai: {ship.get('days_to_complete', 0):.1f} hari\n"
            f"   - Waktu Tersisa: {ship.get('time_remaining_days', 0):.1f} hari\n"
            f"\n"
            f"Status: {ship.get('status', 'N/A')}\n"
            f"   {ship.get('info', '')}\n"
            f"\n"
            f"Dampak Finansial:\n"
            f"   Potensi Demurrage: {format_currency(demurrage_val)}"
        )

        # Efficiency Analysis Details
        active_time = res.get('total_cycle_time_hours', 0)
        queue_time = res.get('total_waktu_antri_jam', 0)
        total_time = active_time + queue_time
        efficiency_pct = (active_time / total_time * 100) if total_time > 0 else 0
        
        efficiency_explanation = (
            f"Analisis Efisiensi Operasional:\n"
            f"\n"
            f"Skor Efisiensi: {efficiency_pct:.1f}% (Aktif vs Total Waktu)\n"
            f"\n"
            f"Distribusi Waktu:\n"
            f"   - Hauling Aktif: {active_time:.1f} jam ({efficiency_pct:.1f}%)\n"
            f"     Pergerakan produktif trucks & excavators\n"
            f"   - Mengantre (Idle): {queue_time:.1f} jam ({100-efficiency_pct:.1f}%)\n"
            f"     Waktu terbuang di loading/dumping point\n"
            f"\n"
            f"Analisis Hambatan:\n"
            f"   {'Waktu antrean tinggi - Perlu optimasi dispatching atau pengurangan truk' if queue_time > active_time * 0.2 else 'Aliran optimal dengan waktu tunggu minimal'}"
        )

        delay_risk_explanation = (
            f"Penilaian Risiko Keterlambatan:\n"
            f"\n"
            f"Tingkat Risiko: {delay_risk}\n"
            f"Probabilitas Delay: {res.get('total_probabilitas_delay', 0) / cycles * 100 if cycles > 0 else 0:.1f}% per trip\n"
            f"\n"
            f"Faktor Kontribusi:\n"
            f"   1. Cuaca: {res.get('weatherCondition')}\n"
            f"      Dampak pada kecepatan & traksi kendaraan\n"
            f"   2. Kondisi Jalan: {res.get('roadCondition')}\n"
            f"      Dampak pada hambatan gulir & waktu tempuh\n"
            f"   3. Kepadatan Lalu Lintas: {res.get('alokasi_truk')} truk\n"
            f"      Probabilitas antrean di loading/dumping point\n"
            f"\n"
            f"Mitigasi: {sop[0] if sop else 'Ikuti protokol keselamatan standar'}"
        )

        explanations = {
            "CONFIGURATION": config_explanation,
            "ROUTE": f"Route Analysis:\n\nPath: {r_name}\nDistance: {res.get('distance_km', 0):.2f} km (One way)\nCondition: {res.get('roadCondition')}\n\nReasoning:\nShortest viable path with acceptable gradient for loaded trucks.",
            "FINANCIAL": financial_explanation,
            "PRODUCTION": production_explanation,
            "FUEL": fuel_explanation,
            "VESSEL": vessel_explanation,
            "EFFICIENCY": efficiency_explanation,
            "DELAY_RISK": delay_risk_explanation,
            "FLOW_BREAKDOWN": flow_breakdown
        }

        road_id = res.get('target_road_id')
        mining_site_id = None
        if not data['roads'].empty and road_id in data['roads'].index:
            if 'miningSiteId' in data['roads'].columns:
                mining_site_id = data['roads'].loc[road_id, 'miningSiteId']

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
                "FINANCIAL_BREAKDOWN": {
                    "REVENUE": format_currency(fin.get('revenue', 0)),
                    "FUEL_COST": format_currency(fin.get('fuel_cost', 0)),
                    "QUEUE_COST": format_currency(fin.get('queue_cost', 0)),
                    "INCIDENT_COST": format_currency(fin.get('incident_risk_cost', 0)),
                    "DEMURRAGE": format_currency(fin.get('demurrage_cost', 0)),
                    "NET_PROFIT": format_currency(fin.get('net_profit', 0))
                },
                "DETAILED_EQUIPMENT": detailed_equipment,
                "EXPLANATIONS": explanations,
                "ANALISIS_KAPAL": ship_str,
                "SOP_KESELAMATAN": " | ".join(sop),
                "RAW_DATA": {
                    "total_tonase": res.get('total_tonase', 0),
                    "jumlah_siklus_selesai": res.get('jumlah_siklus_selesai', 0),
                    "total_distance_km": res.get('total_distance_km', 0),
                    "total_bbm_liter": res.get('total_bbm_liter', 0),
                    "total_cycle_time_hours": res.get('total_cycle_time_hours', 0),
                    "distance_km": res.get('distance_km', 0),
                    "weatherCondition": res.get('weatherCondition'),
                    "roadCondition": res.get('roadCondition'),
                    "shift": res.get('shift'),
                    "alokasi_truk": res.get('alokasi_truk'),
                    "jumlah_excavator": res.get('jumlah_excavator'),
                    "target_road_id": res.get('target_road_id'),
                    "target_excavator_id": res.get('target_excavator_id'),
                    "target_schedule_id": res.get('target_schedule_id'),
                    "miningSiteId": mining_site_id,
                    "delay_risk_level": delay_risk,
                    "strategy_objective": res.get('strategy_objective', 'Optimal Configuration')
                }
            }
        })
    return json.dumps(formatted_data, indent=2)

def get_strategic_recommendations(fixed, vars, params):
    print(f"\n--- [Multi-Objective Optimization Engine] ---")
    
    data = load_fresh_data()
    calibrated_params = calibrate_simulation_parameters(data)
    
    # Use dynamic financial params if not provided by user
    if params is None:
        params = get_financial_params(data)
    else:
        # If params is a Pydantic model or dict, ensure it's a dict
        if hasattr(params, 'dict'):
            params = params.dict()
        # Merge with defaults to ensure all keys exist
        defaults = get_financial_params(data)
        defaults.update(params)
        params = defaults
    
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
    target_production = float(fixed.get('totalProductionTarget', 0))
    
    all_roads = data['roads'].index.tolist()
    all_excavators = data['excavators'].index.tolist()
    all_schedules = data['schedules'].index.tolist() if not data['schedules'].empty else [None]
    
    print(f"   > Database: {len(all_roads)} roads, {len(all_excavators)} excavators, {len(all_schedules)} schedules")
    print(f"   > Parameters: Weather={user_weather}, RoadCond={user_road_cond}, TargetProduction={target_production}")
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
    
    # Adjust truck configs if target production is set and low
    truck_configs = list(range(min_trucks, max_trucks + 1, max(1, (max_trucks - min_trucks) // 4)))
    
    if target_production > 0:
        # Smart Fleet Sizing Estimation
        # Asumsi kasar: 1 Truck ~ 20-30 ton/trip. 
        # Cycle time ~ 30-60 menit -> 8-16 trip/shift.
        # Kapasitas per truck per shift ~ 200 - 400 ton.
        # Ambil konservatif: 250 ton/truck/shift.
        
        est_trucks_needed = max(1, int(target_production / 250))
        
        # Buat range pencarian di sekitar estimasi (+- 2 unit)
        # Tapi tetap hormati batas min/max global jika masuk akal, 
        # namun jika target kecil, paksa turun ke bawah min_trucks default.
        
        search_min = max(1, est_trucks_needed - 2)
        search_max = est_trucks_needed + 3
        
        # Jika target sangat kecil (< 1000 ton), pastikan kita cek 1-5 truk
        if target_production < 1000:
            search_min = 1
            search_max = max(5, search_max)
            
        print(f"   ℹ️ Target {target_production} tons -> Est. {est_trucks_needed} trucks. Adjusting search range to [{search_min}, {search_max}]")
        
        truck_configs = list(range(search_min, search_max + 1))
        
        # Filter agar tidak melebihi batas absolut (misal 100) tapi boleh melebihi max_trucks user jika perlu
        truck_configs = [t for t in truck_configs if t > 0 and t <= 100]
        
        # Ensure we have enough granularity
        if len(truck_configs) < 3:
             truck_configs = list(range(search_min, search_max + 2))

    if max_trucks not in truck_configs and target_production <= 0:
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
                
                res = run_hybrid_simulation(scenario, params, data, duration_hours=8, calibrated_params=calibrated_params)
                
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
    
    # Strategy 1: Target Production (if specified) or Max Profit
    if target_production > 0:
        # Filter for scenarios that meet at least 80% of target (relaxed constraint)
        # candidates = [r for r in results if r['total_tonase'] >= target_production * 0.8]
        # if not candidates: candidates = results
        
        # STRICTER LOGIC: We want the closest match, period.
        # Sort by absolute difference from target (closest first), then by profit
        strategy_1_target = sorted(results, key=lambda x: (abs(x['total_tonase'] - target_production), -x['Z_SCORE_PROFIT']))[:20]
        strategy_1_label = f'Target Production ({target_production} Ton)'
    else:
        strategy_1_target = sorted(results, key=lambda x: x['Z_SCORE_PROFIT'], reverse=True)[:20]
        strategy_1_label = 'Maximum Profit'
    
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
    
    best_primary = get_unique_strategy(strategy_1_target, seen)
    best_speed = get_unique_strategy(strategy_2_speed, seen)
    best_distance = get_unique_strategy(strategy_3_distance, seen)
    
    final_strategies = [best_primary, best_speed, best_distance]
    final_strategies = [s for s in final_strategies if s is not None]
    
    for i, strat in enumerate(final_strategies, 1):
        strat['rank'] = i
        if i == 1:
            strat['strategy_objective'] = strategy_1_label
        elif i == 2:
            strat['strategy_objective'] = 'Fastest Cycle Time'
        else:
            strat['strategy_objective'] = 'Shortest Distance'
    
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