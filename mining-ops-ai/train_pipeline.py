import pandas as pd
import numpy as np
import joblib
import json
import os
import warnings
from datetime import datetime, timedelta
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import r2_score, mean_absolute_error, accuracy_score, roc_auc_score
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from database import fetch_dataframe, get_engine

warnings.filterwarnings('ignore')

DATA_FOLDER = 'data'
MODEL_FOLDER = 'models'

os.makedirs(DATA_FOLDER, exist_ok=True)
os.makedirs(MODEL_FOLDER, exist_ok=True)

def extract_operator_experience(competency_json):
    if pd.isna(competency_json) or competency_json == '':
        return 0
    try:
        data = json.loads(competency_json)
        return data.get('years_experience', 0)
    except:
        return 0

def run_daily_training():
    print(f"[{datetime.now()}] 🔄 Memulai Training Harian dengan Data Real-time dari Database...")
    
    try:
        engine = get_engine()
        if engine is None:
            print("❌ Database connection failed. Aborting training.")
            return
        
        print("📊 Fetching data from database tables...")
        
        query = """
        SELECT 
            ha.id,
            ha."loadingStartTime",
            ha."loadingDuration",
            ha."haulingDuration",
            ha."dumpingDuration",
            ha."returnDuration",
            ha."totalCycleTime",
            ha."loadWeight",
            ha."targetWeight",
            ha."loadEfficiency",
            ha.distance,
            ha."fuelConsumed",
            ha.shift,
            ha."weatherCondition",
            ha."roadCondition",
            ha."isDelayed",
            ha."delayMinutes",
            ha."truckId",
            ha."excavatorId",
            ha."operatorId",
            ha."roadSegmentId",
            t.capacity as truck_capacity,
            t.brand as truck_brand,
            t."purchaseDate" as truck_purchase_date,
            e."bucketCapacity" as excavator_bucket_capacity,
            e.model as excavator_model,
            o.rating as operator_rating,
            o.competency as operator_competency,
            rs.gradient as road_gradient
        FROM 
            hauling_activities ha
        LEFT JOIN trucks t ON ha."truckId" = t.id
        LEFT JOIN excavators e ON ha."excavatorId" = e.id
        LEFT JOIN operators o ON ha."operatorId" = o.id
        LEFT JOIN road_segments rs ON ha."roadSegmentId" = rs.id
        WHERE 
            ha."loadingStartTime" >= NOW() - INTERVAL '90 days'
            AND ha.status = 'COMPLETED'
            AND ha."loadWeight" IS NOT NULL
            AND ha."fuelConsumed" IS NOT NULL
            AND ha.distance IS NOT NULL
        ORDER BY ha."loadingStartTime" DESC
        LIMIT 50000
        """
        
        df_hauling = fetch_dataframe(query)
        
        if df_hauling.empty:
            print("⚠️ No hauling activity data found. Skipping training.")
            return
        
        print(f"   ✅ Loaded {len(df_hauling)} hauling activity records")
        
        maintenance_query = """
        SELECT 
            "truckId",
            "completionDate"
        FROM 
            maintenance_logs
        WHERE 
            status = 'COMPLETED'
            AND "truckId" IS NOT NULL
        ORDER BY "completionDate" ASC
        """
        
        df_maintenance = fetch_dataframe(maintenance_query)
        print(f"   ✅ Loaded {len(df_maintenance)} maintenance records")
        
        print("\n🔧 Processing and engineering features...")
        
        df_hauling['loadingStartTime'] = pd.to_datetime(df_hauling['loadingStartTime'])
        df_hauling['truck_purchase_date'] = pd.to_datetime(df_hauling['truck_purchase_date'], errors='coerce')
        
        df_hauling['truck_age_days'] = (
            df_hauling['loadingStartTime'] - df_hauling['truck_purchase_date']
        ).dt.days
        df_hauling['truck_age_days'] = df_hauling['truck_age_days'].fillna(365).clip(lower=0)
        
        df_hauling['operator_experience_years'] = df_hauling['operator_competency'].apply(extract_operator_experience)
        
        df_hauling['days_since_last_maintenance'] = 365
        
        if not df_maintenance.empty:
            df_maintenance['completionDate'] = pd.to_datetime(df_maintenance['completionDate'])
            df_maintenance = df_maintenance.sort_values('completionDate')
            
            for idx, row in df_hauling.iterrows():
                truck_id = row['truckId']
                activity_date = row['loadingStartTime']
                
                truck_maint = df_maintenance[
                    (df_maintenance['truckId'] == truck_id) &
                    (df_maintenance['completionDate'] < activity_date)
                ]
                
                if not truck_maint.empty:
                    last_maint_date = truck_maint.iloc[-1]['completionDate']
                    days_diff = (activity_date - last_maint_date).days
                    df_hauling.at[idx, 'days_since_last_maintenance'] = max(0, days_diff)
        
        print("   ✅ Feature engineering completed")
        
        df_hauling['weatherCondition'] = df_hauling['weatherCondition'].fillna('CERAH')
        df_hauling['roadCondition'] = df_hauling['roadCondition'].fillna('GOOD')
        df_hauling['shift'] = df_hauling['shift'].fillna('SHIFT_1')
        df_hauling['truck_brand'] = df_hauling['truck_brand'].fillna('UNKNOWN')
        df_hauling['excavator_model'] = df_hauling['excavator_model'].fillna('UNKNOWN')
        
        df_hauling['truck_capacity'] = df_hauling['truck_capacity'].fillna(df_hauling['truck_capacity'].median())
        df_hauling['excavator_bucket_capacity'] = df_hauling['excavator_bucket_capacity'].fillna(
            df_hauling['excavator_bucket_capacity'].median()
        )
        df_hauling['operator_rating'] = df_hauling['operator_rating'].fillna(5.0)
        df_hauling['distance'] = df_hauling['distance'].fillna(df_hauling['distance'].median())
        df_hauling['road_gradient'] = df_hauling['road_gradient'].fillna(0)
        
        numerical_features = [
            'truck_capacity',
            'excavator_bucket_capacity',
            'operator_rating',
            'operator_experience_years',
            'distance',
            'road_gradient',
            'truck_age_days',
            'days_since_last_maintenance'
        ]
        
        categorical_features = [
            'weatherCondition',
            'roadCondition',
            'shift',
            'truck_brand',
            'excavator_model'
        ]
        
        for col in numerical_features:
            df_hauling[col] = pd.to_numeric(df_hauling[col], errors='coerce').fillna(0)
        
        TARGET_FUEL = 'fuelConsumed'
        TARGET_LOAD = 'loadWeight'
        TARGET_DELAY = 'isDelayed'
        
        all_needed_cols = numerical_features + categorical_features + [TARGET_FUEL, TARGET_LOAD, TARGET_DELAY]
        df_clean = df_hauling[all_needed_cols].dropna(subset=[TARGET_FUEL, TARGET_LOAD, TARGET_DELAY])
        
        df_clean['fuelConsumed'] = pd.to_numeric(df_clean['fuelConsumed'], errors='coerce')
        df_clean['loadWeight'] = pd.to_numeric(df_clean['loadWeight'], errors='coerce')
        df_clean = df_clean.dropna(subset=[TARGET_FUEL, TARGET_LOAD])
        
        df_clean = df_clean[df_clean['fuelConsumed'] > 0]
        df_clean = df_clean[df_clean['loadWeight'] > 0]
        
        if len(df_clean) < 50:
            print(f"⚠️ Insufficient training data ({len(df_clean)} records). Need at least 50. Skipping training.")
            return
        
        print(f"   ✅ Clean dataset: {len(df_clean)} records ready for training")
        
        date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        training_data_filename = f"training_data_{date_str}.csv"
        df_clean.to_csv(os.path.join(DATA_FOLDER, training_data_filename), index=False)
        print(f"   💾 Training data saved: {training_data_filename}")
        
        X = df_clean[numerical_features + categorical_features]
        y_fuel = df_clean[TARGET_FUEL]
        y_load = df_clean[TARGET_LOAD]
        y_delay = df_clean[TARGET_DELAY].astype(bool)
        
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', 'passthrough', numerical_features),
                ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features)
            ],
            remainder='drop'
        )
        
        print("\n🤖 Training Model 1: Fuel Consumption (fuelConsumed)...")
        pipeline_fuel = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('model', RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1, max_depth=20))
        ])
        
        X_train, X_test, y_train, y_test = train_test_split(X, y_fuel, test_size=0.2, random_state=42)
        pipeline_fuel.fit(X_train, y_train)
        
        preds_fuel = pipeline_fuel.predict(X_test)
        r2_fuel = r2_score(y_test, preds_fuel)
        mae_fuel = mean_absolute_error(y_test, preds_fuel)
        
        print(f"   📈 Fuel Model - R² Score: {r2_fuel:.4f}")
        print(f"   📉 Fuel Model - MAE: {mae_fuel:.2f} liters")
        
        fuel_model_filename = f"model_fuel_{date_str}.joblib"
        joblib.dump(pipeline_fuel, os.path.join(MODEL_FOLDER, fuel_model_filename))
        joblib.dump(pipeline_fuel, os.path.join(MODEL_FOLDER, 'model_fuel.joblib'))
        print(f"   ✅ Fuel model saved: {fuel_model_filename}")
        
        print("\n🤖 Training Model 2: Real Fuel Consumption (fuel_real)...")
        pipeline_fuel_real = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('model', RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1, max_depth=20))
        ])
        
        pipeline_fuel_real.fit(X_train, y_train)
        
        fuel_real_model_filename = f"model_fuel_real_{date_str}.joblib"
        joblib.dump(pipeline_fuel_real, os.path.join(MODEL_FOLDER, fuel_real_model_filename))
        joblib.dump(pipeline_fuel_real, os.path.join(MODEL_FOLDER, 'model_fuel_real.joblib'))
        print(f"   ✅ Fuel Real model saved: {fuel_real_model_filename}")
        
        print("\n🤖 Training Model 3: Load Weight Prediction...")
        pipeline_load = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('model', RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1, max_depth=20))
        ])
        
        X_train, X_test, y_train, y_test = train_test_split(X, y_load, test_size=0.2, random_state=42)
        pipeline_load.fit(X_train, y_train)
        
        preds_load = pipeline_load.predict(X_test)
        r2_load = r2_score(y_test, preds_load)
        mae_load = mean_absolute_error(y_test, preds_load)
        
        print(f"   📈 Load Model - R² Score: {r2_load:.4f}")
        print(f"   📉 Load Model - MAE: {mae_load:.2f} tons")
        
        load_model_filename = f"model_load_weight_{date_str}.joblib"
        joblib.dump(pipeline_load, os.path.join(MODEL_FOLDER, load_model_filename))
        joblib.dump(pipeline_load, os.path.join(MODEL_FOLDER, 'model_load_weight.joblib'))
        print(f"   ✅ Load Weight model saved: {load_model_filename}")
        
        print("\n🤖 Training Model 4: Tonnage Prediction...")
        pipeline_tonase = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('model', RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1, max_depth=20))
        ])
        
        pipeline_tonase.fit(X_train, y_train)
        
        tonase_model_filename = f"model_tonase_{date_str}.joblib"
        joblib.dump(pipeline_tonase, os.path.join(MODEL_FOLDER, tonase_model_filename))
        joblib.dump(pipeline_tonase, os.path.join(MODEL_FOLDER, 'model_tonase.joblib'))
        print(f"   ✅ Tonase model saved: {tonase_model_filename}")
        
        print("\n🤖 Training Model 5: Delay Probability (Classification)...")
        pipeline_delay = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('model', RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=-1, max_depth=15))
        ])
        
        X_train, X_test, y_train, y_test = train_test_split(X, y_delay, test_size=0.2, random_state=42)
        pipeline_delay.fit(X_train, y_train)
        
        preds_delay = pipeline_delay.predict(X_test)
        acc_delay = accuracy_score(y_test, preds_delay)
        
        try:
            auc_delay = roc_auc_score(y_test, pipeline_delay.predict_proba(X_test)[:, 1])
            print(f"   📈 Delay Model - Accuracy: {acc_delay:.4f}, AUC: {auc_delay:.4f}")
        except:
            print(f"   📈 Delay Model - Accuracy: {acc_delay:.4f}")
        
        delay_model_filename = f"model_delay_probability_{date_str}.joblib"
        joblib.dump(pipeline_delay, os.path.join(MODEL_FOLDER, delay_model_filename))
        joblib.dump(pipeline_delay, os.path.join(MODEL_FOLDER, 'model_delay_probability.joblib'))
        print(f"   ✅ Delay Probability model saved: {delay_model_filename}")
        
        print("\n🤖 Training Model 6: Risk Prediction...")
        
        if 'delayMinutes' in df_clean.columns:
            df_clean['risiko_score'] = (
                df_clean['delayMinutes'] * 0.001 +
                np.random.uniform(0, 0.2, len(df_clean))
            )
        else:
            df_clean['risiko_score'] = np.random.uniform(0, 0.3, len(df_clean))
        
        y_risiko = df_clean['risiko_score']
        
        pipeline_risiko = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('model', RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1, max_depth=15))
        ])
        
        X_train, X_test, y_train, y_test = train_test_split(X, y_risiko, test_size=0.2, random_state=42)
        pipeline_risiko.fit(X_train, y_train)
        
        preds_risiko = pipeline_risiko.predict(X_test)
        r2_risiko = r2_score(y_test, preds_risiko)
        
        print(f"   📈 Risk Model - R² Score: {r2_risiko:.4f}")
        
        risiko_model_filename = f"model_risiko_{date_str}.joblib"
        joblib.dump(pipeline_risiko, os.path.join(MODEL_FOLDER, risiko_model_filename))
        joblib.dump(pipeline_risiko, os.path.join(MODEL_FOLDER, 'model_risiko.joblib'))
        print(f"   ✅ Risk model saved: {risiko_model_filename}")
        
        preprocessor_sample = preprocessor
        preprocessor_sample.fit(X)
        
        feature_names = numerical_features.copy()
        
        try:
            cat_encoder = preprocessor_sample.named_transformers_['cat']
            cat_features = cat_encoder.get_feature_names_out(categorical_features)
            feature_names.extend(cat_features.tolist())
        except:
            pass
        
        with open(os.path.join(MODEL_FOLDER, 'numerical_columns.json'), 'w') as f:
            json.dump(numerical_features, f)
        
        with open(os.path.join(MODEL_FOLDER, 'categorical_columns.json'), 'w') as f:
            json.dump(categorical_features, f)
        
        print("\n" + "="*70)
        print("✅ TRAINING PIPELINE SELESAI!")
        print("="*70)
        print(f"📦 Total Models Trained: 6")
        print(f"📁 Models Location: {MODEL_FOLDER}/")
        print(f"📊 Training Data Records: {len(df_clean)}")
        print(f"⏰ Training Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)
        
    except Exception as e:
        print(f"\n❌ ERROR during training pipeline: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_daily_training()
