import ollama
import pandas as pd
from database import fetch_dataframe
import json
import os

MODEL_NAME = "qwen2.5:7b"

def read_schema_file():
    """Reads the Prisma schema file to get the latest database structure."""
    try:
        # Adjust path relative to this file
        schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend-express', 'prisma', 'schema.prisma'))
        if os.path.exists(schema_path):
            with open(schema_path, 'r') as f:
                return f.read()
        else:
            return "Schema file not found."
    except Exception as e:
        return f"Error reading schema: {e}"

SCHEMA_DESCRIPTION = read_schema_file()

def generate_sql_query(user_question):
    prompt = f"""
    You are a PostgreSQL expert. Convert the user's question into a valid SQL query.
    
    The database schema is defined in Prisma format below:
    {SCHEMA_DESCRIPTION}
    
    Rules:
    1. Return ONLY the SQL query. No markdown, no explanation.
    2. The query must be READ-ONLY (SELECT only). No INSERT, UPDATE, DELETE, DROP.
    3. Use standard PostgreSQL syntax.
    4. Map the Prisma models to table names using the @@map attribute if present (e.g. @@map("trucks") means table name is "trucks").
    5. If the question cannot be answered with the schema, return "SELECT 'I cannot answer that based on the available data' as message;".
    6. Limit results to 10 rows unless specified otherwise.
    
    User Question: {user_question}
    SQL Query:
    """
    
    try:
        response = ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'system', 'content': 'You are a SQL generator. Output only SQL.'},
            {'role': 'user', 'content': prompt}
        ])
        sql = response['message']['content'].strip()
        # Clean up markdown if present
        if sql.startswith("```sql"):
            sql = sql[6:]
        if sql.startswith("```"):
            sql = sql[3:]
        if sql.endswith("```"):
            sql = sql[:-3]
        return sql.strip()
    except Exception as e:
        print(f"Error generating SQL: {e}")
        return None

def execute_and_summarize(user_question):
    sql_query = generate_sql_query(user_question)
    if not sql_query:
        return "Maaf, saya tidak dapat memproses pertanyaan tersebut saat ini."
    
    # Safety check
    if not sql_query.upper().startswith("SELECT"):
        return "Maaf, saya hanya diperbolehkan melakukan operasi pembacaan data (SELECT)."
    
    print(f"🤖 Generated SQL: {sql_query}")
    
    try:
        df = fetch_dataframe(sql_query)
        
        if df.empty:
            return "Tidak ada data yang ditemukan untuk pertanyaan tersebut."
        
        # Convert result to string/json for the LLM to summarize
        data_str = df.to_string()
        
        summary_prompt = f"""
        User Question: {user_question}
        SQL Query Executed: {sql_query}
        Data Result:
        {data_str}
        
        Please provide a natural language answer to the user's question based on the data result.
        Be concise and professional. Use Bahasa Indonesia.
        """
        
        response = ollama.chat(model=MODEL_NAME, messages=[
            {'role': 'system', 'content': 'You are a mining operations assistant. Answer based on data.'},
            {'role': 'user', 'content': summary_prompt}
        ])
        
        return response['message']['content']
        
    except Exception as e:
        return f"Terjadi kesalahan saat mengambil data: {str(e)}"
