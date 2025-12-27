"""
OS Detector and Wi-Fi Adapter Capability Checker
Detects operating system and verifies Wi-Fi adapter supports hotspot mode
"""
import os
import platform
import subprocess
import re
from typing import Dict, Any, Optional


class OSDetector:
    """
    Detects OS and checks Wi-Fi adapter capabilities
    """
    
    def __init__(self):
        self.os_name = platform.system().lower()
        self.os_version = platform.release()
        
    def get_system_capabilities(self) -> Dict[str, Any]:
        """
        Get complete system capabilities for hotspot creation
        
        Returns:
            Dictionary with OS info, adapter info, and capability flags
        """
        result = {
            "os": self.os_name,
            "os_version": self.os_version,
            "adapter": None,
            "supports_ap": False,
            "has_permissions": False,
            "command_tool": None,
            "errors": [],
            "warnings": []
        }
        
        if self.os_name == "linux":
            self._check_linux_capabilities(result)
        elif self.os_name == "windows":
            self._check_windows_capabilities(result)
        elif self.os_name == "darwin":  # macOS
            result["errors"].append("macOS hotspot creation not yet implemented")
        else:
            result["errors"].append(f"Unsupported operating system: {self.os_name}")
        
        return result
    
    def _check_linux_capabilities(self, result: Dict[str, Any]) -> None:
        """Check Linux system capabilities"""
        
        # Check for nmcli (NetworkManager)
        if self._command_exists("nmcli"):
            result["command_tool"] = "nmcli"
            
            # Get Wi-Fi adapter
            adapter = self._get_linux_wifi_adapter()
            if adapter:
                result["adapter"] = adapter
                
                # Check if adapter supports AP mode
                supports_ap = self._check_linux_ap_support(adapter)
                result["supports_ap"] = supports_ap
                
                if not supports_ap:
                    result["warnings"].append(
                        f"Adapter {adapter} may not support AP/hotspot mode. "
                        "Check with: iw list | grep 'Supported interface modes'"
                    )
            else:
                result["errors"].append("No Wi-Fi adapter found")
        
        elif self._command_exists("hostapd"):
            result["command_tool"] = "hostapd"
            result["warnings"].append(
                "Using hostapd requires manual configuration. "
                "NetworkManager (nmcli) is recommended for easier setup."
            )
        else:
            result["errors"].append(
                "Neither nmcli nor hostapd found. "
                "Install NetworkManager: sudo apt-get install network-manager"
            )
        
        # Check for sudo permissions
        result["has_permissions"] = self._check_sudo_permissions()
        if not result["has_permissions"]:
            result["warnings"].append(
                "Hotspot creation requires sudo permissions. "
                "You will be prompted for your password."
            )
    
    def _check_windows_capabilities(self, result: Dict[str, Any]) -> None:
        """Check Windows system capabilities"""
        
        # Check for netsh
        if self._command_exists("netsh"):
            result["command_tool"] = "netsh"
            
            # Check if hosted network is supported
            try:
                output = subprocess.check_output(
                    ["netsh", "wlan", "show", "drivers"],
                    stderr=subprocess.STDOUT,
                    text=True
                )
                
                if "Hosted network supported  : Yes" in output:
                    result["supports_ap"] = True
                    result["adapter"] = "Wireless Adapter"  # Windows doesn't need specific adapter name
                else:
                    result["errors"].append(
                        "Your Wi-Fi adapter does not support hosted network mode"
                    )
            except subprocess.CalledProcessError as e:
                result["errors"].append(f"Failed to check Wi-Fi capabilities: {str(e)}")
        else:
            result["errors"].append("netsh command not found")
        
        # Check for admin permissions
        result["has_permissions"] = self._check_admin_permissions()
        if not result["has_permissions"]:
            result["warnings"].append(
                "Hotspot creation requires administrator privileges. "
                "Run the application as administrator."
            )
    
    def _command_exists(self, command: str) -> bool:
        """Check if a command exists in system PATH"""
        try:
            if self.os_name == "windows":
                subprocess.check_output(
                    ["where", command],
                    stderr=subprocess.DEVNULL
                )
            else:
                subprocess.check_output(
                    ["which", command],
                    stderr=subprocess.DEVNULL
                )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def _get_linux_wifi_adapter(self) -> Optional[str]:
        """Get the first available Wi-Fi adapter on Linux"""
        try:
            # Try using nmcli
            output = subprocess.check_output(
                ["nmcli", "device", "status"],
                stderr=subprocess.DEVNULL,
                text=True
            )
            
            # Parse output to find wifi device
            for line in output.split('\n'):
                if 'wifi' in line.lower():
                    # Extract device name (first column)
                    device = line.split()[0]
                    return device
            
            # Fallback: look for wlan0, wlp* pattern
            if os.path.exists("/sys/class/net"):
                for iface in os.listdir("/sys/class/net"):
                    if iface.startswith("wl"):
                        return iface
            
            return None
        except Exception:
            return None
    
    def _check_linux_ap_support(self, adapter: str) -> bool:
        """
        Check if Linux Wi-Fi adapter supports AP mode
        """
        try:
            # Use iw to check supported modes
            output = subprocess.check_output(
                ["iw", "list"],
                stderr=subprocess.DEVNULL,
                text=True
            )
            
            # Look for AP mode support
            if "* AP" in output or "* AP/VLAN" in output:
                return True
            
            # Some adapters might show it differently
            if "Supported interface modes" in output:
                # Check if AP is listed in the modes
                modes_section = output.split("Supported interface modes")[1].split("\n\n")[0]
                if "AP" in modes_section:
                    return True
            
            return False
        except Exception:
            # If we can't check, assume it might work (optimistic)
            return True
    
    def _check_sudo_permissions(self) -> bool:
        """Check if current user has sudo permissions"""
        try:
            # Check if we can run sudo -n (non-interactive)
            result = subprocess.run(
                ["sudo", "-n", "true"],
                stderr=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL
            )
            return result.returncode == 0
        except Exception:
            return False
    
    def _check_admin_permissions(self) -> bool:
        """Check if running with administrator privileges on Windows"""
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except Exception:
            return False
