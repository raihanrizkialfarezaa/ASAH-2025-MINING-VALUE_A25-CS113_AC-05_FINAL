
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
