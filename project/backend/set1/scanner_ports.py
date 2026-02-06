import nmap
import socket
from utils.terminal_logger import log_event

# Vulnerable ports database with severity levels
VULNERABLE_PORTS = {
    21: {"service": "FTP", "severity": "HIGH", "reason": "Unencrypted file transfer, credentials sent in plaintext"},
    23: {"service": "Telnet", "severity": "CRITICAL", "reason": "Unencrypted remote access, highly exploitable"},
    25: {"service": "SMTP", "severity": "MEDIUM", "reason": "Can be exploited for email spoofing and spam relay"},
    53: {"service": "DNS", "severity": "MEDIUM", "reason": "Can be used for DNS amplification attacks"},
    69: {"service": "TFTP", "severity": "HIGH", "reason": "Unencrypted, no authentication, easy data exfiltration"},
    80: {"service": "HTTP", "severity": "MEDIUM", "reason": "Unencrypted web traffic, vulnerable to MITM attacks"},
    135: {"service": "RPC", "severity": "HIGH", "reason": "Windows RPC, frequently exploited for remote code execution"},
    139: {"service": "NetBIOS", "severity": "HIGH", "reason": "Windows file sharing, vulnerable to enumeration and attacks"},
    445: {"service": "SMB", "severity": "CRITICAL", "reason": "Windows file sharing, WannaCry/EternalBlue vector"},
    1433: {"service": "MSSQL", "severity": "HIGH", "reason": "Database exposed to internet, brute force target"},
    1723: {"service": "PPTP VPN", "severity": "HIGH", "reason": "Outdated VPN protocol with known vulnerabilities"},
    3306: {"service": "MySQL", "severity": "HIGH", "reason": "Database exposed to internet, injection attacks possible"},
    3389: {"service": "RDP", "severity": "CRITICAL", "reason": "Remote Desktop, frequent target for brute force and exploits"},
    5432: {"service": "PostgreSQL", "severity": "HIGH", "reason": "Database exposed to internet, unauthorized access risk"},
    5900: {"service": "VNC", "severity": "HIGH", "reason": "Remote desktop, often poorly secured"},
    6379: {"service": "Redis", "severity": "CRITICAL", "reason": "Often exposed without authentication, full database access"},
    8080: {"service": "HTTP-Alt", "severity": "MEDIUM", "reason": "Alternative HTTP port, often less secured than 443"},
    27017: {"service": "MongoDB", "severity": "CRITICAL", "reason": "NoSQL database, frequently exposed without authentication"},
}

def check_port_vulnerability(port, service):
    """
    Check if a port is known to be vulnerable and return severity + details
    """
    if port in VULNERABLE_PORTS:
        vuln_info = VULNERABLE_PORTS[port]
        return {
            "is_vulnerable": True,
            "severity": vuln_info["severity"],
            "reason": vuln_info["reason"],
            "service_name": vuln_info["service"]
        }
    
    # Check for common vulnerable patterns even if not in database
    if port > 1024 and service in ["http", "unknown"]:
        return {
            "is_vulnerable": True,
            "severity": "LOW",
            "reason": "Unencrypted service on non-standard port, potential security misconfiguration",
            "service_name": service
        }
    
    return {
        "is_vulnerable": False,
        "severity": "INFO",
        "reason": "No known critical vulnerabilities",
        "service_name": service
    }

