#!/usr/bin/env python3
"""
VectorVault CLI - NAT Forwarding via Command Line
==================================================
Usage:
    vectorvault mknat <port>:<proxy_name>:<service_description>

Examples:
    vectorvault mknat 9000:myapp:web server
    vectorvault mknat 3000:dashboard:react frontend application
    vectorvault mknat 8080:api:rest api backend service
    vectorvault mknat 5432:db:postgresql database

This does the same thing as the GUI NAT Forwarding page — it:
  1. Parses the port, proxy name, and service description
  2. Auto-detects your local IP
  3. Uses AI to predict the protocol (TCP/UDP/BOTH) from the description
  4. Adds the nginx reverse proxy rule and reloads nginx
"""

import sys
import os

# Ensure the backend directory is on the path so local imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from set1.nat_proxy.nat_forwarding import get_manager
from set1.nat_proxy.protocol_predictor import predict_protocol


BANNER = r"""
 _    __          __            _    __            ____
| |  / /__  _____/ /_____  ____| |  / /___ ___  __/ / /_
| | / / _ \/ ___/ __/ __ \/ ___/ | / / __ `/ / / / / __/
| |/ /  __/ /__/ /_/ /_/ / /   | |/ / /_/ / /_/ / / /_
|___/\___/\___/\__/\____/_/    |___/\__,_/\__,_/_/\__/
                NAT Forwarding CLI
"""

HELP_TEXT = """
Usage:
    vectorvault mknat <port>:<proxy_name>:<service_description>

Arguments:
    port                 Internal port number (e.g. 9000)
    proxy_name           URL path name for the proxy route (e.g. myapp)
    service_description  Description of the service (used for AI protocol prediction)

Commands:
    vectorvault mknat <port>:<proxy>:<desc>  Create a new NAT forwarding rule
    vectorvault --ls                         List all active NAT forwarding rules
    vectorvault rm <rule_id>                 Delete a specific rule by ID
    vectorvault clear                        Clear all NAT forwarding rules
    vectorvault info                         Show network info (local IP, gateway, server name)
    vectorvault help                         Show this help message

Examples:
    vectorvault mknat 9000:myapp:web server
    vectorvault mknat 3000:dashboard:react frontend
    vectorvault mknat 8080:api:rest api backend service
    vectorvault --ls
    vectorvault rm 2
"""


def parse_rule_input(raw: str) -> dict:
    """
    Parse 'port:proxy_name:service description' into components.
    The service description is everything after the second colon.
    """
    parts = raw.split(":", 2)  # split into at most 3 parts
    if len(parts) < 3:
        return None

    port_str, proxy_name, description = parts

    # Validate port
    try:
        port = int(port_str.strip())
        if port < 1 or port > 65535:
            raise ValueError
    except ValueError:
        print(f"\n  [ERROR] Invalid port: '{port_str}'. Must be a number between 1 and 65535.\n")
        return None

    proxy_name = proxy_name.strip()
    if not proxy_name:
        print("\n  [ERROR] Proxy name cannot be empty.\n")
        return None

    description = description.strip()
    if not description:
        print("\n  [ERROR] Service description cannot be empty.\n")
        return None

    return {
        "port": port,
        "proxy_name": proxy_name,
        "description": description
    }


