#!/usr/bin/env python3
"""
Sentinel AI Network - Compliance Checker
Checks system compliance with organizational policies
"""

import subprocess
import socket
import json
import os
import sys
import time
import requests
from datetime import datetime

# ANSI color codes for terminal
BLUE = '\033[94m'
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'
BOLD = '\033[1m'

# API endpoint for reporting
REPORT_ENDPOINT = "http://localhost:5001/api/report"

def print_banner():
    """Display compliance testing banner"""
    os.system('clear')
    banner = f"""
{BLUE}{BOLD}╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        SENTINEL AI NETWORK - COMPLIANCE TESTING              ║
║                  Testing in Progress...                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝{RESET}
"""
    print(banner)
    time.sleep(1)

def check_proxy_settings():
    """Check if system proxy is configured correctly"""
    print(f"\n{YELLOW}[1/4]{RESET} Checking proxy settings...")
    time.sleep(0.5)
    
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
                    print(f"   {GREEN}✓{RESET} Proxy configured: {host}:{port}")
                    return True, f"Proxy configured correctly: {host}:{port}"
        except:
            pass
        
        # Fallback: check environment variables
        expected_proxy = "http://proxy.example.com:8080"
        if expected_proxy in http_proxy or expected_proxy in https_proxy:
            print(f"   {GREEN}✓{RESET} Proxy configured via environment")
            return True, "Proxy configured via environment variables"
        
        print(f"   {RED}✗{RESET} Proxy not configured or incorrect")
        return False, "Proxy not configured correctly"
        
    except Exception as e:
        print(f"   {RED}✗{RESET} Error checking proxy: {str(e)}")
        return False, f"Error checking proxy: {str(e)}"

def check_blocked_websites():
    """Check if specified websites are blocked"""
    print(f"\n{YELLOW}[2/4]{RESET} Checking website blocks...")
    time.sleep(0.5)
    
    blocked_sites = ['netflix.com', 'facebook.com', 'instagram.com', 'youtube.com']
    results = []
    all_blocked = True
    
    for site in blocked_sites:
        try:
            # Check /etc/hosts for blocking
            with open('/etc/hosts', 'r') as f:
                hosts_content = f.read()
                if site in hosts_content and '127.0.0.1' in hosts_content:
                    print(f"   {GREEN}✓{RESET} {site} is blocked")
                    results.append(f"{site}: blocked")
                    continue
            
            # Try to resolve DNS (if resolves, not blocked at DNS level)
            try:
                socket.gethostbyname(site)
                print(f"   {RED}✗{RESET} {site} is NOT blocked")
                results.append(f"{site}: not blocked")
                all_blocked = False
            except socket.gaierror:
                print(f"   {GREEN}✓{RESET} {site} is blocked (DNS)")
                results.append(f"{site}: blocked")
                
        except Exception as e:
            print(f"   {YELLOW}?{RESET} {site} check failed: {str(e)}")
            results.append(f"{site}: check failed")
            all_blocked = False
    
    return all_blocked, "; ".join(results)

def check_default_shell():
    """Check if default shell is bash"""
    print(f"\n{YELLOW}[3/4]{RESET} Checking default shell...")
    time.sleep(0.5)
    
    try:
        # Get current user's default shell
        shell = os.environ.get('SHELL', '')
        
        if 'bash' in shell:
            print(f"   {GREEN}✓{RESET} Default shell is bash: {shell}")
            return True, f"Default shell is bash: {shell}"
        else:
            print(f"   {RED}✗{RESET} Default shell is not bash: {shell}")
            return False, f"Default shell is {shell}, should be bash"
            
    except Exception as e:
        print(f"   {RED}✗{RESET} Error checking shell: {str(e)}")
        return False, f"Error checking shell: {str(e)}"

def check_wifi_security():
    """Check if device is not connected to open WiFi"""
    print(f"\n{YELLOW}[4/4]{RESET} Checking WiFi security...")
    time.sleep(0.5)
    
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
                            print(f"   {RED}✗{RESET} Connected to open WiFi: {ssid}")
                            return False, f"Connected to open WiFi network: {ssid}"
                        else:
                            print(f"   {GREEN}✓{RESET} Connected to secured WiFi: {ssid} ({security})")
                            return True, f"Connected to secured WiFi: {ssid}"
            
            print(f"   {GREEN}✓{RESET} Not connected to WiFi")
            return True, "Not connected to WiFi"
        else:
            print(f"   {YELLOW}?{RESET} Could not check WiFi status")
            return True, "WiFi status unknown (assuming compliant)"
            
    except subprocess.TimeoutExpired:
        print(f"   {YELLOW}?{RESET} WiFi check timed out")
        return True, "WiFi check timed out"
    except Exception as e:
        print(f"   {YELLOW}?{RESET} Error checking WiFi: {str(e)}")
        return True, f"WiFi check error (assuming compliant): {str(e)}"

def calculate_compliance(results):
    """Calculate overall compliance percentage"""
    total_checks = len(results)
    passed_checks = sum(1 for r in results.values() if r['passed'])
    return (passed_checks / total_checks) * 100 if total_checks > 0 else 0

def send_report(report_data, max_retries=1):
    """Send compliance report to server"""
    print(f"\n{BLUE}Sending compliance report...{RESET}")
    
    for attempt in range(max_retries + 1):
        try:
            response = requests.post(
                REPORT_ENDPOINT,
                json=report_data,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"{GREEN}✓ Report sent successfully!{RESET}")
                return True
            else:
                print(f"{YELLOW}⚠ Server returned status {response.status_code}{RESET}")
                
        except Exception as e:
            print(f"{RED}✗ Failed to send report: {str(e)}{RESET}")
            
        if attempt < max_retries:
            print(f"{YELLOW}Retrying... (attempt {attempt + 2}/{max_retries + 1}){RESET}")
            time.sleep(2)
    
    print(f"{RED}✗ Could not send report after {max_retries + 1} attempts{RESET}")
    return False

def main():
    """Main compliance checking function"""
    print_banner()
    
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
    
    # Display results
    print(f"\n{BLUE}{BOLD}{'='*62}{RESET}")
    print(f"{BOLD}COMPLIANCE REPORT{RESET}")
    print(f"{BLUE}{BOLD}{'='*62}{RESET}")
    
    if compliance_percentage >= 100:
        color = GREEN
        status = "FULLY COMPLIANT"
    elif compliance_percentage >= 75:
        color = YELLOW
        status = "MOSTLY COMPLIANT"
    else:
        color = RED
        status = "NON-COMPLIANT"
    
    print(f"\n{color}{BOLD}Compliance Score: {compliance_percentage:.0f}% - {status}{RESET}\n")
    
    # Prepare report data
    report_data = {
        'device_name': device_name,
        'timestamp': datetime.now().isoformat(),
        'compliance_percentage': compliance_percentage,
        'checks': checks
    }
    
    # Send report to server
    send_report(report_data)
    
    # Wait before cleanup
    print(f"\n{BLUE}Cleaning up...{RESET}")
    time.sleep(2)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{RED}Compliance check interrupted{RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}Error during compliance check: {str(e)}{RESET}")
        sys.exit(1)
