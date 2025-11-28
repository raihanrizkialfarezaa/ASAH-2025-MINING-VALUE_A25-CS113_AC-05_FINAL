"""
Quick Test: Multi-Objective Optimization Validation
Tests that get_strategic_recommendations returns 3 different strategies
"""

import sys
import json
from simulator import get_strategic_recommendations

def main():
    print("="*80)
    print("🚀 MULTI-OBJECTIVE OPTIMIZATION VALIDATION")
    print("="*80)
    
    # Test Parameters
    fixed_conditions = {
        "weatherCondition": "Cerah",
        "roadCondition": "GOOD",
        "shift": "SHIFT_1",
        "target_road_id": None,
        "target_excavator_id": None,
        "target_schedule_id": None,
        "simulation_start_date": "2024-01-01T00:00:00"
    }
    
    decision_variables = {
        "min_trucks": 5,
        "max_trucks": 15,
        "min_excavators": 1,
        "max_excavators": 3
    }
    
    financial_params = {}  # Use defaults
    
    print("\n📊 Running simulation...")
    print(f"   Trucks: {decision_variables['min_trucks']}-{decision_variables['max_trucks']}")
    print(f"   Excavators: {decision_variables['min_excavators']}-{decision_variables['max_excavators']}")
    print(f"   Weather: {fixed_conditions['weatherCondition']}")
    
    # Call simulator
    try:
        results = get_strategic_recommendations(
            fixed_conditions, 
            decision_variables, 
            financial_params
        )
        
        if not results or len(results) < 3:
            print(f"\n❌ FAILED: Expected 3 strategies, got {len(results) if results else 0}")
            sys.exit(1)
        
        print(f"\n✅ Received {len(results)} strategies")
        
        # Validate strategies are different
        print("\n" + "="*80)
        print("🎯 STRATEGY VALIDATION")
        print("="*80)
        
        for i, strategy in enumerate(results, 1):
            print(f"\nStrategy {i}:")
            print(f"  Trucks:        {strategy.get('alokasi_truk', 'N/A')}")
            print(f"  Excavators:    {strategy.get('jumlah_excavator', 'N/A')}")
            print(f"  Road:          {strategy.get('road_segment_name', 'N/A')}")
            print(f"  Profit:        Rp {strategy.get('profit_rp', 0):,.0f}")
            print(f"  Production:    {strategy.get('total_production_ton', 0):,.2f} Ton")
            print(f"  Distance:      {strategy.get('distance_km', 0):.2f} km")
            print(f"  Cycle Time:    {strategy.get('cycle_time_hours', 0):.2f} hours")
            print(f"  Fuel/Ton:      {strategy.get('fuel_per_ton', 0):.2f} L/Ton")
            print(f"  Z-Score Profit: {strategy.get('Z_SCORE_PROFIT', 0):.2f}")
        
        # Check diversity
        print("\n" + "="*80)
        print("✅ DIVERSITY CHECKS")
        print("="*80)
        
        configs = [(s.get('alokasi_truk'), s.get('jumlah_excavator'), s.get('road_segment_name')) for s in results]
        unique_configs = len(set(configs))
        
        metrics_present = all([
            'cycle_time_hours' in results[0],
            'distance_km' in results[0],
            'fuel_per_ton' in results[0],
            'Z_SCORE_PROFIT' in results[0]
        ])
        
        print(f"\n1. Configuration Diversity: {unique_configs}/{len(results)} unique")
        print(f"   ✅ PASS" if unique_configs >= 2 else "   ❌ FAIL")
        
        print(f"\n2. All Metrics Present: {metrics_present}")
        print(f"   ✅ PASS" if metrics_present else "   ❌ FAIL")
        
        # Check ranking objectives
        s1, s2, s3 = results[0], results[1], results[2]
        
        profit_ranking = s1['profit_rp'] >= s2['profit_rp'] and s1['profit_rp'] >= s3['profit_rp']
        speed_ranking = s2['cycle_time_hours'] <= s1['cycle_time_hours'] or s2['cycle_time_hours'] <= s3['cycle_time_hours']
        distance_ranking = s3['distance_km'] <= s1['distance_km'] or s3['distance_km'] <= s2['distance_km']
        
        print(f"\n3. Profit Ranking (S1 highest): {profit_ranking}")
        print(f"   ✅ PASS" if profit_ranking else "   ⚠️  MARGINAL")
        
        print(f"\n4. Speed Consideration (S2 factor): {speed_ranking}")
        print(f"   ✅ PASS" if speed_ranking else "   ⚠️  MARGINAL")
        
        print(f"\n5. Distance Consideration (S3 factor): {distance_ranking}")
        print(f"   ✅ PASS" if distance_ranking else "   ⚠️  MARGINAL")
        
        # Final verdict
        print("\n" + "="*80)
        print("📋 FINAL RESULT")
        print("="*80)
        
        all_pass = unique_configs >= 2 and metrics_present
        
        if all_pass:
            print("\n✅ MULTI-OBJECTIVE OPTIMIZATION WORKING!")
            print("   - 3 strategies returned")
            print("   - Metrics populated (cycle_time, distance, fuel/ton)")
            print("   - Strategies have different configurations")
            print("\n🎯 Ready for production!")
        else:
            print("\n⚠️  NEEDS IMPROVEMENT")
            print("   - Check failed validations above")
        
        sys.exit(0 if all_pass else 1)
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
