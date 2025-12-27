import os
from groq import Groq
from utils.terminal_logger import log_event
from ai.rag_store import rag_engine

def analyze_configuration(scan_results):
    """
    Analyzes the scan results for configuration weaknesses.
    Returns a list of 'Configuration Issues'.
    """
    issues = []
    
    # Check 1: Open Ports Policy
    open_ports = scan_results.get("scans", {}).get("ports", [])
    for p in open_ports:
        port = p['port']
        if port in [23, 21]:
            issues.append({
                "id": f"unsafe_port_{port}",
                "severity": "HIGH",
                "title": f"Unsafe Protocol Detected (Port {port})",
                "description": f"Port {port} (Telnet/FTP) is unencrypted and dangerous."
            })
            
    # Check 2: Encryption
    enc = scan_results.get("scans", {}).get("encryption", {})
    if enc.get("status") == "UNSECURE":
        issues.append({
            "id": "open_wifi",
            "severity": "CRITICAL",
            "title": "Open Wi-Fi Network",
            "description": "Your Wi-Fi network has no encryption enabled."
        })
        
    return issues

def get_ai_advice(issue_title, issue_description):
    """
    Asks Groq for advice on how to fix a specific issue.
    """
    api_key = os.getenv("GROQ_API_KEY")
    client = None
    if api_key:
        try:
            client = Groq(api_key=api_key)
        except:
            pass
            
    # RAG Retrieval for best practices
    context = ""
    try:
        docs = rag_engine.search(f"How to fix {issue_title}", limit=1)
        if docs:
            context = "\n".join(docs)
    except:
        pass
        
    if not client:
        return "AI Advisor not available (Check API Key)."
        
    try:
        prompt = f"""
        You are a Network Configuration Assistant.
        ISSUE: {issue_title}
        DETAILS: {issue_description}
        
        CONTEXT: {context}
        
        Provide a safe, step-by-step CLI command or action to fix this.
        Explain the risk if not fixed.
        Keep it under 3 sentences.
        """
        
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"Could not generate advice: {e}"