def cmd_add_rule(raw_input: str):
    """Parse input, predict protocol, and add NAT forwarding rule."""
    parsed = parse_rule_input(raw_input)
    if parsed is None:
        print("  Format: vectorvault mknat <port>:<proxy_name>:<service description>")
        return

    port = parsed["port"]
    proxy_name = parsed["proxy_name"]
    description = parsed["description"]

    manager = get_manager()
    local_ip = manager.get_local_ip()

    print(f"\n  Port:        {port}")
    print(f"  Proxy Name:  {proxy_name}")
    print(f"  Description: {description}")
    print(f"  Local IP:    {local_ip}")

    # AI protocol prediction
    print("\n  [AI] Predicting protocol from description...")
    prediction = predict_protocol(description)
    protocol = prediction["protocol"]
    confidence = prediction["confidence"] * 100
    suggestion = prediction.get("suggestion", "")

    print(f"  [AI] Predicted Protocol: {protocol}  (confidence: {confidence:.1f}%)")
    if suggestion:
        print(f"  [AI] {suggestion}")

    # Build the rule dict (same shape the GUI sends)
    rule = {
        "internal_ip": local_ip,
        "internal_port": port,
        "proxy_name": proxy_name,
        "protocol": protocol,
        "service_description": description,
    }

    # Add the rule via the manager (writes nginx config + reloads)
    print(f"\n  [NGINX] Adding rule: /{proxy_name}/ -> 127.0.0.1:{port} ...")
    result = manager.add_rule(rule)

    if "error" in result:
        print(f"  [ERROR] {result['error']}\n")
    else:
        print(f"  [OK] {result['message']}")
        print(f"  [OK] Access at: http://{manager.server_name}/{proxy_name}/\n")


def cmd_list_rules():
    """List all active NAT forwarding rules."""
    manager = get_manager()
    rules = manager.get_all_rules()
    if not rules:
        print("\n  No active NAT forwarding rules.\n")
        return

    print(f"\n  {'ID':<5} {'Proxy Name':<20} {'Port':<8} {'Protocol':<10} {'Created'}")
    print(f"  {'—'*5} {'—'*20} {'—'*8} {'—'*10} {'—'*25}")
    for r in rules:
        print(f"  {r.get('id','?'):<5} {r.get('proxy_name',''):<20} {r.get('internal_port',''):<8} {r.get('protocol',''):<10} {r.get('created_at','')}")
    print()


def cmd_delete_rule(rule_id_str: str):
    """Delete a NAT forwarding rule by ID."""
    try:
        rule_id = int(rule_id_str)
    except ValueError:
        print(f"\n  [ERROR] Invalid rule ID: '{rule_id_str}'. Must be a number.\n")
        return

    manager = get_manager()
    result = manager.remove_rule(rule_id)

    if "error" in result:
        print(f"\n  [ERROR] {result['error']}\n")
    else:
        print(f"\n  [OK] {result['message']}\n")


def cmd_clear_rules():
    """Clear all NAT forwarding rules."""
    manager = get_manager()
    rules = manager.get_all_rules()
    if not rules:
        print("\n  No rules to clear.\n")
        return

    confirm = input(f"\n  Clear all {len(rules)} rule(s)? [y/N]: ").strip().lower()
    if confirm != "y":
        print("  Cancelled.\n")
        return

    result = manager.clear_all_rules()
    if "error" in result:
        print(f"  [ERROR] {result['error']}\n")
    else:
        print(f"  [OK] {result['message']}\n")


def cmd_info():
    """Show network info."""
    manager = get_manager()
    print(f"\n  Local IP:    {manager.get_local_ip()}")
    print(f"  Gateway IP:  {manager.get_gateway_ip()}")
    print(f"  Server Name: {manager.server_name}\n")


def main():
    if len(sys.argv) < 2:
        print(BANNER)
        print(HELP_TEXT)
        sys.exit(0)

    command = sys.argv[1].strip().lower()

    # Sub-commands
    if command == "help" or command == "--help" or command == "-h":
        print(BANNER)
        print(HELP_TEXT)

    elif command == "--ls":
        cmd_list_rules()

    elif command == "rm":
        if len(sys.argv) < 3:
            print("\n  Usage: vectorvault rm <rule_id>\n")
            sys.exit(1)
        cmd_delete_rule(sys.argv[2])

    elif command == "clear":
        cmd_clear_rules()

    elif command == "info":
        cmd_info()

    elif command == "mknat":
        if len(sys.argv) < 3:
            print("\n  Usage: vectorvault mknat <port>:<proxy_name>:<service description>\n")
            sys.exit(1)
        # Rejoin everything after 'mknat' in case description has spaces
        raw = " ".join(sys.argv[2:])
        cmd_add_rule(raw)

    else:
        print(f"\n  Unknown command: '{command}'")
        print("  Run 'vectorvault help' for usage.\n")


if __name__ == "__main__":
    main()
