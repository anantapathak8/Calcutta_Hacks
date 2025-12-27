from utils.terminal_logger import log_event
import scapy.all as scapy
import random
import socket

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def discover_devices(subnet=None):
    """
    Scans the network for devices using ARP (requires root/sudo usually).
    Falls back to a Mock Graph if scan fails or returns empty (for demo safety).
    """
    log_event("SET2", "Starting Device Discovery (Network Graph)...", "SCAN")
    
    devices = []
    
    try:
        if not subnet:
            # Guess subnet from local IP
            local_ip = get_local_ip()
            subnet = ".".join(local_ip.split('.')[:3]) + ".1/24"
            
        # 1. Real Scan Attempt
        # scapy.arping returns (answered, unanswered)
        # timeout=1 to being fast
        answered_list = scapy.arping(subnet, timeout=1, verbose=False)[0]
        
        for element in answered_list:
            ip = element[1].psrc
            mac = element[1].hwsrc
            devices.append({"ip": ip, "mac": mac, "vendor": "Unknown", "type": "node"})
            
        if not devices:
            raise Exception("No devices found (Permissions?)")
            
        log_event("SET2", f"Discovered {len(devices)} devices via ARP.", "INFO")
        
    except Exception as e:
        log_event("SET2", f"Device Discovery failed/skipped ({e}). Using Simulation Mode.", "WARNING")
        
        # MOCK DATA FOR DEMO
        devices = [
            {"ip": "192.168.1.1", "mac": "AA:BB:CC:DD:EE:01", "vendor": "Cisco", "type": "router"},
            {"ip": "192.168.1.20", "mac": "AA:BB:CC:DD:EE:02", "vendor": "Dell", "type": "server"},
            {"ip": "192.168.1.21", "mac": "AA:BB:CC:DD:EE:03", "vendor": "Apple", "type": "laptop"},
            {"ip": "192.168.1.22", "mac": "AA:BB:CC:DD:EE:04", "vendor": "Espressif", "type": "iot"},
            {"ip": "192.168.1.23", "mac": "AA:BB:CC:DD:EE:05", "vendor": "Unknown", "type": "printer", "compromised": True} # Simulation
        ]

    # Build Topology (Links)
    # Simple star topology for now: Router -> Switch -> Nodes
    graph = {
        "nodes": devices,
        "links": []
    }
    
    # Identify router (gateway)
    router_id = devices[0]["ip"]
    
    for d in devices:
        if d["ip"] != router_id:
            graph["links"].append({"source": router_id, "target": d["ip"]})
            
    return graph