def scan_ports(target="127.0.0.1", mode="FAST"):
    """
    Scans ports on the target with vulnerability assessment.
    mode="FAST": Scans specific common ports.
    mode="FULL": Scans all 65535 ports (-p-).
    Returns list of open ports with vulnerability information.
    """
    log_event("SCAN", f"Scanning ports on {target} ({mode} mode)...", "SCAN")
    open_ports = []
    vulnerable_ports = []
    
    # Extended port list - scanning top 100 most common ports
    ports_to_scan = [
        # Critical Services
        20, 21, 22, 23, 25, 53, 69, 80, 110, 135, 139, 143, 443, 445, 465, 587, 993, 995,
        # Database Ports
        1433, 1521, 3306, 5432, 5984, 6379, 7000, 7001, 9042, 9200, 9300, 27017, 27018, 28017,
        # Web & App Servers
        3000, 3001, 4000, 4443, 5000, 5001, 5432, 8000, 8008, 8080, 8081, 8443, 8888, 9000, 9090,
        # Remote Access
        1723, 3389, 5900, 5901, 5938,
        # Message Queues & Cache
        4369, 5672, 6379, 11211, 15672, 25672, 61613, 61614,
        # Container & Orchestration
        2375, 2376, 2379, 4243, 6443, 8001, 9443, 10250, 10255,
        # Development & Debug
        1234, 4567, 5555, 5858, 9229,
        # FTP & File Transfer
        20, 21, 69, 115, 2049,
        # Mail Services
        25, 110, 143, 465, 587, 993, 995,
        # DNS & Directory
        53, 88, 389, 636, 3268,
        # VPN & Tunneling
        500, 1194, 1701, 1723, 4500,
        # Monitoring & Management
        161, 162, 623, 9090, 9100, 10000,
        # Gaming & Streaming
        3074, 3478, 3479, 5060, 25565, 27015,
        # Miscellaneous
        111, 179, 427, 548, 631, 873, 902, 1025, 1026, 1080, 1311, 1527, 2082, 2083, 2222, 
        3128, 3690, 5353, 6000, 6001, 6002, 7777, 8181, 8834, 9418, 19999, 32768, 49152, 50000
    ]
    
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
                    
                    # Check vulnerability
                    vuln_info = check_port_vulnerability(port, service)
                    
                    port_data = {
                        "port": port,
                        "service": service,
                        "state": "open",
                        "vulnerability": vuln_info
                    }
                    open_ports.append(port_data)
                    
                    # Log based on severity
                    if vuln_info["is_vulnerable"]:
                        severity = vuln_info["severity"]
                        if severity == "CRITICAL":
                            log_event("SCAN", f"⚠️  CRITICAL VULNERABILITY: Port {port} ({service}) - {vuln_info['reason']}", "ERROR")
                            vulnerable_ports.append(port_data)
                        elif severity == "HIGH":
                            log_event("SCAN", f"🔴 HIGH RISK: Port {port} ({service}) - {vuln_info['reason']}", "WARNING")
                            vulnerable_ports.append(port_data)
                        elif severity == "MEDIUM":
                            log_event("SCAN", f"🟡 MEDIUM RISK: Port {port} ({service}) - {vuln_info['reason']}", "WARNING")
                            vulnerable_ports.append(port_data)
                        else:
                            log_event("SCAN", f"Found open port: {port} ({service})", "INFO")
                    else:
                        log_event("SCAN", f"Found open port: {port} ({service})", "INFO")
        
    except Exception as e:
        log_event("SCAN", f"Nmap scan failed ({str(e)}), falling back to socket scan.", "WARNING")
        # Fallback to simple socket connect on common ports
        fallback_ports = ports_to_scan
        for port in fallback_ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex((target, port))
            if result == 0:
                # Check vulnerability for socket-discovered ports too
                vuln_info = check_port_vulnerability(port, "unknown")
                
                port_data = {
                    "port": port,
                    "service": "unknown",
                    "state": "open",
                    "vulnerability": vuln_info
                }
                open_ports.append(port_data)
                
                if vuln_info["is_vulnerable"] and vuln_info["severity"] in ["CRITICAL", "HIGH"]:
                    log_event("SCAN", f"⚠️  {vuln_info['severity']} RISK: Port {port} - {vuln_info['reason']}", "ERROR")
                    vulnerable_ports.append(port_data)
                else:
                    log_event("SCAN", f"Found open port (socket): {port}", "WARNING")
            sock.close()
    
    # Summary alert for vulnerable ports
    if vulnerable_ports:
        critical_count = sum(1 for p in vulnerable_ports if p["vulnerability"]["severity"] == "CRITICAL")
        high_count = sum(1 for p in vulnerable_ports if p["vulnerability"]["severity"] == "HIGH")
        
        log_event("SCAN", f"🚨 SECURITY ALERT: Found {len(vulnerable_ports)} vulnerable port(s) - {critical_count} CRITICAL, {high_count} HIGH RISK", "ERROR")
        log_event("SCAN", "⚠️  RECOMMENDATION: Close unused ports or implement firewall rules immediately!", "ERROR")
    
    return {
        "open_ports": open_ports,
        "vulnerable_ports": vulnerable_ports,
        "summary": {
            "total_open": len(open_ports),
            "total_vulnerable": len(vulnerable_ports),
            "critical": sum(1 for p in vulnerable_ports if p["vulnerability"]["severity"] == "CRITICAL"),
            "high": sum(1 for p in vulnerable_ports if p["vulnerability"]["severity"] == "HIGH"),
            "medium": sum(1 for p in vulnerable_ports if p["vulnerability"]["severity"] == "MEDIUM")
        }
    }
