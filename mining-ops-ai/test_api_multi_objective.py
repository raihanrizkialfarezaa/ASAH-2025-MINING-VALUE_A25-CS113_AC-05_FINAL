"""
Quick API Test: Validates Multi-Objective Optimization via HTTP
"""
import requests
import json

def test_multi_objective():
    print("="*80)
    print("🚀 MULTI-OBJECTIVE OPTIMIZATION API TEST")
    print("="*80)
    
    url = "http://localhost:8000/get_top_3_strategies"
    
    payload = {
        "fixed_conditions": {
            "weatherCondition": "Cerah",
            "roadCondition": "GOOD",
            "shift": "SHIFT_1",
            "target_road_id": None,
            "target_excavator_id": None,
            "target_schedule_id": None,
            "simulation_start_date": "2024-01-01T00:00:00"
        },
        "decision_variables": {
            "min_trucks": 5,
            "max_trucks": 15,
            "min_excavators": 1,
            "max_excavators": 3
        }
    }
    
    print("\n📡 Calling AI Service...")
    print(f"   URL: {url}")
    print(f"   Trucks: {payload['decision_variables']['min_trucks']}-{payload['decision_variables']['max_trucks']}")
    print(f"   Excavators: {payload['decision_variables']['min_excavators']}-{payload['decision_variables']['max_excavators']}")
    
    try:
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        
        data = response.json()
        strategies = data.get('top_3_strategies', [])
        
        print(f"\n✅ Received response")
        print(f"   Status: {response.status_code}")
        
        if isinstance(strategies, list):
            print(f"   Strategies: {len(strategies)}")
        elif isinstance(strategies, dict):
            print(f"   Strategies: {len(strategies.keys())} (dict format)")
            print(f"   Keys: {list(strategies.keys())}")
        
        # Pretty print first strategy
        print("\n📊 First Strategy Structure:")
        if isinstance(strategies, dict):
            first_key = list(strategies.keys())[0]
            first_strategy = strategies[first_key]
            print(json.dumps(first_strategy, indent=2))
        else:
            print(json.dumps(strategies[0] if strategies else {}, indent=2))
        
        print("\n" + "="*80)
        print("✅ API TEST COMPLETE")
        print("="*80)
        print("\nNote: API returns LLM-formatted data (strings like '1.02 Miliar IDR')")
        print("This is expected for chatbot integration.")
        print("\nTo validate multi-objective logic, check:")
        print("  1. All 3 strategies (OPSI_1, OPSI_2, OPSI_3) present")
        print("  2. Different JUMLAH_DUMP_TRUCK / JUMLAH_EXCAVATOR")
        print("  3. Different JALUR_ANGKUT (road segments)")
        print("  4. Different KPI values (PROFIT, PRODUKSI, etc.)")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to AI service")
        print("   Make sure Python AI service is running on port 8000")
    except requests.exceptions.Timeout:
        print("\n❌ ERROR: Request timeout (>120s)")
        print("   Simulation taking too long")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_multi_objective()
