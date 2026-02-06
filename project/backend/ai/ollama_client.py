"""
AI Client Helper - Provides unified client for Groq/Ollama inference
"""
import os
from dotenv import load_dotenv
load_dotenv()  # Ensure .env is loaded

from openai import OpenAI
from utils.terminal_logger import log_event

# AI Provider Configuration
AI_PROVIDER = os.getenv("AI_PROVIDER", "groq").lower()

# Debug: Log what we're using
print(f"[DEBUG] AI_PROVIDER from env: {AI_PROVIDER}")

# Groq Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

print(f"[DEBUG] GROQ_API_KEY loaded: {'Yes' if GROQ_API_KEY else 'No'}")

# Ollama Configuration (fallback)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")

def get_ollama_client():
    """
    Get AI client configured based on AI_PROVIDER environment variable.
    Supports both Groq (cloud) and Ollama (local) providers.
    
    Returns:
        OpenAI: OpenAI-compatible client
    """
    try:
        if AI_PROVIDER == "groq":
            if not GROQ_API_KEY:
                log_event("AI", "GROQ_API_KEY not found in environment", "ERROR")
                return None
            
            client = OpenAI(
                base_url=GROQ_BASE_URL,
                api_key=GROQ_API_KEY
            )
            log_event("AI", f"Groq client initialized (Model: {GROQ_MODEL})", "INFO")
            return client
        else:
            # Fallback to Ollama
            client = OpenAI(
                base_url=OLLAMA_BASE_URL,
                api_key="ollama"  # Ollama doesn't require real API key
            )
            log_event("AI", f"Ollama client initialized (Model: {OLLAMA_MODEL})", "INFO")
            return client
    except Exception as e:
        log_event("AI", f"Failed to initialize AI client: {e}", "ERROR")
        return None

def get_model_name():
    """Get the configured AI model name based on provider"""
    if AI_PROVIDER == "groq":
        return GROQ_MODEL
    return OLLAMA_MODEL
