import pandas as pd
import os
from database import fetch_dataframe
import warnings

DATA_FOLDER = 'data'

# Mapping from "logical name" (used in code) to DB table name
TABLE_MAPPING = {
    'trucks': 'trucks',
    'excavators': 'excavators',
    'operators': 'operators',
    'road_segments': 'road_segments',
    'hauling_activities': 'hauling_activities',
    'maintenance_logs': 'maintenance_logs',
    'sailing_schedules': 'sailing_schedules',
    'weather_logs': 'weather_logs',
    'production_records': 'production_records',
    'incident_reports': 'incident_reports',
    'fuel_consumption': 'fuel_consumption',
    'vessels': 'vessels'
}

def load_data(table_key, csv_filename=None):
    """
    Loads data from Postgres. If fails or empty, falls back to CSV.
    """
    df = None
    
    # 1. Try loading from Database
    if table_key in TABLE_MAPPING:
        db_table = TABLE_MAPPING[table_key]
        try:
            print(f"🔄 Loading '{table_key}' from Database table '{db_table}'...")
            query = f"SELECT * FROM {db_table}"
            df = fetch_dataframe(query)
            if not df.empty:
                print(f"✅ Loaded {len(df)} rows from Database for '{table_key}'.")
                # Handle specific column conversions if necessary to match CSV format
                # e.g. ensure dates are datetime objects if CSV loader did that
                return df
            else:
                print(f"⚠️ Database table '{db_table}' is empty.")
        except Exception as e:
            print(f"⚠️ Failed to load from Database: {e}")
    
    # 2. Fallback to CSV
    if csv_filename:
        csv_path = os.path.join(DATA_FOLDER, csv_filename)
        if os.path.exists(csv_path):
            print(f"📂 Fallback: Loading '{table_key}' from CSV '{csv_filename}'...")
            df = pd.read_csv(csv_path)
            print(f"✅ Loaded {len(df)} rows from CSV.")
            return df
        else:
            print(f"❌ CSV file not found: {csv_path}")
    
    return pd.DataFrame() # Return empty DF if all fails
