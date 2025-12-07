import os

LLM_MODELS = {
    "sql_generation": "qwen2.5-coder:3b",
    "chat_response": "qwen2.5-coder:3b",
    "simulation": "qwen2.5-coder:3b",
    "default": "qwen2.5-coder:3b"
}

ACTIVE_MODEL = os.environ.get("OLLAMA_MODEL", LLM_MODELS["default"])

def get_model(task="default"):
    return os.environ.get("OLLAMA_MODEL", LLM_MODELS.get(task, LLM_MODELS["default"]))

def set_model(model_name, task=None):
    global ACTIVE_MODEL, LLM_MODELS
    if task:
        LLM_MODELS[task] = model_name
    else:
        ACTIVE_MODEL = model_name
        for key in LLM_MODELS:
            LLM_MODELS[key] = model_name

def list_models():
    return LLM_MODELS.copy()
