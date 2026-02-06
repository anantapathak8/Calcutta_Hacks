from apscheduler.schedulers.background import BackgroundScheduler
import time
import json
import os
from utils.terminal_logger import log_event, get_recent_logs

# Import Scanners
from set1.scanner_ports import scan_ports
from set1.encryption_checker import check_encryption
from set1.router_security import check_router_security
from set1.mitm_detector import check_mitm
from set1.deauth_predictor import predict_deauth
from set2.network_graph import discover_devices
from set3.config_advisor import analyze_configuration
from set4.hardware_trust import check_usb_key
from ai.ai_risk_engine import analyze_risk
from utils.mcp import execute_mitigation

scheduler = BackgroundScheduler()

# Global state for hybrid scanning
latest_findings = {
    "timestamp": 0,
    "scans": {
        "ports": [],
        "encryption": {},
        "router": {},
        "mitm": {},
        "deauth_prediction": {},
        "network_graph": {},
        "config_issues": []
    },
    "hardware_trust": {},
    "risk_score": 0,
    "risk_level": "UNKNOWN",
    "ai_explanation": "",
    "ai_explanation": "",
    "action_plan": [],
    "logs": []
}

def analyze_and_save():
    """Helper to run analysis and save merged findings."""
    global latest_findings
    
    # Sync logs
    latest_findings["logs"] = get_recent_logs()
    
    # Analyze Risk based on merged data
    analysis = analyze_risk(latest_findings)
    latest_findings["risk_score"]=analysis["score"]
    latest_findings["risk_level"]=analysis["level"]
    latest_findings["ai_explanation"]=analysis["explanation"]
    latest_findings["action_plan"]=analysis["proposed_actions"]
    
    # Execute MCP
    if analysis["proposed_actions"]:
        log_event("MCP", f"Executing {len(analysis['proposed_actions'])} mitigation actions...", "ACTION")
        mcp_results=execute_mitigation(analysis["proposed_actions"])
        latest_findings["mcp_results"]=mcp_results
    else:
        latest_findings["mcp_results"]=[]

    # Save
    output_path = os.path.join(os.path.dirname(__file__), 'output/latest.json')
    try:
        with open(output_path, 'w') as f:
            json.dump(latest_findings, f, indent=2)
    except Exception as e:
        log_event("SYSTEM", f"Failed to save scan results: {str(e)}", "CRITICAL")

def run_fast_scan():
    """Runs every 3s - Updates fast changing data."""
    global latest_findings
    log_event("SYSTEM", "Starting FAST scan cycle...", "SCAN")
    
    # Update common ports - scan_ports now returns a dict with open_ports, vulnerable_ports, summary
    scan_result = scan_ports(mode="FAST")
    fast_ports = scan_result.get("open_ports", []) if isinstance(scan_result, dict) else scan_result
    
    # Merge strategy: Keep FULL scan ports if they exist, but update FAST ports
    # For simplicity in this demo, we will blindly merge unique ports
    current_ports = latest_findings["scans"].get("ports", [])
    
    # simple merge by port number to avoid duplicates
    port_map = {p['port']: p for p in current_ports}
    for p in fast_ports:
        port_map[p['port']] = p
    
    latest_findings["scans"]["ports"] = list(port_map.values())
    
    # Store vulnerability summary
    if isinstance(scan_result, dict):
        latest_findings["scans"]["port_vulnerabilities"] = scan_result.get("vulnerable_ports", [])
        latest_findings["scans"]["port_summary"] = scan_result.get("summary", {})
    
    # Run other fast checks
    latest_findings["scans"]["mitm"] = check_mitm()
    latest_findings["scans"]["deauth_prediction"] = predict_deauth()
    latest_findings["hardware_trust"] = check_usb_key()
    latest_findings["timestamp"] = time.time()
    
    analyze_and_save()

def run_full_scan():
    """Runs every 60s - Updates deep data."""
    global latest_findings
    log_event("SYSTEM", "Starting FULL scan cycle (Background)...", "SCAN")
    
    # Update ALL ports - scan_ports now returns a dict
    scan_result = scan_ports(mode="FULL")
    full_ports = scan_result.get("open_ports", []) if isinstance(scan_result, dict) else scan_result
    latest_findings["scans"]["ports"] = full_ports
    
    # Store vulnerability data
    if isinstance(scan_result, dict):
        latest_findings["scans"]["port_vulnerabilities"] = scan_result.get("vulnerable_ports", [])
        latest_findings["scans"]["port_summary"] = scan_result.get("summary", {})
    
    # Run slow checks
    latest_findings["scans"]["encryption"] = check_encryption()
    latest_findings["scans"]["router"] = check_router_security()
    
    # SET-2 Network Graph
    try:
        latest_findings["scans"]["network_graph"] = discover_devices()
    except Exception as e:
        log_event("SCAN", f"Graph discovery error: {e}", "ERROR")

    # SET-3 Config Analysis
    try:
        latest_findings["scans"]["config_issues"] = analyze_configuration(latest_findings)
    except Exception as e:
         log_event("SCAN", f"Config analysis error: {e}", "ERROR")
    
    analyze_and_save()
    log_event("SYSTEM", "FULL scan cycle completed.", "INFO")

def start_scheduler():
    if not scheduler.running:
        # Fast Scan: 3 seconds
        scheduler.add_job(run_fast_scan, 'interval', seconds=3, id='fast_scan', max_instances=2)
        
        # Full Scan: 60 seconds (or longer if needed)
        scheduler.add_job(run_full_scan, 'interval', seconds=60, id='full_scan')
        
        scheduler.start()
        log_event("SYSTEM", "Scheduler started. Hybrid Scanning Active (3s/60s).", "INFO")
        
        # Run fast scan immediately for dev/testing
        scheduler.add_job(run_fast_scan, 'date')
