import os
from groq import Groq
import json
from utils.terminal_logger import log_event

def process_chat_request(user_input):
    """
    Interprets user natural language input into a specific system command.
    Returns a dictionary with 'command', 'risk_level', and 'explanation'.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {
            "error": "GROQ_API_KEY not found",
            "message": "AI configuration error. Please check server logs."
        }

    client = Groq(api_key=api_key)
    
    system_prompt = """
    You are a Linux System Administrator AI Helper for SentinelAI.
    Your job is to translate natural language security requests into specific Linux commands.
    
    OUTPUT FORMAT: JSON only.
    {
        "command": "actual_command_to_run",
        "risk_level": "LOW|MEDIUM|HIGH",
        "explanation": "Brief explanation of what this command does"
    }

    EXAMPLES:
    User: "scan port 80"
    Response: {"command": "nmap -p 80 127.0.0.1", "risk_level": "LOW", "explanation": "Scanning port 80 locally."}

    User: "open port 8080"
    Response: {"command": "START_SERVER 8080", "risk_level": "LOW", "explanation": "Starting internal HTTP server on port 8080."}

    User: "close port 8080"
    Response: {"command": "STOP_SERVER 8080", "risk_level": "LOW", "explanation": "Stopping internal HTTP server on port 8080."}

    User: "block ip 1.2.3.4"
    Response: {"command": "iptables -A INPUT -s 1.2.3.4 -j DROP", "risk_level": "HIGH", "explanation": "Blocking IP 1.2.3.4 via iptables."}

    RULES:
    1. For "open port X", ALWAYS use: START_SERVER X
    2. For "close port X", ALWAYS use: STOP_SERVER X
    3. For "scan port X", use: nmap -p X 127.0.0.1
    4. For "block ip X", use: iptables -A INPUT -s X -j DROP
    5. If request is not one of these, return "command": null.
    """

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            temperature=0.1, # Low temperature for deterministic commands
            response_format={"type": "json_object"}
        )
        
        response_content = completion.choices[0].message.content
        return json.loads(response_content)

    except Exception as e:
        log_event("AI", f"Chat processing failed: {e}", "ERROR")
        return {
            "error": "Processing failed",
            "message": "I couldn't process that request right now."
        }
