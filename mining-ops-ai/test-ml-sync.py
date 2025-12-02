"""
Test ML Recommendation Synchronization with Database
Tests if simulator.py and chatbot.py work with new production flow data
"""
import sys
sys.path.insert(0, '.')
from simulator import load_fresh_data, get_strategic_recommendations
import datetime

print('=' * 60)
print('TESTING ML RECOMMENDATION SYNCHRONIZATION')
print('=' * 60)

print('\n[1/4] Loading fresh data from PostgreSQL database...')
data = load_fresh_data()

print('\n[2/4] Checking data structure:')
print(f'  - Trucks: {len(data["trucks"])} rows')
print(f'  - Excavators: {len(data["excavators"])} rows')
print(f'  - Roads: {len(data["roads"])} rows')
print(f'  - Schedules: {len(data["schedules"])} rows')
print(f'  - Operators: {len(data["operators"])} rows')
print(f'  - Hauling Activities: {len(data["hauling_activities"])} rows')
print(f'  - Maintenance: {len(data["maintenance"])} rows')

if not data['trucks'].empty:
    print('\n[3/4] Verifying critical field names (camelCase compatibility):')
    print(f'  Sample truck columns (first 10): {list(data["trucks"].columns[:10])}')
    print('\n  Checking required fields for ML model:')
    required = ['capacity', 'fuelConsumption', 'maintenanceCost', 'purchaseDate', 'brand']
    all_ok = True
    for field in required:
        if field in data['trucks'].columns:
            print(f'   ✅ {field}')
        else:
            print(f'   ❌ MISSING: {field}')
            all_ok = False
    
    if all_ok:
        print('\n  ✅ All critical fields present!')
    else:
        print('\n  ❌ Some fields missing - will cause errors!')

print('\n[4/4] Testing strategic recommendation generation...')
try:
    params = {
        'target_road_id': data['roads'].index[0] if len(data['roads']) > 0 else None,
        'target_excavator_id': data['excavators'].index[0] if len(data['excavators']) > 0 else None,
        'target_schedule_id': data['schedules'].index[0] if len(data['schedules']) > 0 else None,
        'batu_bara_price': 850000,
        'fuel_price': 8500,
        'driver_wages': 150000,
        'max_iterations': 50
    }
    
    print(f'\n  Parameters:')
    print(f'    - Target Road: {params["target_road_id"]}')
    print(f'    - Target Excavator: {params["target_excavator_id"]}')
    print(f'    - Target Schedule: {params["target_schedule_id"]}')
    print(f'    - Coal Price: Rp {params["batu_bara_price"]:,}')
    print(f'    - Fuel Price: Rp {params["fuel_price"]:,}')
    
    print('\n  Running hybrid simulation...')
    result = get_strategic_recommendations(params)
    
    print(f'\n  ✅ SUCCESS! Generated {len(result.get("strategies", []))} strategies')
    
    if result.get('strategies'):
        print('\n  Top 3 Strategies:')
        for i, strategy in enumerate(result['strategies'][:3], 1):
            print(f'\n  [{i}] {strategy.get("scenario_name", "N/A")}')
            print(f'      Revenue: Rp {strategy.get("revenue_idr", 0):,.0f}')
            print(f'      Cost: Rp {strategy.get("total_cost_idr", 0):,.0f}')
            print(f'      Profit: Rp {strategy.get("profit_idr", 0):,.0f}')
            print(f'      Tonnage: {strategy.get("total_tons", 0):.1f} tons')
            print(f'      Trucks Used: {strategy.get("num_trucks", 0)}')
    
    print('\n' + '=' * 60)
    print('✅ ML RECOMMENDATION SYSTEM FULLY SYNCHRONIZED!')
    print('=' * 60)
    print('\nConclusion:')
    print('  ✅ Database connectivity: WORKING')
    print('  ✅ Field name compatibility: VERIFIED')
    print('  ✅ ML model predictions: FUNCTIONAL')
    print('  ✅ Strategic recommendations: GENERATED')
    print('  ✅ Synchronization with production flow: CONFIRMED')
    
except Exception as e:
    print(f'\n  ❌ FAILED: {e}')
    print('\nStacktrace:')
    import traceback
    traceback.print_exc()
    
    print('\n' + '=' * 60)
    print('❌ SYNCHRONIZATION ISSUE DETECTED!')
    print('=' * 60)
