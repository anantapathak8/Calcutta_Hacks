from utils.terminal_logger import log_event

def check_mitm():
    """
    Checks for ARP Spoofing by analyzing the ARP table for duplicate MAC addresses.
    """
    log_event("SCAN", "Checking for MITM indicators (ARP Spoofing)...", "SCAN")
    
    mac_map = {}
    duplicates = []
    
    try:
        with open('/proc/net/arp', 'r') as f:
            lines = f.readlines()[1:] # Skip header
            
        for line in lines:
            parts = line.split()
            if len(parts) >= 4:
                ip = parts[0]
                mac = parts[3]
                
                # Ignore incomplete entries
                if mac == "00:00:00:00:00:00":
                    continue
                    
                if mac in mac_map:
                    duplicates.append({
                        "mac": mac,
                        "ip1": mac_map[mac],
                        "ip2": ip
                    })
                else:
                    mac_map[mac] = ip
                    
        if duplicates:
            msg = f"ARP SPOOFING DETECTED! Duplicate MACs found: {duplicates}"
            log_event("CRITICAL", msg, "CRITICAL")
            return {"status": "DANGER", "details": msg, "evidence": duplicates}
            
        return {"status": "SAFE", "details": "No duplicate MAC addresses found in ARP table."}

    except Exception as e:
        return {"status": "ERROR", "details": str(e)}
