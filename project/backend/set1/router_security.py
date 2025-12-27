import socket
import requests
from utils.terminal_logger import log_event

def get_default_gateway():
    """Retrieve default gateway IP (Linux specific approach or socket trick)."""
    try:
        with open("/proc/net/route") as fh:
            for line in fh:
                fields = line.strip().split()
                if fields[1] != '00000000' or not int(fields[3], 16) & 2:
                    continue
                return socket.inet_ntoa(b''.join([bytes([int(x, 16)]) for x in reversed([fields[2][i:i+2] for i in range(0, 8, 2)])]))
    except:
        # Fallback
        return "192.168.1.1" # Guess

def check_router_security():
    gateway = get_default_gateway()
    log_event("SCAN", f"Checking router security for gateway: {gateway}", "SCAN")
    
    findings = []
    
    # 1. Check UPnP (Port 1900 UDP usually, but we check TCP for exposed control page or 5000)
    # Checking 1900 via socket might be tricky if it's UDP. Let's check common router ports exposed.
    router_ports = [80, 443, 8080, 1900, 5000]
    
    for port in router_ports:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        res = sock.connect_ex((gateway, port))
        if res == 0:
            findings.append(f"Port {port} is OPEN on router (Potential Risk)")
            if port == 80:
                 findings.append("Router Admin Panel detected on HTTP (Unencrypted)")
            if port == 1900:
                 findings.append("UPnP service might be exposed (High Risk)")
        sock.close()

    # 2. Check if Public IP is same as Gateway (No NAT?) - Unlikely but good check
    try:
        public_ip = requests.get('https://api.ipify.org', timeout=2).text
        if public_ip == gateway:
            findings.append("CRITICAL: Gateway IP matches Public IP! No NAT detected.")
    except:
        pass

    return {
        "gateway": gateway,
        "issues": findings
    }
