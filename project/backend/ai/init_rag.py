from dotenv import load_dotenv
load_dotenv()
from ai.rag_store import rag_engine
from utils.terminal_logger import log_event

# Hardcoded Security Best Practices for the Vector DB
KNOWLEDGE = [
    {
        "text": "Port 23 (Telnet) is unencrypted and insecure. Attackers can sniff credentials easily. Use SSH (Port 22) instead.", 
        "category": "port_security"
    },
    {
        "text": "Port 21 (FTP) sends passwords in plain text. It is vulnerable to interception. Use SFTP or SCP.", 
        "category": "port_security"
    },
    {
        "text": "Port 80 (HTTP) is unencrypted. Man-in-the-Middle (MITM) attacks can steal session cookies. Enforce HTTPS/SSL (Port 443).", 
        "category": "encryption"
    },
    {
        "text": "ARP Spoofing occurs when an attacker sends falsified ARP messages over a local area network. This links an attacker's MAC address with the IP address of a legitimate computer or server on the network.", 
        "category": "mitm"
    },
    {
        "text": "Deauthentication Attack is a denial-of-service attack on Wi-Fi networks. It sends disassociate packets to clients, forcing them to disconnect.", 
        "category": "wifi_security"
    },
    {
        "text": "Open Wi-Fi networks allow anyone to intercept traffic. Always use WPA2 or WPA3 encryption.", 
        "category": "wifi_security"
    },
    {
        "text": "UPnP (Universal Plug and Play) on routers can expose internal devices to the public internet arbitrarily. It should be disabled on secure networks.", 
        "category": "router_security"
    },
    {
        "text": "Router Admin Panel should never be exposed on the public WAN IP. It should only be accessible from the LAN.", 
        "category": "router_security"
    }
]

if __name__ == "__main__":
    print("--- SentinelAI RAG Ingestion ---")
    rag_engine.initialize_collection()
    
    # Format for RAG Store
    docs = [{"text": k['text'], "metadata": {"category": k['category']}} for k in KNOWLEDGE]
    rag_engine.add_knowledge(docs)
    
    print("Optimization Complete. Verifying...")
    results = rag_engine.search("Tell me about Telnet risks")
    print(f"Test Search Result: {results}")
