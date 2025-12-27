import subprocess
import re
from utils.terminal_logger import log_event

def check_encryption():
    log_event("SCAN", "Checking Wi-Fi encryption standards...", "SCAN")
    
    # Try to get iwconfig output
    try:
        # This works on Linux with wireless tools
        result = subprocess.run(['iwconfig'], capture_output=True, text=True)
        output = result.stdout
        
        # Look for Encryption key or WPA/WPA2 indicators
        if "no wireless extensions" in output:
             return {"status": "wired_or_unknown", "details": "No wireless interface found or wired connection."}
             
        encryption_status = "UNKNOWN"
        details = "Could not determine encryption type."
        
        # very basic parsing
        if "ESSID" in output:
             if "IEEE 802.11" in output:
                 if "Encryption key:off" in output:
                      encryption_status = "UNSECURE"
                      details = "Open Wi-Fi Network detected! No encryption."
                 else:
                      # Try to infer WPA2 from nmcli if available or just assume secure if key is on
                      encryption_status = "SECURE" 
                      details = "Wireless encryption is active."
                      
        return {"status": encryption_status, "details": details}

    except FileNotFoundError:
        return {"status": "error", "details": "iwconfig not found. Cannot check wifi."}
    except Exception as e:
        return {"status": "error", "details": str(e)}
