"""
Ollama Client Helper - Provides OpenAI-compatible client for local LLaMA inference
"""
import os
from openai import OpenAI
from utils.terminal_logger import log_event

# Ollama Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")

def get_ollama_client():
    """
    Get Ollama client configured to use local LLaMA model.
    
    Returns:
        OpenAI: OpenAI-compatible client pointing to Ollama endpoint
        
    Note:
        Ollama provides OpenAI-compatible API, so we can use the OpenAI client library
        with a custom base_url pointing to local Ollama server.
    """
    try:
        client = OpenAI(
            base_url=OLLAMA_BASE_URL,
            api_key="ollama"  # Ollama doesn't require real API key, but SDK needs something
        )
        log_event("AI", f"Ollama client initialized (Model: {OLLAMA_MODEL})", "INFO")
        return client
    except Exception as e:
        log_event("AI", f"Failed to initialize Ollama client: {e}", "WARNING")
        return None

def get_model_name():
    """Get the configured Ollama model name"""
    return OLLAMA_MODEL
