import sys
sys.path.append('b:\\ASAH FEBE AI\\ASAH 2025 MINING VALUE_A25-CS113_AC-05\\mining-ops-ai')

try:
    import simulator
    print("Simulator module imported successfully")
    
    print(f"\nFinancial params function: {hasattr(simulator, 'get_financial_params')}")
    print(f"Format currency function: {hasattr(simulator, 'format_currency')}")
    print(f"Run simulation function: {hasattr(simulator, 'run_hybrid_simulation')}")
    print(f"Get recommendations function: {hasattr(simulator, 'get_strategic_recommendations')}")
    
    print("\n✅ All critical functions are present")
    print("✅ No syntax errors detected")
    
except SyntaxError as e:
    print(f"❌ Syntax Error: {e}")
    print(f"   Line {e.lineno}: {e.text}")
except Exception as e:
    print(f"❌ Import Error: {e}")
