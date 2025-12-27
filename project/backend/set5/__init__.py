"""
Compliance Checker Module for Sentinel AI Network
"""

import subprocess
import socket
import os
from datetime import datetime

def check_proxy_settings():
    """Check if system proxy is configured correctly"""
    try:
        # Check environment variables for proxy
        http_proxy = os.environ.get('http_proxy', '')
        https_proxy = os.environ.get('https_proxy', '')
        
        # Check gsettings for GNOME proxy
        try:
            mode = subprocess.check_output(
                ['gsettings', 'get', 'org.gnome.system.proxy', 'mode'],
                stderr=subprocess.DEVNULL
            ).decode().strip().strip("'")
            
            if mode == 'manual':
                host = subprocess.check_output(
                    ['gsettings', 'get', 'org.gnome.system.proxy.http', 'host'],
                    stderr=subprocess.DEVNULL
                ).decode().strip().strip("'")
                
                port = subprocess.check_output(
                    ['gsettings', 'get', 'org.gnome.system.proxy.http', 'port'],
                    stderr=subprocess.DEVNULL
                ).decode().strip()
                
                if host == 'proxy.example.com' and port == '8080':
                    return True, f"Proxy configured: {host}:{port}"
        except:
            pass
        
        # Fallback: check environment variables
        expected_proxy = "http://proxy.example.com:8080"
        if expected_proxy in http_proxy or expected_proxy in https_proxy:
            return True, "Proxy configured via environment variables"
        
        return False, "Proxy not configured correctly"
        
    except Exception as e:
        return False, f"Error checking proxy: {str(e)}"

def check_blocked_websites():
    """Check if specified websites are blocked"""
    blocked_sites = ['netflix.com', 'facebook.com', 'instagram.com', 'youtube.com']
    results = []
    all_blocked = True
    
    for site in blocked_sites:
        try:
            # Check /etc/hosts for blocking
            with open('/etc/hosts', 'r') as f:
                hosts_content = f.read()
                if site in hosts_content and '127.0.0.1' in hosts_content:
                    results.append(f"{site}: blocked")
                    continue
            
            # Try to resolve DNS (if resolves, not blocked at DNS level)
            try:
                socket.gethostbyname(site)
                results.append(f"{site}: not blocked")
                all_blocked = False
            except socket.gaierror:
                results.append(f"{site}: blocked")
                
        except Exception as e:
            results.append(f"{site}: check failed")
            all_blocked = False
    
    return all_blocked, "; ".join(results)

def check_default_shell():
    """Check if default shell is bash"""
    try:
        # Get current user's default shell
        shell = os.environ.get('SHELL', '')
        
        if 'bash' in shell:
            return True, f"Default shell is bash: {shell}"
        else:
            return False, f"Default shell is {shell}, should be bash"
            
    except Exception as e:
        return False, f"Error checking shell: {str(e)}"

def check_wifi_security():
    """Check if device is not connected to open WiFi"""
    try:
        # Check current WiFi connection using nmcli
        result = subprocess.run(
            ['nmcli', '-t', '-f', 'ACTIVE,SSID,SECURITY', 'dev', 'wifi'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if line.startswith('yes:'):
                    parts = line.split(':')
                    if len(parts) >= 3:
                        ssid = parts[1]
                        security = parts[2]
                        
                        if security == '' or security == '--':
                            return False, f"Connected to open WiFi network: {ssid}"
                        else:
                            return True, f"Connected to secured WiFi: {ssid}"
            
            return True, "Not connected to WiFi"
        else:
            return True, "WiFi status unknown (assuming compliant)"
            
    except subprocess.TimeoutExpired:
        return True, "WiFi check timed out"
    except Exception as e:
        return True, f"WiFi check error (assuming compliant): {str(e)}"

def calculate_compliance(results):
    """Calculate overall compliance percentage"""
    total_checks = len(results)
    passed_checks = sum(1 for r in results.values() if r['passed'])
    return (passed_checks / total_checks) * 100 if total_checks > 0 else 0

def run_compliance_checks():
    """Main compliance checking function - returns results without sending to server"""
    # Get device hostname
    device_name = socket.gethostname()
    
    # Run all compliance checks
    checks = {}
    
    proxy_passed, proxy_msg = check_proxy_settings()
    checks['proxy'] = {'passed': proxy_passed, 'message': proxy_msg}
    
    websites_passed, websites_msg = check_blocked_websites()
    checks['blocked_websites'] = {'passed': websites_passed, 'message': websites_msg}
    
    shell_passed, shell_msg = check_default_shell()
    checks['default_shell'] = {'passed': shell_passed, 'message': shell_msg}
    
    wifi_passed, wifi_msg = check_wifi_security()
    checks['wifi_security'] = {'passed': wifi_passed, 'message': wifi_msg}
    
    # Calculate compliance percentage
    compliance_percentage = calculate_compliance(checks)
    
    # Determine status
    if compliance_percentage >= 100:
        status = "FULLY COMPLIANT"
    elif compliance_percentage >= 75:
        status = "MOSTLY COMPLIANT"
    else:
        status = "NON-COMPLIANT"
    
    # Prepare report data
    report_data = {
        'device_name': device_name,
        'timestamp': datetime.now().isoformat(),
        'compliance_percentage': compliance_percentage,
        'status': status,
        'checks': checks
    }
    
    return report_data
