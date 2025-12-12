import os
from sqlalchemy import create_engine, text
import pandas as pd

# Default to the one found in backend .env if not set
DEFAULT_DB_URL = "postgresql://postgres:A25-CS113@localhost:5432/mining_db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

# Remove schema param if present as it causes issues with psycopg2
if "?schema=" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

engine = None

def get_engine():
    global engine
    if engine is None:
        try:
            engine = create_engine(DATABASE_URL)
            print(f"✅ Connected to Database: {DATABASE_URL.split('@')[1]}") # Hide credentials
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
    return engine

def get_connection():
    return get_engine().connect()

def execute_query(query, params=None):
    with get_connection() as conn:
        result = conn.execute(text(query), params or {})
        return result

def fetch_dataframe(query, params=None):
    if params:
        return pd.read_sql(text(query), get_engine(), params=params)
    return pd.read_sql(query, get_engine(), params=params)
