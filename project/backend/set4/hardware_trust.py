import os
from utils.terminal_logger import log_event

TRUST_KEY_PATH = "/tmp/sentinel_key"

def check_usb_key():
    """
    Checks for the physical presence of the Trust Key (Simulated file).
    In reality, this would check `lsblk` or `lsusb` for a specific VendorID/ProductID.
    """
    if os.path.exists(TRUST_KEY_PATH):
        # log_event("HARDWARE", "Trust Key Detected. System Unlocked.", "INFO") # Spammy if called often
        return {
            "status": "TRUSTED",
            "message": "Hardware Security Key is present.",
            "unlocked": True
        }
    else:
        # log_event("HARDWARE", "Trust Key MISSING. System Locked/Restricted.", "WARNING")
        return {
            "status": "UNTRUSTED",
            "message": "Hardware Security Key removed! Authenticated actions restricted.",
            "unlocked": False
        }
