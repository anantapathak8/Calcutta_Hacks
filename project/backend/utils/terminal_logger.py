import sys
from termcolor import colored
from datetime import datetime

# Global BUFFER to hold the last N logs for the UI
LOG_BUFFER = []
MAX_LOGS = 50

def get_recent_logs():
    return LOG_BUFFER

def log_event(category, message, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    
    color_map = {
        "INFO": "cyan",
        "WARNING": "yellow",
        "CRITICAL": "red",
        "ACTION": "green",
        "SCAN": "blue"
    }
    
    color = color_map.get(level, "white")
    
    formatted_msg = f"[{timestamp}] [{category}] {message}"
    print(colored(formatted_msg, color))
    sys.stdout.flush()
    
    # Add to buffer
    LOG_BUFFER.append({
        "timestamp": timestamp,
        "type": level, # Maps to UI color logic
        "message": f"[{category}] {message}"
    })
    
    if len(LOG_BUFFER) > MAX_LOGS:
        LOG_BUFFER.pop(0)

def log_mcp_action(command, safe=True):
    status = "EXECUTING" if safe else "BLOCKED"
    log_event("MCP", f"{status} CMD: {command}", "ACTION" if safe else "CRITICAL")
