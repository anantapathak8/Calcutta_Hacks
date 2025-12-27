import os
from ai.ollama_client import get_ollama_client, get_model_name
import json
import re
from utils.terminal_logger import log_event

def parse_simple_command(user_input):
    """
    Parse simple commands that don't require AI processing.
    Returns command dict if matched, None otherwise.
    """
    user_input = user_input.strip().lower()
    
    # Pattern: "open port 8080" or "start server 8080"
    open_port_match = re.search(r'\b(?:open|start).*?(?:port|server)\s+(\d+)\b', user_input)
    if open_port_match:
        port = open_port_match.group(1)
        return {
            "command": f"START_SERVER {port}",
            "risk_level": "LOW",
            "explanation": f"Starting HTTP server on port {port}"
        }
    
    # Pattern: "close port 9102" or "stop server 9102"
    close_port_match = re.search(r'\b(?:close|stop).*?(?:port|server)\s+(\d+)\b', user_input)
    if close_port_match:
        port = close_port_match.group(1)
        return {
            "command": f"STOP_SERVER {port}",
            "risk_level": "LOW",
            "explanation": f"Stopping server on port {port}"
        }
    
    # Pattern: "scan port 80"
    scan_port_match = re.search(r'\bscan.*?port\s+(\d+)\b', user_input)
    if scan_port_match:
        port = scan_port_match.group(1)
        return {
            "command": f"nmap -p {port} 127.0.0.1",
            "risk_level": "LOW",
            "explanation": f"Scanning port {port} on localhost"
        }
    
    # Pattern: "block ip 1.2.3.4"
    block_ip_match = re.search(r'\bblock.*?ip\s+([\d.]+)\b', user_input)
    if block_ip_match:
        ip = block_ip_match.group(1)
        return {
            "command": f"iptables -A INPUT -s {ip} -j DROP",
            "risk_level": "HIGH",
            "explanation": f"Blocking IP {ip} via iptables"
        }
    
    return None

def process_chat_request(user_input):
    """
    Interprets user natural language input into a specific system command.
    Returns a dictionary with 'command', 'risk_level', and 'explanation'.
    """
    # Fast path: Handle simple commands without AI
    simple_command = parse_simple_command(user_input)
    if simple_command:
        return simple_command
    
    # Fall back to AI processing for complex requests
    client = get_ollama_client()
    if not client:
        return {
            "error": "Ollama not available",
            "message": "AI configuration error. Please check server logs."
        }
    
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
            model=get_model_name(),
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
