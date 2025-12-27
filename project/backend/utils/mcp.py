import subprocess
import shlex
from utils.terminal_logger import log_mcp_action

# Whitelist of allowed executables and sensitive arguments
ALLOWED_COMMANDS = [
    "iptables",
    "echo",
    "logger", # System logger
    "nmap"
]

# Dictionary to keep track of active servers: port -> Popen object
ACTIVE_SERVERS = {}

def is_safe_command(cmd_str):
    """
    Parses command to ensure it's in the whitelist.
    """
    if cmd_str.startswith("START_SERVER") or cmd_str.startswith("STOP_SERVER"):
        return True

    try:
        parts = shlex.split(cmd_str)
        if not parts:
            return False
        
        executable = parts[0]
        
        # Check pure executable name (handle absolute paths if needed, but for now stick to simple)
        if executable not in ALLOWED_COMMANDS:
            if executable.startswith("/"):
                # Check basename
                if executable.split("/")[-1] not in ALLOWED_COMMANDS:
                    return False
            else:
                return False
                
        # Additional safety checks (no ; | && to prevent injection if not handled by shlex correctly)
        if any(c in cmd_str for c in [';', '|', '&&', '>', '<']):
            # We deny shell operators for maximum safety in this prototype
            return False
            
        return True
    except:
        return False

def execute_mitigation(action_plan):
    """
    Executes a list of commands suggested by the AI or Risk Engine.
    action_plan: list of strings (commands)
    """
    results = []
    
    for cmd in action_plan:
        if is_safe_command(cmd):
            try:
                log_mcp_action(cmd, safe=True)
                
                if cmd.startswith("START_SERVER"):
                    try:
                        _, port_str = cmd.split()
                        port = int(port_str)
                        if port in ACTIVE_SERVERS and ACTIVE_SERVERS[port].poll() is None:
                             results.append({"command": cmd, "status": "skipped", "output": f"Server already running on port {port}"})
                        else:
                            # Start python3 -m http.server port
                            # running in a new session/detached could be better but Popen is usually enough for the lifecycle of app
                            proc = subprocess.Popen(["python3", "-m", "http.server", str(port)], 
                                                    stdout=subprocess.DEVNULL, 
                                                    stderr=subprocess.DEVNULL)
                            ACTIVE_SERVERS[port] = proc
                            results.append({"command": cmd, "status": "executed", "output": f"Started http.server on port {port}"})
                    except ValueError:
                         results.append({"command": cmd, "status": "failed", "error": "Invalid port format"})
                    except Exception as e:
                        results.append({"command": cmd, "status": "failed", "error": str(e)})

                elif cmd.startswith("STOP_SERVER"):
                    try:
                        _, port_str = cmd.split()
                        port = int(port_str)
                        if port in ACTIVE_SERVERS:
                            proc = ACTIVE_SERVERS[port]
                            proc.terminate()
                            try:
                                proc.wait(timeout=2)
                            except subprocess.TimeoutExpired:
                                proc.kill()
                            del ACTIVE_SERVERS[port]
                            results.append({"command": cmd, "status": "executed", "output": f"Stopped server on port {port}"})
                        else:
                             results.append({"command": cmd, "status": "failed", "error": f"No active server tracking for port {port}"})
                    except ValueError:
                        results.append({"command": cmd, "status": "failed", "error": "Invalid port format"})
                    except Exception as e:
                        results.append({"command": cmd, "status": "failed", "error": str(e)})
                
                elif "iptables" in cmd:
                    # SIMULATION MODE FOR DANGEROUS COMMANDS
                    log_mcp_action(f"(SIMULATED) {cmd}", safe=True)
                    results.append({"command": cmd, "status": "simulated", "output": "Simulated execution for safety"})
                else:
                    proc = subprocess.run(shlex.split(cmd), capture_output=True, text=True)
                    results.append({"command": cmd, "status": "executed", "output": proc.stdout})
            except Exception as e:
                results.append({"command": cmd, "status": "failed", "error": str(e)})
        else:
            log_mcp_action(cmd, safe=False)
            results.append({"command": cmd, "status": "blocked", "reason": "Unsafe command"})
            
    return results
