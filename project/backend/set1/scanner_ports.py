import nmap
import socket
from utils.terminal_logger import log_event

def scan_ports(target="127.0.0.1", mode="FAST"):
    """
    Scans ports on the target.
    mode="FAST": Scans specific common ports.
    mode="FULL": Scans all 65535 ports (-p-).
    """
    log_event("SCAN", f"Scanning ports on {target} ({mode} mode)...", "SCAN")
    open_ports = []
    
    # Common ports to check + 8000 for user requirements
    ports_to_scan = [21, 22, 23, 25, 53, 80, 443, 3000, 3306, 4000, 5000, 5001, 8000, 8080]
    
    try:
        nm = nmap.PortScanner()
        
        args = '-sV -T4'
        if mode == "FULL":
            args = '-p- -sV -T4'
        else:
            args = '-p ' + ','.join(map(str, ports_to_scan)) + ' -sV -T4'
            
        nm.scan(target, arguments=args)
        
        if target in nm.all_hosts():
            for port in nm[target]['tcp']:
                if nm[target]['tcp'][port]['state'] == 'open':
                    service = nm[target]['tcp'][port]['name']
                    open_ports.append({"port": port, "service": service, "state": "open"})
                    log_event("SCAN", f"Found open port: {port} ({service})", "WARNING")
        
    except Exception as e:
        log_event("SCAN", f"Nmap scan failed ({str(e)}), falling back to socket scan.", "WARNING")
        # Fallback to simple socket connect on common ports
        fallback_ports = ports_to_scan # Use common ports for fallback
        for port in fallback_ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex((target, port))
            if result == 0:
                open_ports.append({"port": port, "service": "unknown", "state": "open"})
                log_event("SCAN", f"Found open port (socket): {port}", "WARNING")
            sock.close()

    return open_ports
