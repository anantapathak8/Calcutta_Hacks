from utils.terminal_logger import log_event
import random

def calculate_blast_radius(graph, compromised_node_ip):
    """
    Calculates the 'Blast Radius' - which nodes are at risk if `compromised_node_ip` is infected.
    """
    log_event("SET2", f"Calculating Blast Radius for {compromised_node_ip}...", "AI")
    
    at_risk_nodes = []
    
    # 1. Identify the node
    source_node = next((n for n in graph["nodes"] if n["ip"] == compromised_node_ip), None)
    if not source_node:
        return []
        
    # 2. Risk Propagation Logic (Simplified)
    # If it's a Server, high risk to everyone.
    # If it's IoT, risk to local subnet.
    
    for node in graph["nodes"]:
        if node["ip"] == compromised_node_ip:
            continue
            
        risk_score = 0
        reason = []
        
        # Subnet check (Assume same subnet for this level)
        risk_score += 30 
        reason.append("Same Subnet")
        
        # Vendor specific (Simulate credential reuse risk)
        if node.get("vendor") == source_node.get("vendor"):
            risk_score += 40
            reason.append("Shared Vendor Credential Risk")
            
        # Type specific
        if node.get("type") == "server":
            risk_score += 20 # Servers are valuable targets
            
        if risk_score > 50:
            at_risk_nodes.append({
                "ip": node["ip"],
                "risk_from_source": risk_score,
                "reasons": reason
            })
            
    return at_risk_nodes

def detect_credential_reuse(devices):
    """
    Simulated Credential Reuse detection.
    """
    # Logic: flag devices that might share default passwords based on Vendor
    reuse_risks = []
    
    vendors = [d.get("vendor") for d in devices if d.get("vendor")]
    from collections import Counter
    vendor_counts = Counter(vendors)
    
    for vendor, count in vendor_counts.items():
        if count > 1 and vendor != "Unknown":
            reuse_risks.append(f"Potential Password Reuse: {count} {vendor} devices detected.")
            
    return reuse_risks
