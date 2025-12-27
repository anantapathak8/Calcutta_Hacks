"""
Execution Engine for Wi-Fi Hotspot Creation
Generates and executes OS-specific commands with rollback support
"""
import subprocess
import logging
from typing import Dict, Any, Optional, List
from .config import DRY_RUN_MODE, LOG_FILE, PASSWORD_REDACTION


# Configure logging
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ExecutionEngine:
    """
    Executes OS-specific commands to create/manage Wi-Fi hotspots
    """
    
    def __init__(self, os_info: Dict[str, Any], dry_run: bool = DRY_RUN_MODE):
        self.os_name = os_info.get("os")
        self.command_tool = os_info.get("command_tool")
        self.adapter = os_info.get("adapter")
        self.dry_run = dry_run
        self.active_hotspot = None
        
    def create_hotspot(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create Wi-Fi hotspot with given parameters
        
        Args:
            params: Dictionary with ssid, security, band, password
            
        Returns:
            Result dictionary with status, message, and any errors
        """
        # Log the action (password redacted)
        safe_params = self._redact_password(params)
        logger.info(f"Creating hotspot with params: {safe_params}")
        
        # Generate commands based on OS
        if self.os_name == "linux":
            result = self._create_linux_hotspot(params)
        elif self.os_name == "windows":
            result = self._create_windows_hotspot(params)
        else:
            result = {
                "status": "error",
                "message": f"Unsupported OS: {self.os_name}"
            }
        
        if result["status"] == "success":
            self.active_hotspot = params.get("ssid")
        
        return result
    
    def stop_hotspot(self) -> Dict[str, Any]:
        """
        Stop the currently active hotspot
        
        Returns:
            Result dictionary with status and message
        """
        logger.info(f"Stopping hotspot: {self.active_hotspot}")
        
        if not self.active_hotspot:
            return {
                "status": "error",
                "message": "No active hotspot to stop"
            }
        
        if self.os_name == "linux":
            result = self._stop_linux_hotspot()
        elif self.os_name == "windows":
            result = self._stop_windows_hotspot()
        else:
            result = {
                "status": "error",
                "message": f"Unsupported OS: {self.os_name}"
            }
        
        if result["status"] == "success":
            self.active_hotspot = None
        
        return result
    
    def _create_linux_hotspot(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create hotspot on Linux using nmcli"""
        
        ssid = params["ssid"]
        password = params.get("password")
        band = params["band"]
        security = params["security"]
        
        # Convert band to nmcli format
        band_flag = "bg" if band == "2.4GHz" else "a"
        
        # Build nmcli command
        if self.command_tool == "nmcli":
            if security == "Open":
                cmd = [
                    "sudo", "nmcli", "device", "wifi", "hotspot",
                    "ifname", self.adapter,
                    "ssid", ssid,
                    "band", band_flag
                ]
            else:
                cmd = [
                    "sudo", "nmcli", "device", "wifi", "hotspot",
                    "ifname", self.adapter,
                    "ssid", ssid,
                    "password", password,
                    "band", band_flag
                ]
            
            # Log command (redacted)
            safe_cmd = self._redact_password_from_cmd(cmd)
            logger.info(f"Executing command: {' '.join(safe_cmd)}")
            
            if self.dry_run:
                return {
                    "status": "success",
                    "message": "DRY RUN: Command generated successfully",
                    "command": ' '.join(safe_cmd),
                    "dry_run": True
                }
            
            # Execute command
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    return {
                        "status": "success",
                        "message": f"Hotspot '{ssid}' created successfully",
                        "ssid": ssid,
                        "output": result.stdout
                    }
                else:
                    error_msg = result.stderr or result.stdout
                    logger.error(f"Failed to create hotspot: {error_msg}")
                    return {
                        "status": "error",
                        "message": f"Failed to create hotspot: {error_msg}"
                    }
            
            except subprocess.TimeoutExpired:
                return {
                    "status": "error",
                    "message": "Command timed out after 30 seconds"
                }
            except Exception as e:
                logger.error(f"Exception during hotspot creation: {str(e)}")
                return {
                    "status": "error",
                    "message": f"Error creating hotspot: {str(e)}"
                }
        else:
            return {
                "status": "error",
                "message": f"Unsupported command tool: {self.command_tool}"
            }
    
    def _create_windows_hotspot(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create hotspot on Windows using netsh"""
        
        ssid = params["ssid"]
        password = params.get("password")
        security = params["security"]
        
        commands = []
        
        # Set hosted network configuration
        if security == "Open":
            # Windows doesn't support open hotspots via netsh easily
            return {
                "status": "error",
                "message": "Open networks are not supported on Windows hotspot"
            }
        else:
            commands.append([
                "netsh", "wlan", "set", "hostednetwork",
                "mode=allow",
                f"ssid={ssid}",
                f"key={password}"
            ])
        
        # Start the hosted network
        commands.append([
            "netsh", "wlan", "start", "hostednetwork"
        ])
        
        # Log commands (redacted)
        safe_commands = [self._redact_password_from_cmd(cmd) for cmd in commands]
        logger.info(f"Executing commands: {[' '.join(cmd) for cmd in safe_commands]}")
        
        if self.dry_run:
            return {
                "status": "success",
                "message": "DRY RUN: Commands generated successfully",
                "commands": [' '.join(cmd) for cmd in safe_commands],
                "dry_run": True
            }
        
        # Execute commands
        try:
            for cmd in commands:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode != 0:
                    error_msg = result.stderr or result.stdout
                    logger.error(f"Failed to create hotspot: {error_msg}")
                    return {
                        "status": "error",
                        "message": f"Failed to create hotspot: {error_msg}"
                    }
            
            return {
                "status": "success",
                "message": f"Hotspot '{ssid}' created successfully",
                "ssid": ssid
            }
        
        except subprocess.TimeoutExpired:
            return {
                "status": "error",
                "message": "Command timed out after 30 seconds"
            }
        except Exception as e:
            logger.error(f"Exception during hotspot creation: {str(e)}")
            return {
                "status": "error",
                "message": f"Error creating hotspot: {str(e)}"
            }
    
    def _stop_linux_hotspot(self) -> Dict[str, Any]:
        """Stop hotspot on Linux"""
        
        cmd = ["sudo", "nmcli", "connection", "down", "Hotspot"]
        
        logger.info(f"Executing command: {' '.join(cmd)}")
        
        if self.dry_run:
            return {
                "status": "success",
                "message": "DRY RUN: Hotspot would be stopped",
                "command": ' '.join(cmd),
                "dry_run": True
            }
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=15
            )
            
            # nmcli returns non-zero if connection is already down, which is fine
            return {
                "status": "success",
                "message": "Hotspot stopped successfully",
                "output": result.stdout
            }
        
        except Exception as e:
            logger.error(f"Exception during hotspot stop: {str(e)}")
            return {
                "status": "error",
                "message": f"Error stopping hotspot: {str(e)}"
            }
    
    def _stop_windows_hotspot(self) -> Dict[str, Any]:
        """Stop hotspot on Windows"""
        
        cmd = ["netsh", "wlan", "stop", "hostednetwork"]
        
        logger.info(f"Executing command: {' '.join(cmd)}")
        
        if self.dry_run:
            return {
                "status": "success",
                "message": "DRY RUN: Hotspot would be stopped",
                "command": ' '.join(cmd),
                "dry_run": True
            }
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                return {
                    "status": "success",
                    "message": "Hotspot stopped successfully"
                }
            else:
                error_msg = result.stderr or result.stdout
                return {
                    "status": "error",
                    "message": f"Failed to stop hotspot: {error_msg}"
                }
        
        except Exception as e:
            logger.error(f"Exception during hotspot stop: {str(e)}")
            return {
                "status": "error",
                "message": f"Error stopping hotspot: {str(e)}"
            }
    
    def _redact_password(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a copy of params with password redacted"""
        safe = params.copy()
        if "password" in safe and safe["password"]:
            safe["password"] = PASSWORD_REDACTION
        return safe
    
    def _redact_password_from_cmd(self, cmd: List[str]) -> List[str]:
        """Redact password from command list"""
        safe_cmd = cmd.copy()
        
        # Find password in command
        for i, arg in enumerate(safe_cmd):
            if "password" in arg.lower() or "key" in arg.lower():
                # Check if password is in same arg (key=value format)
                if "=" in arg:
                    key = arg.split("=")[0]
                    safe_cmd[i] = f"{key}={PASSWORD_REDACTION}"
                # Check if password is next arg
                elif i + 1 < len(safe_cmd):
                    safe_cmd[i + 1] = PASSWORD_REDACTION
        
        return safe_cmd
