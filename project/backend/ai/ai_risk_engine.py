import os
import json
from groq import Groq
from ai.rag_store import rag_engine
from utils.terminal_logger import log_event

def calculate_risk_score(findings):
    """
    Calculates a deterministic risk score (0-100) based on findings.
    """
    score = 0
    
    # 1. Open Ports
    open_ports = findings.get("scans", {}).get("ports", [])
    for p in open_ports:
        port_num = int(p['port'])
        if port_num in [21, 23]: # Telnet/FTP
            score += 20
        elif port_num in [80, 8080]: # HTTP
            score += 5
        elif port_num in [443]: # HTTPS (Normal)
            score += 0
        else:
            score += 2

    # 2. Encryption
    encryption = findings.get("scans", {}).get("encryption", {})
    if encryption.get("status") == "UNSECURE":
        score += 50
        
    # 3. MITM
    mitm = findings.get("scans", {}).get("mitm", {})
    if mitm.get("status") == "DANGER":
        score += 80

    # 4. Deauth
    deauth = findings.get("scans", {}).get("deauth_prediction", {})
    if deauth.get("status") == "HIGH_RISK":
        score += 40
        
    # 5. Hardware Trust (SET-4)
    hw = findings.get("hardware_trust", {})
    if hw.get("status") == "UNTRUSTED":
        score += 25
        log_event("RISK", "Risk penalty applied: Hardware Key Missing", "WARNING")
        
    # Cap at 100
    return min(score, 100)

def generate_ai_explanation(findings, risk_score):
    """
    Uses Groq API with RAG context if available.
    """
    api_key = os.getenv("GROQ_API_KEY")
    client = None
    
    if api_key:
        try:
            client = Groq(api_key=api_key)
        except Exception as e:
             log_event("AI", f"Failed to init Groq client: {e}", "WARNING")

    # Construct the query for RAG
    # We want context based on the specific threats found
    context_query = f"Risk Score: {risk_score}. "
    
    open_ports = findings.get("scans", {}).get("ports", [])
    if open_ports: context_query += f"Open Ports: {[p['port'] for p in open_ports]}. "
    
    mitm = findings.get("scans", {}).get("mitm", {})
    if mitm.get("status") == "DANGER": context_query += "ARP Spoofing detected. "
    
    encryption = findings.get("scans", {}).get("encryption", {})
    if encryption.get("status") == "UNSECURE": context_query += "Open Wi-Fi. "

    hw = findings.get("hardware_trust", {})
    if hw.get("status") == "UNTRUSTED": context_query += "Physical Security Key Missing. "

    # 1. RAG Retrieve
    retrieved_context = rag_engine.search(context_query, limit=2)
    context_str = "\n".join(retrieved_context)
    if context_str:
        log_event("AI", "RAG Context Retrieved successfully.", "INFO")

    # 2. Groq Generation
    if client:
        try:
            prompt = f"""
            You are SentinelAI, a cybersecurity expert.
            Analyze the following system status and provide a clear, non-technical explanation for the user.
            
            SYSTEM DATA:
            Risk Score: {risk_score}/100
            Findings: {json.dumps(findings['scans'], indent=2)}
            
            RELEVANT SECURITY KNOWLEDGE (RAG):
            {context_str}
            
            INSTRUCTIONS:
            - Be concise (max 3-4 sentences).
            - Explain WHY it is dangerous using the RAG knowledge if applicable.
            - Do not use technical jargon without explanation.
            - **FORMATTING**: Use Markdown. Use bullet points for key risks. Use **bold** for emphasis.
            """
            
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a helpful cybersecurity assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150
            )
            return completion.choices[0].message.content
        except Exception as e:
            log_event("AI", f"Groq Generation failed: {e}", "WARNING")

    # Fallback Logic (Template Based)
    explanation = "System Scan Complete. "
    if risk_score > 75:
        explanation += "CRITICAL THREATS DETECTED. Your network is highly vulnerable. "
        if mitm.get("status") == "DANGER":
            explanation += "Active Man-in-the-Middle attack signatures found. "
    elif risk_score > 40:
        explanation += "Moderate risks identified. "
        if encryption.get("status") == "UNSECURE":
            explanation += "You are using an open Wi-Fi network. "
    else:
        explanation += "Your system appears relatively safe. Basic hygiene checks passed."
        
    return explanation

def analyze_risk(scan_results):
    log_event("AI", "Correlating findings and calculating risk...", "INFO")
    
    score = calculate_risk_score(scan_results)
    explanation = generate_ai_explanation(scan_results, score)
    
    risk_level = "LOW"
    if score > 75: risk_level = "HIGH"
    elif score > 30: risk_level = "MEDIUM"
    
    # Generate proposed actions
    actions = []
    if score > 50:
        actions.append("echo 'Alert: High Risk Detected'")
        ports = scan_results.get("scans", {}).get("ports", [])
        for p in ports:
            if p['port'] in [23, 21]: # Unsafe services
                actions.append(f"iptables -A INPUT -p tcp --dport {p['port']} -j DROP")
    
    return {
        "score": score,
        "level": risk_level,
        "explanation": explanation,
        "proposed_actions": actions
    }
