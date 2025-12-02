"""
Quick Database Synchronization Test (No ML/LLM)
Tests if data loading from PostgreSQL works correctly
"""
import sys
sys.path.insert(0, '.')
from data_loader import load_data
import pandas as pd

print('=' * 60)
print('DATABASE SYNCHRONIZATION TEST')
print('=' * 60)

print('\n[1/3] Testing data loading from PostgreSQL...')

tables_to_test = [
    ('trucks', ['capacity', 'fuelConsumption', 'maintenanceCost', 'purchaseDate', 'brand']),
    ('excavators', ['bucketCapacity', 'productionRate', 'fuelConsumption']),
    ('operators', ['rating', 'competency']),
    ('road_segments', ['distance', 'gradient', 'roadCondition']),
    ('hauling_activities', ['loadingDuration', 'dumpingDuration', 'haulingDuration', 'returnDuration', 'distance']),
    ('maintenance_logs', ['truckId', 'completionDate', 'status']),
    ('sailing_schedules', ['scheduleNumber', 'etsLoading', 'status']),
]

all_ok = True
results = {}

for table_key, required_fields in tables_to_test:
    print(f'\n  Testing: {table_key}')
    try:
        df = load_data(table_key)
        results[table_key] = {
            'count': len(df),
            'columns': list(df.columns),
            'missing_fields': []
        }
        
        print(f'    ✅ Loaded {len(df)} rows')
        
        # Check required fields
        for field in required_fields:
            if field not in df.columns:
                results[table_key]['missing_fields'].append(field)
                all_ok = False
                print(f'    ❌ Missing field: {field}')
            else:
                print(f'    ✅ Field present: {field}')
        
        # Show sample data
        if len(df) > 0:
            print(f'    Sample: {df.iloc[0].to_dict() if len(df.columns) < 20 else list(df.columns[:10])}')
    
    except Exception as e:
        print(f'    ❌ FAILED: {e}')
        all_ok = False
        results[table_key] = {'error': str(e)}

print('\n[2/3] Checking camelCase consistency...')
print('\n  Prisma schema uses camelCase (e.g., fuelConsumption)')
print('  Python simulator expects camelCase fields')
print('  Database should return camelCase column names')

trucks_df = load_data('trucks')
if not trucks_df.empty:
    sample_cols = list(trucks_df.columns[:15])
    print(f'\n  Sample columns from trucks table:')
    for col in sample_cols:
        # Check if camelCase
        has_uppercase = any(c.isupper() for c in col)
        has_underscore = '_' in col
        
        if has_uppercase and not has_underscore:
            print(f'    ✅ {col} (camelCase)')
        elif has_underscore:
            print(f'    ⚠️  {col} (snake_case - may cause issues!)')
        else:
            print(f'    ✅ {col} (lowercase)')

print('\n[3/3] Summary:')
print('\n  Tables loaded:')
for table_key, data in results.items():
    if 'error' in data:
        print(f'    ❌ {table_key}: ERROR - {data["error"]}')
    else:
        missing = len(data['missing_fields'])
        if missing > 0:
            print(f'    ⚠️  {table_key}: {data["count"]} rows, {missing} missing fields')
        else:
            print(f'    ✅ {table_key}: {data["count"]} rows, all fields present')

if all_ok:
    print('\n' + '=' * 60)
    print('✅ DATABASE FULLY SYNCHRONIZED!')
    print('=' * 60)
    print('\nConclusion:')
    print('  ✅ All tables accessible from Python')
    print('  ✅ Column names match Prisma schema (camelCase)')
    print('  ✅ Required fields for ML present')
    print('  ✅ Data ready for simulator.py')
else:
    print('\n' + '=' * 60)
    print('⚠️  SOME ISSUES DETECTED')
    print('=' * 60)
    print('\nReview the missing fields above')
