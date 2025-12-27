"""
NAT Forwarding & Nginx Configuration Manager
============================================
Manages nginx reverse proxy configuration for port forwarding.
"""

import subprocess
import os
import socket
from typing import List, Dict
from datetime import datetime


class NginxConfigManager:
    """
    Manages nginx configuration for reverse proxy / NAT forwarding.
    """
    
    def __init__(self):
        self.config_file = '/etc/nginx/sites-enabled/calcutta-hacks'
        self.server_name = 'calcutta-hacks-server.uemcseaiml.org'
        self.port_forwards = []  # List of active port forwarding rules
    
    def get_local_ip(self) -> str:
        """Get local IP address assigned by router"""
        try:
            # Connect to external address to determine local IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except Exception:
            return "192.168.1.100"  # Fallback
    
    def get_gateway_ip(self) -> str:
        """Get default gateway (router) IP address"""
        try:
            result = subprocess.run(
                ['ip', 'route', 'show', 'default'],
                capture_output=True,
                text=True,
                check=True
            )
            # Parse: default via 192.168.1.1 dev eth0
            gateway = result.stdout.split()[2]
            return gateway
        except Exception:
            return "192.168.1.1"  # Fallback
    
    def generate_nginx_config(self, rules: List[Dict]) -> str:
        """
        Generate nginx configuration from forwarding rules.
        
        Args:
            rules: List of forwarding rule dicts
            
        Returns:
            Full nginx config as string
        """
        config = f"""server {{
    listen 80;
    server_name {self.server_name};
"""
        
        # Add location blocks for each rule
        for rule in rules:
            proxy_name = rule.get('proxy_name', 'route')
            internal_port = rule.get('internal_port', 8000)
            
            config += f"""
    # Proxy requests to 127.0.0.1:{internal_port}
    location /{proxy_name}/ {{
        rewrite ^/{proxy_name}(/.*)$ $1 break;
        proxy_pass http://127.0.0.1:{internal_port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }}
"""
        
        config += "}\n"
        return config
    
    def write_nginx_config(self, config: str) -> bool:
        """
        Write nginx configuration to file using sudo.
        
        Args:
            config: Configuration string
            
        Returns:
            True if successful
        """
        try:
            # Write to temporary file first
            temp_file = '/tmp/nginx_config_temp'
            with open(temp_file, 'w') as f:
                f.write(config)
            
            # Move to nginx config location with sudo
            subprocess.run(
                ['sudo', 'cp', temp_file, self.config_file],
                check=True,
                capture_output=True
            )
            
            # Clean up temp file
            os.remove(temp_file)
            
            print(f"[NGINX] Config written to {self.config_file}")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"[NGINX] Error writing config: {e.stderr.decode()}")
            return False
        except Exception as e:
            print(f"[NGINX] Error: {e}")
            return False
    
    def reload_nginx(self) -> bool:
        """
        Reload nginx to apply configuration changes.
        
        Returns:
            True if successful
        """
        try:
            result = subprocess.run(
                ['sudo', 'systemctl', 'reload', 'nginx'],
                check=True,
                capture_output=True,
                text=True
            )
            print("[NGINX] Reloaded successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"[NGINX] Reload failed: {e.stderr}")
            return False
        except Exception as e:
            print(f"[NGINX] Error: {e}")
            return False
    
    def test_nginx_config(self) -> tuple[bool, str]:
        """
        Test nginx configuration for syntax errors.
        
        Returns:
            (success, message) tuple
        """
        try:
            result = subprocess.run(
                ['sudo', 'nginx', '-t'],
                capture_output=True,
                text=True,
                check=True
            )
            return True, result.stderr
            
        except subprocess.CalledProcessError as e:
            return False, e.stderr
    
    def add_rule(self, rule: Dict) -> Dict:
        """
        Add a port forwarding rule.
        
        Args:
            rule: Dict with internal_ip, virtual_port, internal_port, proxy_name, protocol
            
        Returns:
            Result dict
        """
        # Validate rule
        required_fields = ['internal_ip', 'internal_port', 'proxy_name']
        for field in required_fields:
            if field not in rule:
                return {"error": f"Missing required field: {field}"}
        
        # Add rule to list
        rule['id'] = len(self.port_forwards) + 1
        rule['created_at'] = datetime.now().isoformat()
        self.port_forwards.append(rule)
        
        # Regenerate and apply config
        config = self.generate_nginx_config(self.port_forwards)
        
        # Test config first
        if not self.write_nginx_config(config):
            self.port_forwards.remove(rule)
            return {"error": "Failed to write nginx config"}
        
        test_ok, test_msg = self.test_nginx_config()
        if not test_ok:
            self.port_forwards.remove(rule)
            return {"error": f"Nginx config test failed: {test_msg}"}
        
        # Reload nginx
        if not self.reload_nginx():
            self.port_forwards.remove(rule)
            return {"error": "Failed to reload nginx"}
        
        return {
            "status": "success",
            "message": f"Rule added for /{rule['proxy_name']}/ -> port {rule['internal_port']}",
            "rule": rule
        }
    
    def remove_rule(self, rule_id: int) -> Dict:
        """
        Remove a port forwarding rule.
        
        Args:
            rule_id: ID of rule to remove
            
        Returns:
            Result dict
        """
        # Find and remove rule
        rule_to_remove = None
        for rule in self.port_forwards:
            if rule.get('id') == rule_id:
                rule_to_remove = rule
                break
        
        if not rule_to_remove:
            return {"error": "Rule not found"}
        
        self.port_forwards.remove(rule_to_remove)
        
        # Regenerate and apply config
        config = self.generate_nginx_config(self.port_forwards)
        
        if not self.write_nginx_config(config):
            self.port_forwards.append(rule_to_remove)
            return {"error": "Failed to write nginx config"}
        
        test_ok, test_msg = self.test_nginx_config()
        if not test_ok:
            self.port_forwards.append(rule_to_remove)
            return {"error": f"Nginx config test failed: {test_msg}"}
        
        if not self.reload_nginx():
            self.port_forwards.append(rule_to_remove)
            return {"error": "Failed to reload nginx"}
        
        return {
            "status": "success",
            "message": f"Rule removed: /{rule_to_remove['proxy_name']}/",
            "removed_rule": rule_to_remove
        }
    
    def get_all_rules(self) -> List[Dict]:
        """Get all active port forwarding rules"""
        return self.port_forwards
    
    def clear_all_rules(self) -> Dict:
        """Remove all port forwarding rules"""
        self.port_forwards = []
        
        # Write minimal config
        config = self.generate_nginx_config([])
        
        if not self.write_nginx_config(config):
            return {"error": "Failed to write nginx config"}
        
        if not self.reload_nginx():
            return {"error": "Failed to reload nginx"}
        
        return {
            "status": "success",
            "message": "All rules cleared"
        }


# Global manager instance
_manager = None


def get_manager():
    """Get or create global nginx manager instance"""
    global _manager
    if _manager is None:
        _manager = NginxConfigManager()
    return _manager
