import os
from utils.terminal_logger import log_event

# Legacy path for backward compatibility
TRUST_KEY_PATH = "/tmp/sentinel_key"

def check_usb_key():
    """
    Checks for the physical presence of a USB Hardware Security Key.
    
    First tries the new hardware_key module for real USB detection,
    falls back to simple file check for backward compatibility.
    """
    try:
        # Try using the new hardware_key module
        from set4.hardware_key import get_current_status, HardwareKeyVerifier
        
        # Get current status from monitor
        status = get_current_status()
        
        # If monitor hasn't run yet, do a quick check
        if status.get("status") == "UNKNOWN":
            verifier = HardwareKeyVerifier()
            key_drive = verifier.find_key_drive()
            
            if key_drive:
                return {
                    "status": "DETECTED",
                    "message": f"Hardware Security Key found on {key_drive['name']}. Enter password to verify.",
                    "unlocked": False,
                    "drive_info": key_drive
                }
            # Fall through to legacy check
        elif status.get("status") in ["TRUSTED", "DETECTED"]:
            return status
        elif status.get("status") == "UNTRUSTED" and status.get("drive_info"):
            # Key detected but verification failed
            return status
            
    except ImportError:
        # hardware_key module not available, use legacy
        pass
    except Exception as e:
        log_event("HARDWARE", f"Error checking hardware key: {e}", "WARNING")
    
    # Legacy fallback: simple file check
    if os.path.exists(TRUST_KEY_PATH):
        return {
            "status": "TRUSTED",
            "message": "Hardware Security Key is present (legacy mode).",
            "unlocked": True
        }
    else:
        return {
            "status": "UNTRUSTED",
            "message": "Hardware Security Key not detected.",
            "unlocked": False
        }
