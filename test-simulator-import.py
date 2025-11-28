import sys
sys.path.insert(0, 'b:\\ASAH FEBE AI\\ASAH 2025 MINING VALUE_A25-CS113_AC-05\\mining-ops-ai')

print("Testing simulator.py imports and functionality...")

try:
    from simulator import load_models, load_fresh_data, CONFIG
    print("✅ Successfully imported simulator modules")
    
    print("\nLoading ML models...")
    load_models()
    print("✅ ML models loaded")
    
    print("\nLoading fresh data from database...")
    data = load_fresh_data()
    print(f"✅ Data loaded:")
    print(f"  - Trucks: {len(data['trucks'])}")
    print(f"  - Excavators: {len(data['excavators'])}")
    print(f"  - Operators: {len(data['operators'])}")
    print(f"  - Roads: {len(data['roads'])}")
    print(f"  - Schedules: {len(data['schedules'])}")
    print(f"  - Vessels: {len(data['vessels'])}")
    
    print("\n✅ All tests passed!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
