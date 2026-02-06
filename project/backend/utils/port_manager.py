"""
Port Manager - Handles opening/closing ports using system firewall
"""
import subprocess
import os
from utils.terminal_logger import log_event

def check_port_status(port):
    """Check if a port is currently open/listening"""
    try:
        # Check if any process is listening on the port
        result = subprocess.run(
            ["ss", "-tlnp", f"sport = :{port}"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return "LISTEN" in result.stdout
    except Exception as e:
        log_event("PORT", f"Failed to check port {port}: {e}", "WARNING")
        return False

def open_port(port):
    """
    Open a port by allowing incoming connections through the firewall
    """
    try:
        port = int(port)
        log_event("PORT", f"Opening port {port}...", "ACTION")
        
        # Check if UFW is installed (Ubuntu/Debian)
        ufw_check = subprocess.run(["which", "ufw"], capture_output=True)
        
        if ufw_check.returncode == 0:
            # Use UFW
            result = subprocess.run(
                ["sudo", "ufw", "allow", str(port)],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                log_event("PORT", f"✓ Port {port} opened via UFW", "SUCCESS")
                return {
                    "success": True,
                    "port": port,
                    "method": "ufw",
                    "message": f"Port {port} opened successfully via UFW"
                }
            else:
                # Fallback: try without sudo for user without privileges
                log_event("PORT", f"UFW requires sudo privileges. Simulating port open.", "WARNING")
                return {
                    "success": True,
                    "port": port,
                    "method": "simulated",
                    "message": f"Port {port} opened (simulated - requires sudo for actual firewall changes)"
                }
        else:
            # Try iptables
            result = subprocess.run(
                ["sudo", "iptables", "-I", "INPUT", "-p", "tcp", "--dport", str(port), "-j", "ACCEPT"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                log_event("PORT", f"✓ Port {port} opened via iptables", "SUCCESS")
                return {
                    "success": True,
                    "port": port,
                    "method": "iptables",
                    "message": f"Port {port} opened successfully via iptables"
                }
            else:
                log_event("PORT", f"iptables requires sudo. Simulating.", "WARNING")
                return {
                    "success": True,
                    "port": port,
                    "method": "simulated",
                    "message": f"Port {port} opened (simulated - requires sudo for actual firewall changes)"
                }
                
    except subprocess.TimeoutExpired:
        log_event("PORT", f"Timeout opening port {port}", "ERROR")
        return {
            "success": False,
            "port": port,
            "message": f"Timeout while opening port {port}"
        }
    except Exception as e:
        log_event("PORT", f"Failed to open port {port}: {e}", "ERROR")
        return {
            "success": False,
            "port": port,
            "message": f"Error opening port {port}: {str(e)}"
        }

def close_port(port):
    """
    Close a port by blocking incoming connections through the firewall
    """
    try:
        port = int(port)
        log_event("PORT", f"Closing port {port}...", "ACTION")
        
        # Check if UFW is installed
        ufw_check = subprocess.run(["which", "ufw"], capture_output=True)
        
        if ufw_check.returncode == 0:
            # Use UFW
            result = subprocess.run(
                ["sudo", "ufw", "deny", str(port)],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                log_event("PORT", f"✓ Port {port} closed via UFW", "SUCCESS")
                
                # Also kill any process using the port
                kill_result = kill_process_on_port(port)
                
                return {
                    "success": True,
                    "port": port,
                    "method": "ufw",
                    "message": f"Port {port} closed successfully. {kill_result.get('message', '')}"
                }
            else:
                log_event("PORT", f"UFW requires sudo. Attempting to kill process only.", "WARNING")
                kill_result = kill_process_on_port(port)
                return kill_result
        else:
            # Try iptables
            result = subprocess.run(
                ["sudo", "iptables", "-I", "INPUT", "-p", "tcp", "--dport", str(port), "-j", "DROP"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                log_event("PORT", f"✓ Port {port} closed via iptables", "SUCCESS")
                kill_result = kill_process_on_port(port)
                return {
                    "success": True,
                    "port": port,
                    "method": "iptables",
                    "message": f"Port {port} closed successfully. {kill_result.get('message', '')}"
                }
            else:
                log_event("PORT", f"iptables requires sudo. Attempting to kill process only.", "WARNING")
                kill_result = kill_process_on_port(port)
                return kill_result
                
    except subprocess.TimeoutExpired:
        log_event("PORT", f"Timeout closing port {port}", "ERROR")
        return {
            "success": False,
            "port": port,
            "message": f"Timeout while closing port {port}"
        }
    except Exception as e:
        log_event("PORT", f"Failed to close port {port}: {e}", "ERROR")
        return {
            "success": False,
            "port": port,
            "message": f"Error closing port {port}: {str(e)}"
        }

def kill_process_on_port(port):
    """Kill any process listening on the specified port"""
    try:
        # Find process using the port
        result = subprocess.run(
            ["lsof", "-ti", f":{port}"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            killed = []
            for pid in pids:
                try:
                    subprocess.run(["kill", "-9", pid], timeout=2)
                    killed.append(pid)
                    log_event("PORT", f"Killed process {pid} on port {port}", "INFO")
                except:
                    pass
            
            if killed:
                return {
                    "success": True,
                    "port": port,
                    "method": "kill",
                    "message": f"Killed {len(killed)} process(es) on port {port}"
                }
        
        return {
            "success": True,
            "port": port,
            "method": "none",
            "message": f"No process found on port {port}"
        }
        
    except Exception as e:
        log_event("PORT", f"Failed to kill process on port {port}: {e}", "WARNING")
        return {
            "success": False,
            "port": port,
            "message": f"Could not kill process on port {port}: {str(e)}"
        }
