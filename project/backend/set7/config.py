"""
Configuration settings for NLP-based Wi-Fi Hotspot Generator
"""
import os

# Groq API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"  # Updated from deprecated mixtral-8x7b-32768
GROQ_TEMPERATURE = 0.1  # Low temperature for consistent entity extraction

# Network Configuration Constraints
SUPPORTED_SECURITY = ["WPA2", "WPA3", "Open"]
SUPPORTED_BANDS = ["2.4GHz", "5GHz"]

# SSID Validation
MAX_SSID_LENGTH = 32
MIN_SSID_LENGTH = 1
SSID_ALLOWED_CHARS = r"^[a-zA-Z0-9\s\-_]+$"  # Alphanumeric, space, hyphen, underscore

# Password Validation
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 63
WEAK_PASSWORDS = [
    "12345678", "password", "qwertyui", "87654321",
    "11111111", "12341234", "qwerty12", "password123"
]

# Execution Settings
DRY_RUN_MODE = False  # Can be overridden via API
REQUIRE_CONFIRMATION = True  # Always require user confirmation before execution

# Security Settings
LOG_PASSWORDS = False  # Never log actual passwords
PASSWORD_REDACTION = "********"
RATE_LIMIT_REQUESTS = 10  # Max requests per minute per IP
RATE_LIMIT_WINDOW = 60  # seconds

# OS-Specific Settings
LINUX_PREFERRED_TOOL = "nmcli"  # or "hostapd"
WINDOWS_TOOL = "netsh"

# Logging
LOG_FILE = "set7_hotspot.log"
LOG_LEVEL = "INFO"
