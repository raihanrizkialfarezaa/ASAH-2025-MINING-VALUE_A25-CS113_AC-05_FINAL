import requests
import json

API_URL = "http://localhost:8000"

def test_ai_service():
    print("=" * 60)
    print("Testing AI Recommendation Service - Dynamic Results")
    print("=" * 60)
    
    test_scenarios = [
        {
            "name": "Scenario 1: Cerah + Good Road",
            "payload": {
                "fixed_conditions": {
                    "weatherCondition": "Cerah",
                    "roadCondition": "GOOD",
                    "shift": "SHIFT_1",
                    "target_road_id": "cmig045r902s2i6obx20hoy6b",
                    "target_excavator_id": "cmig0484r05ddi6obwyjt7t4y",
                    "target_schedule_id": "cmig04ay30782i6obij5gmgb5"
                },
                "decision_variables": {
                    "alokasi_truk": [5, 10],
                    "jumlah_excavator": [1, 2]
                }
            }
        },
        {
            "name": "Scenario 2: Hujan Lebat + Poor Road",
            "payload": {
                "fixed_conditions": {
                    "weatherCondition": "Hujan Lebat",
                    "roadCondition": "POOR",
                    "shift": "SHIFT_2",
                    "target_road_id": "cmig045r902s2i6obx20hoy6b",
                    "target_excavator_id": "cmig0484r05ddi6obwyjt7t4y",
                    "target_schedule_id": "cmig04ay30782i6obij5gmgb5"
                },
                "decision_variables": {
                    "alokasi_truk": [5, 10],
                    "jumlah_excavator": [1, 2]
                }
            }
        },
        {
            "name": "Scenario 3: Different Truck Allocation",
            "payload": {
                "fixed_conditions": {
                    "weatherCondition": "Cerah",
                    "roadCondition": "GOOD",
                    "shift": "SHIFT_1",
                    "target_road_id": "cmig045r902s2i6obx20hoy6b",
                    "target_excavator_id": "cmig0484r05ddi6obwyjt7t4y",
                    "target_schedule_id": "cmig04ay30782i6obij5gmgb5"
                },
                "decision_variables": {
                    "alokasi_truk": [15, 20],
                    "jumlah_excavator": [2, 3]
                }
            }
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\n{'=' * 60}")
        print(f"Testing: {scenario['name']}")
        print(f"{'=' * 60}")
        
        try:
            response = requests.post(
                f"{API_URL}/get_top_3_strategies",
                json=scenario['payload'],
                timeout=120
            )
            
            if response.status_code == 200:
                data = response.json()
                strategies = data.get('top_3_strategies', [])
                
                print(f"\n✅ SUCCESS - Received {len(strategies)} strategies")
                
                for i, strategy in enumerate(strategies, 1):
                    opsi_key = f"OPSI_{i}"
                    if opsi_key in strategy:
                        opsi = strategy[opsi_key]
                        kpi = opsi.get('KPI_PREDIKSI', {})
                        instruksi = opsi.get('INSTRUKSI_FLAT', {})
                        
                        print(f"\n  Strategy {i}:")
                        print(f"    Trucks: {instruksi.get('JUMLAH_DUMP_TRUCK')}")
                        print(f"    Excavators: {instruksi.get('JUMLAH_EXCAVATOR')}")
                        print(f"    Profit: {kpi.get('PROFIT')}")
                        print(f"    Production: {kpi.get('PRODUKSI')}")
                        print(f"    Fuel Ratio: {kpi.get('FUEL_RATIO')}")
                        print(f"    Queue Time: {kpi.get('IDLE_ANTRIAN')}")
            else:
                print(f"\n❌ ERROR - Status: {response.status_code}")
                print(f"Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"\n❌ ERROR - Cannot connect to AI service at {API_URL}")
            print("Please ensure the AI service is running (python -m uvicorn main:app --reload --port 8000)")
            break
        except Exception as e:
            print(f"\n❌ ERROR - {str(e)}")
    
    print(f"\n{'=' * 60}")
    print("Test Complete")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    test_ai_service()
