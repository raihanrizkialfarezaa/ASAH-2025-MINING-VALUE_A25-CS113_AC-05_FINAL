import ollama
import pandas as pd
from database import fetch_dataframe
import json
import os
import re

MODEL_NAME = "qwen2.5:7b"

def get_simplified_schema():
    try:
        schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend-express', 'prisma', 'schema.prisma'))
        if not os.path.exists(schema_path):
            return "Schema file not found."
            
        with open(schema_path, 'r') as f:
            content = f.read()
            
        models = []
        lines = content.split('\n')
        current_model = None
        
        for line in lines:
            line = line.strip()
            if line.startswith('model '):
                model_name = line.split(' ')[1]
                current_model = {'name': model_name, 'fields': [], 'map': model_name}
            elif line.startswith('@@map(') and current_model:
                map_name = line.split('"')[1]
                current_model['map'] = map_name
            elif line == '}' and current_model:
                models.append(current_model)
                current_model = None
            elif current_model and line and not line.startswith('//') and not line.startswith('@@'):
                parts = line.split()
                if len(parts) >= 2:
                    field_name = parts[0]
                    field_type = parts[1]
                    clean_type = field_type.replace('?', '').replace('[]', '')
                    current_model['fields'].append(f"{field_name} ({clean_type})")
                    
        schema_text = ""
        for m in models:
            schema_text += f"Table: {m['map']} (Model: {m['name']})\n"
            schema_text += f"Columns: {', '.join(m['fields'])}\n\n"
            
        return schema_text
    except Exception as e:
        return f"Error parsing schema: {e}"

SCHEMA_CONTEXT = get_simplified_schema()

def generate_sql_query(user_question):
    prompt = f"""
    You are a PostgreSQL expert. Your task is to convert the user's question into a valid SQL query based on the schema below.
    
    DATABASE SCHEMA:
    {SCHEMA_CONTEXT}
    
    RULES:
    1. Return ONLY the SQL query. Do not include any explanation, markdown, or code blocks.
    2. The query must be READ-ONLY (SELECT).
    3. Use the 'Table' name specified in the schema (e.g., use 'excavators', not 'Excavator').
    4. For questions about "jumlah" or "total", use COUNT(*).
    5. For questions about "list" or "daftar", SELECT relevant columns.
    6. If the question is unclear, try to select the most relevant table.
    7. Always use double quotes for column names if they are camelCase (e.g. "isActive", "fuelConsumption").
    
    EXAMPLES:
    Q: "Berapa jumlah excavator?"
    SQL: SELECT COUNT(*) FROM excavators;
    
    Q: "Tampilkan daftar truk yang aktif"
    SQL: SELECT * FROM trucks WHERE "isActive" = true;
    
    Q: "Siapa operator truk TR-01?"
    SQL: SELECT t.code, o."employeeNumber" FROM trucks t JOIN operators o ON t."currentOperatorId" = o.id WHERE t.code = 'TR-01';

    User Question: {user_question}
    SQL Query:
    """
    
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'system', 'content': 'You are a SQL generator. Output only raw SQL query.'},
            {'role': 'user', 'content': prompt}
        ])
        sql = response['message']['content'].strip()
        
        sql = re.sub(r'```sql\s*', '', sql, flags=re.IGNORECASE)
        sql = re.sub(r'```', '', sql)
        sql = sql.strip()
        
        return sql
    except Exception as e:
        print(f"Error generating SQL: {e}")
        return None

def execute_and_summarize_stream(user_question):
    # Step 1: Receive question
    yield json.dumps({"type": "step", "status": "thinking", "message": "Menerima pertanyaan user"}) + "\n"
    
    # Step 2: Generate SQL
    yield json.dumps({"type": "step", "status": "thinking", "message": "Menyusun query ke database"}) + "\n"
    sql_query = generate_sql_query(user_question)
    
    if not sql_query:
        yield json.dumps({"type": "error", "message": "Gagal membuat query SQL"}) + "\n"
        return

    yield json.dumps({"type": "step", "status": "generated_sql", "message": "Berhasil membuat query ke database", "detail": sql_query}) + "\n"
    yield json.dumps({"type": "sql", "query": sql_query}) + "\n"

    if not sql_query.upper().startswith("SELECT"):
        yield json.dumps({"type": "error", "message": "Query ditolak (Bukan SELECT)"}) + "\n"
        return

    # Step 3: Execute
    yield json.dumps({"type": "step", "status": "executing", "message": "Mencari data di database..."}) + "\n"
    
    try:
        df = fetch_dataframe(sql_query)
        
        if df.empty:
            yield json.dumps({"type": "step", "status": "empty_result", "message": "Data tidak ditemukan"}) + "\n"
            yield json.dumps({"type": "answer", "content": "Query berhasil dijalankan namun tidak ada data yang ditemukan."}) + "\n"
            return
            
        yield json.dumps({"type": "step", "status": "data_found", "message": f"Data ditemukan ({len(df)} baris), memuat jawaban.."}) + "\n"
        
        data_str = df.to_string()
        
        summary_prompt = f"""
        You are a Mining Operations Assistant.
        
        User Question: {user_question}
        Database Data:
        {data_str}
        
        INSTRUCTIONS:
        1. Answer the user's question using ONLY the provided Database Data.
        2. If the data contains the answer, state it clearly.
        3. Do not make up information.
        4. Use Bahasa Indonesia.
        5. Be professional and concise.
        """
        
        # Step 4: Summarize
        yield json.dumps({"type": "step", "status": "summarizing", "message": "Menyusun jawaban..."}) + "\n"
        
        response = ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'system', 'content': 'Answer based on data only.'},
            {'role': 'user', 'content': summary_prompt}
        ])
        
        answer = response['message']['content']
        
        yield json.dumps({"type": "answer", "content": answer}) + "\n"
        yield json.dumps({"type": "step", "status": "completed", "message": "Selesai"}) + "\n"
        
    except Exception as e:
        yield json.dumps({"type": "error", "message": f"Error: {str(e)}"}) + "\n"

def execute_and_summarize(user_question):
    # Legacy wrapper for non-streaming calls if any
    steps = []
    answer = ""
    sql_query = None
    
    for chunk in execute_and_summarize_stream(user_question):
        data = json.loads(chunk)
        if data['type'] == 'step':
            steps.append({"status": data['status'], "message": data['message'], "detail": data.get('detail')})
        elif data['type'] == 'sql':
            sql_query = data['query']
        elif data['type'] == 'answer':
            answer = data['content']
            
    return {
        "answer": answer,
        "steps": steps,
        "sql_query": sql_query
    }
