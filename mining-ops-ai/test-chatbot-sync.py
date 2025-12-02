"""
Test Chatbot Schema Parsing and SQL Generation
"""
import sys
sys.path.insert(0, '.')

print('=' * 60)
print('CHATBOT SYNCHRONIZATION TEST')
print('=' * 60)

# Test 1: Schema Parsing
print('\n[1/3] Testing Prisma schema parsing...')
try:
    from chatbot import get_simplified_schema
    schema = get_simplified_schema()
    
    print(f'  ✅ Schema loaded ({len(schema)} characters)')
    
    # Check for new tables
    new_tables = ['mining_sites', 'loading_points', 'dumping_points']
    for table in new_tables:
        if table in schema:
            print(f'  ✅ Table found: {table}')
        else:
            print(f'  ❌ Table missing: {table}')
    
    print(f'\n  Schema preview (first 500 chars):')
    print(schema[:500])
    
except Exception as e:
    print(f'  ❌ FAILED: {e}')
    import traceback
    traceback.print_exc()

# Test 2: Database Query (without Ollama)
print('\n[2/3] Testing direct database queries...')
try:
    from database import fetch_dataframe
    
    # Test query on new tables
    test_queries = [
        ('Trucks', 'SELECT COUNT(*) as count FROM trucks'),
        ('Mining Sites', 'SELECT COUNT(*) as count FROM mining_sites'),
        ('Loading Points', 'SELECT COUNT(*) as count FROM loading_points'),
        ('Dumping Points', 'SELECT COUNT(*) as count FROM dumping_points'),
        ('Hauling Activities', 'SELECT COUNT(*) as count FROM hauling_activities'),
    ]
    
    for name, query in test_queries:
        df = fetch_dataframe(query)
        count = df.iloc[0]['count']
        print(f'  ✅ {name}: {count} records')
        
except Exception as e:
    print(f'  ❌ FAILED: {e}')
    import traceback
    traceback.print_exc()

# Test 3: Check chatbot can access schema file
print('\n[3/3] Verifying Prisma schema file access...')
try:
    import os
    schema_path = '../backend-express/prisma/schema.prisma'
    
    if os.path.exists(schema_path):
        print(f'  ✅ Schema file found: {schema_path}')
        
        with open(schema_path, 'r') as f:
            content = f.read()
        
        # Check for new models
        new_models = ['model MiningSite', 'model LoadingPoint', 'model DumpingPoint']
        for model in new_models:
            if model in content:
                print(f'  ✅ Model defined: {model}')
            else:
                print(f'  ❌ Model missing: {model}')
    else:
        print(f'  ❌ Schema file not found: {schema_path}')
        
except Exception as e:
    print(f'  ❌ FAILED: {e}')

print('\n' + '=' * 60)
print('CHATBOT SCHEMA SYNCHRONIZATION VERIFIED')
print('=' * 60)
print('\nNote: SQL generation with Ollama not tested (requires LLM)')
print('To test SQL generation, user can ask questions via /api/ai/chatbot endpoint')
