from flask import Flask, jsonify, request
from dotenv import load_dotenv
load_dotenv()
import os
import json
from flask_cors import CORS
from scheduler import start_scheduler

app = Flask(__name__)
CORS(app)

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'output/latest.json')

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({"status": "running", "component": "SentinelAI Backend"})

@app.route('/api/findings', methods=['GET'])
def get_findings():
    try:
        if os.path.exists(OUTPUT_FILE):
            with open(OUTPUT_FILE, 'r') as f:
                data = json.load(f)
            return jsonify(data)
        else:
            return jsonify({"status": "waiting_for_scan", "message": "Initial scan in progress..."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/risk', methods=['GET'])
def get_risk():
    # Helper to just extract risk if needed separately
    try:
        if os.path.exists(OUTPUT_FILE):
            with open(OUTPUT_FILE, 'r') as f:
                data = json.load(f)
            return jsonify({"score": data.get("risk_score", 0), "level": data.get("risk_level", "UNKNOWN")})
        return jsonify({"score": 0, "level": "CALCULATING"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

from ai.chat_engine import process_chat_request
from utils.mcp import execute_mitigation
from set2.lateral_movement import calculate_blast_radius
from set3.config_advisor import get_ai_advice
from set4.hardware_trust import check_usb_key
from set1.deauth_anomaly_detector import predict_deauth_attack
from set1 import deauth_simulator
from set1.nat_proxy.protocol_predictor import predict_protocol
from set1.nat_proxy import nat_forwarding

# Register set7 routes (NLP Hotspot Generator)
from set7.api_routes import set7_bp
app.register_blueprint(set7_bp)


# Chatbot NLP Parser
from Chatbot.nlp_parser import IntelligentNetworkParser
import logging

# Initialize NLP parser (singleton pattern)
_nlp_parser = None
def get_nlp_parser():
    """Lazy initialization of NLP parser"""
    global _nlp_parser
    if _nlp_parser is None:
        logging.info("Initializing NLP parser...")
        qdrant_url = os.getenv('QDRANT_URL')
        qdrant_api_key = os.getenv('QDRANT_API_KEY')
        
        if qdrant_url and qdrant_api_key:
            logging.info(f"Using Qdrant Cloud at {qdrant_url}")
            _nlp_parser = IntelligentNetworkParser(
                qdrant_url=qdrant_url,
                qdrant_api_key=qdrant_api_key
            )
        else:
            logging.info("Using local Qdrant at localhost:6333")
            _nlp_parser = IntelligentNetworkParser()
        
        logging.info("NLP parser initialized successfully!")
    return _nlp_parser

@app.route('/api/chat', methods=['POST'])
def chat_command():
    try:
        data = request.json
        user_message = data.get("message", "")
        
        # 1. Interpret Command
        ai_response = process_chat_request(user_message)
        
        if ai_response.get("error"):
            return jsonify(ai_response), 500
            
        command = ai_response.get("command")
        explanation = ai_response.get("explanation")
        
        # 2. Execute via MCP if valid
        execution_result = None
        if command:
            print(f"Executing Chat Command: {command}")
            # MCP expects a list of actions
            mcp_results = execute_mitigation([command])
            execution_result = mcp_results[0] if mcp_results else None
            
        return jsonify({
            "ai_interpretation": ai_response,
            "execution_result": execution_result
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/network/graph', methods=['GET'])
def get_network_graph():
    try:
        if os.path.exists(OUTPUT_FILE):
            with open(OUTPUT_FILE, 'r') as f:
                data = json.load(f)
            return jsonify(data.get("scans", {}).get("network_graph", {}))
        return jsonify({})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/network/risk-simulation', methods=['POST'])
def get_risk_simulation():
    try:
        # User provides which node is "compromised" to see blast radius
        node_ip = request.json.get("ip")
        
        graph = {}
        if os.path.exists(OUTPUT_FILE):
             with open(OUTPUT_FILE, 'r') as f:
                data = json.load(f)
                graph = data.get("scans", {}).get("network_graph", {})
        
        if not graph:
            return jsonify({"error": "No network graph available"}), 404
            
        radius = calculate_blast_radius(graph, node_ip)
        return jsonify({"compromised": node_ip, "at_risk_nodes": radius})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/config/advice', methods=['POST'])
def get_config_advice():
    try:
        issue = request.json
        advice = get_ai_advice(issue.get("title", ""), issue.get("description", ""))
        return jsonify({"advice": advice})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/hardware/status', methods=['GET'])
def get_hardware_status():
    try:
        status = check_usb_key() # Realtime check
        return jsonify(status)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============ Hardware Security Key APIs ============
from set4.hardware_key import (
    HardwareKeyManager, 
    HardwareKeyVerifier, 
    get_monitor, 
    get_current_status,
    verify_with_password
)

@app.route('/api/hardware-key/status', methods=['GET'])
def get_hardware_key_status():
    """Get the current hardware key verification status."""
    try:
        # First try cached status from monitor
        status = get_current_status()
        
        # If status is UNKNOWN or UNTRUSTED, do a fresh check for key
        if status.get("status") in ["UNKNOWN", "UNTRUSTED"]:
            verifier = HardwareKeyVerifier()
            
            # ONLY check for key drive - NOT any writable USB
            key_drive = verifier.find_key_drive()
            if key_drive:
                return jsonify({
                    "status": "DETECTED",
                    "message": "Hardware key found",
                    "unlocked": False,
                    "drive_info": key_drive,
                    "last_check": __import__('datetime').datetime.now().isoformat()
                })
        
        return jsonify(status)
    except Exception as e:
        return jsonify({"error": str(e), "status": "ERROR"}), 500

@app.route('/api/hardware-key/drives', methods=['GET'])
def get_hardware_key_drives():
    """List all detected USB drives."""
    try:
        verifier = HardwareKeyVerifier()
        drives = verifier.detect_usb_drives()
        return jsonify({
            "success": True,
            "drives": drives,
            "count": len(drives)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/hardware-key/generate', methods=['POST'])
def generate_hardware_key():
    """Generate a new hardware security key on the specified drive."""
    try:
        data = request.json
        mount_path = data.get("mount_path")
        password = data.get("password")
        
        if not mount_path:
            return jsonify({
                "success": False,
                "error": "mount_path is required"
            }), 400
        
        if not password or len(password) < 8:
            return jsonify({
                "success": False,
                "error": "Password must be at least 8 characters"
            }), 400
        
        manager = HardwareKeyManager()
        result = manager.generate_key(mount_path, password)
        
        if result.get("success"):
            # Start monitoring with this password
            monitor = get_monitor()
            monitor.set_password(password)
            if not monitor.is_running:
                monitor.start_monitoring()
            
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logging.error(f"Error generating hardware key: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/hardware-key/verify', methods=['POST'])
def verify_hardware_key():
    """Verify the hardware security key with a password."""
    try:
        data = request.json
        password = data.get("password")
        
        if not password:
            return jsonify({
                "success": False,
                "error": "Password is required"
            }), 400
        
        result = verify_with_password(password)
        
        return jsonify({
            "success": result.get("valid", False),
            **result
        })
        
    except Exception as e:
        logging.error(f"Error verifying hardware key: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/hardware-key/monitor/start', methods=['POST'])
def start_hardware_key_monitor():
    """Start the background hardware key monitor."""
    try:
        data = request.json or {}
        password = data.get("password")
        
        monitor = get_monitor()
        
        if password:
            monitor.set_password(password)
        
        if not monitor.is_running:
            monitor.start_monitoring()
            return jsonify({
                "success": True,
                "message": "Hardware key monitoring started"
            })
        else:
            return jsonify({
                "success": True,
                "message": "Monitor already running"
            })
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/hardware-key/monitor/stop', methods=['POST'])
def stop_hardware_key_monitor():
    """Stop the background hardware key monitor."""
    try:
        monitor = get_monitor()
        monitor.stop_monitoring()
        return jsonify({
            "success": True,
            "message": "Hardware key monitoring stopped"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============ Deauth Simulation & Detection APIs ============

@app.route('/api/deauth/networks', methods=['GET'])
def get_virtual_networks():
    """Get all virtual networks"""
    try:
        networks = deauth_simulator.get_all_networks()
        return jsonify({"networks": networks})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deauth/networks', methods=['POST'])
def create_network():
    """Create a new virtual network"""
    try:
        network_config = request.json
        network = deauth_simulator.create_virtual_network(network_config)
        return jsonify({"status": "created", "network": network})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deauth/networks/<network_id>', methods=['DELETE'])
def delete_network_route(network_id):
    """Delete a virtual network"""
    try:
        success = deauth_simulator.delete_network(network_id)
        if success:
            return jsonify({"status": "deleted", "network_id": network_id})
        return jsonify({"error": "Network not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deauth/networks/auto-populate', methods=['POST'])
def auto_populate_networks():
    """Auto-populate random networks"""
    try:
        count = request.json.get('count', 3)
        networks = deauth_simulator.auto_populate_networks(count)
        return jsonify({"status": "created", "networks": networks, "count": len(networks)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deauth/attack/start', methods=['POST'])
def start_deauth_attack():
    """Start deauth attack simulation"""
    try:
        config = request.json
        result = deauth_simulator.simulate_deauth_attack(config)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deauth/attack/stop', methods=['POST'])
def stop_deauth_attack():
    """Stop current attack"""
    try:
        result = deauth_simulator.stop_attack()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deauth/attack/status', methods=['GET'])
def get_attack_status():
    """Get current attack status"""
    try:
        status = deauth_simulator.get_attack_state()
        print(f"DEBUG - Attack status: active={status.get('active')}, normal_disconnect={status.get('normal_disconnect_active')}")
        return jsonify(status)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deauth/normal-disconnect/start', methods=['POST'])
def start_normal_disconnect():
    """Simulate normal disconnection patterns"""
    try:
        config = request.json
        print(f"\n=== STARTING NORMAL DISCONNECT ===")
        print(f"Config: {config}")
        
        result = deauth_simulator.simulate_normal_disconnect(config)
        
        print(f"Result: {result}")
        print(f"==================================\n")
        
        return jsonify(result)
    except Exception as e:
        print(f"ERROR in start_normal_disconnect: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/deauth/normal-disconnect/suggested-params', methods=['GET'])
def get_normal_params():
    """Get suggested parameters for normal disconnection"""
    try:
        params = deauth_simulator.get_suggested_normal_params()
        return jsonify(params)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deauth/handshakes', methods=['GET'])
def get_handshakes():
    """Get captured handshakes"""
    try:
        handshakes = deauth_simulator.get_captured_handshakes()
        return jsonify({"handshakes": handshakes})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deauth/detect', methods=['GET'])
def detect_deauth():
    """Run AI-based deauth detection on current network data"""
    try:
        # Get current monitoring data
        network_data = deauth_simulator.get_monitoring_data()
        
        print(f"\n=== DEAUTH DETECTION ===")
        print(f"Monitoring Data: {network_data}")
        
        # Run AI prediction
        prediction = predict_deauth_attack(network_data)
        
        print(f"Prediction: {prediction}")
        print(f"========================\n")
        
        return jsonify({
            "prediction": prediction,
            "monitoring_data": network_data
        })
    except Exception as e:
        print(f"ERROR in detect_deauth: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# =======================
# NAT Forwarding / Nginx Management APIs
# =======================

@app.route('/api/nat/info', methods=['GET'])
def get_nat_info():
    """Get gateway IP and local IP"""
    try:
        manager = nat_forwarding.get_manager()
        return jsonify({
            "gateway_ip": manager.get_gateway_ip(),
            "local_ip": manager.get_local_ip(),
            "server_name": manager.server_name
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/nat/rules', methods=['GET'])
def get_nat_rules():
    """Get all NAT forwarding rules"""
    try:
        manager = nat_forwarding.get_manager()
        return jsonify({"rules": manager.get_all_rules()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/nat/rules', methods=['POST'])
def add_nat_rule():
    """Add a new NAT forwarding rule"""
    try:
        rule = request.json
        manager = nat_forwarding.get_manager()
        result = manager.add_rule(rule)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/nat/rules/<int:rule_id>', methods=['DELETE'])
def delete_nat_rule(rule_id):
    """Delete a NAT forwarding rule"""
    try:
        manager = nat_forwarding.get_manager()
        result = manager.remove_rule(rule_id)
        
        if "error" in result:
            return jsonify(result), 404
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/nat/rules/clear', methods=['POST'])
def clear_nat_rules():
    """Clear all NAT forwarding rules"""
    try:
        manager = nat_forwarding.get_manager()
        result = manager.clear_all_rules()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/nat/protocol/predict', methods=['POST'])
def predict_nat_protocol():
    """Predict protocol based on service description using AI"""
    try:
        data = request.json
        description = data.get('description', '')
        
        result = predict_protocol(description)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============ Compliance Check APIs ============
import set5

# Store compliance reports in memory
compliance_reports = []

@app.route('/api/compliance/check', methods=['POST'])
def run_compliance_check():
    """Run compliance check and return results"""
    try:
        # Run the compliance checks
        result = set5.run_compliance_checks()
        
        # Store the report
        compliance_reports.append(result)
        
        # Keep only last 50 reports to avoid memory issues
        if len(compliance_reports) > 50:
            compliance_reports.pop(0)
        
        return jsonify({
            'success': True,
            'report': result
        })
    except Exception as e:
        logging.error(f"Error running compliance check: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/compliance/latest', methods=['GET'])
def get_latest_compliance():
    """Get the latest compliance report"""
    try:
        if compliance_reports:
            return jsonify({
                'success': True,
                'report': compliance_reports[-1]
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No compliance reports available'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/compliance/reports', methods=['GET'])
def get_all_compliance_reports():
    """Get all compliance reports"""
    try:
        return jsonify({
            'success': True,
            'count': len(compliance_reports),
            'reports': compliance_reports
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============ NLP Parser API ============

@app.route('/api/parse', methods=['POST'])
def parse_natural_language():
    """
    Parse natural language input to extract network configuration
    
    Request body:
    {
        "input": "Setup web server on port 8080"
    }
    
    Response:
    {
        "success": true,
        "config": {
            "virtualPort": 8080,
            "internalPort": 8080,
            "proxyName": "webserver42",
            "protocol": "HTTP",
            "serviceDescription": "web server",
            "confidence": 0.85,
            "detectedService": "web_server"
        },
        "input": "Setup web server on port 8080"
    }
    """
    try:
        # Get input from request
        data = request.get_json()
        
        if not data or 'input' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "input" field in request body'
            }), 400
        
        user_input = data['input'].strip()
        
        if not user_input:
            return jsonify({
                'success': False,
                'error': 'Input cannot be empty'
            }), 400
        
        # Parse using NLP engine
        logging.info(f"Parsing input: {user_input}")
        config = get_nlp_parser().parse(user_input)
        
        return jsonify({
            'success': True,
            'config': config,
            'input': user_input
        })
    
    except Exception as e:
        logging.error(f"Error parsing input: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============ Subnet Designer APIs ============
from set6.orchestrator import get_orchestrator
from set6.models import SubnetDesignRequest, NaturalLanguageRequest

@app.route('/api/subnet/design', methods=['POST'])
def design_subnets():
    """
    Design subnets from structured JSON input.
    
    Request body:
    {
        "base_ip": "192.168.0.0",
        "cidr": 16,
        "growth_buffer": 0.3,
        "enable_vlan_suggestions": true,
        "branches": [
            {
                "name": "Engineering",
                "hosts_needed": 300,
                "description": "Engineering department"
            }
        ]
    }
    
    Response: SubnetDesignResponse (see models.py)
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body must be JSON'
            }), 400
        
        # Validate and parse request
        try:
            subnet_request = SubnetDesignRequest(**data)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Invalid request format: {str(e)}'
            }), 400
        
        # Get orchestrator and design subnets
        orchestrator = get_orchestrator()
        response = orchestrator.design_from_structured(subnet_request)
        
        # Convert to dict for JSON response
        return jsonify(response.dict())
    
    except Exception as e:
        logging.error(f"Error in subnet design: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/subnet/design-nl', methods=['POST'])
def design_subnets_nl():
    """
    Design subnets from natural language input.
    
    Request body:
    {
        "natural_language_input": "Design subnets for 10.0.0.0/16 with Finance (200 users), IT (100 devices), Guest WiFi"
    }
    
    Response: SubnetDesignResponse (see models.py)
    """
    try:
        data = request.get_json()
        
        if not data or 'natural_language_input' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing natural_language_input field'
            }), 400
        
        nl_input = data['natural_language_input'].strip()
        
        if not nl_input:
            return jsonify({
                'success': False,
                'error': 'Natural language input cannot be empty'
            }), 400
        
        # Get orchestrator and design subnets
        orchestrator = get_orchestrator()
        response = orchestrator.design_from_natural_language(nl_input)
        
        # Convert to dict for JSON response
        return jsonify(response.dict())
    
    except Exception as e:
        logging.error(f"Error in NL subnet design: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/subnet/validate', methods=['POST'])
def validate_subnet_design():
    """
    Validate a subnet design request without actually allocating.
    
    Returns validation result and estimated space requirements.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body must be JSON'
            }), 400
        
        try:
            subnet_request = SubnetDesignRequest(**data)
        except Exception as e:
            return jsonify({
                'success': False,
                'valid': False,
                'error': f'Invalid request format: {str(e)}'
            }), 400
        
        # Validate
        from set6.subnet_engine import validate_subnet_request
        is_valid, error_msg = validate_subnet_request(subnet_request)
        
        if is_valid:
            return jsonify({
                'success': True,
                'valid': True,
                'message': 'Subnet design is valid and can be allocated'
            })
        else:
            return jsonify({
                'success': True,
                'valid': False,
                'error': error_msg
            })
    
    except Exception as e:
        logging.error(f"Error in validation: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    import socket
    import sys
    from scheduler import scheduler

    # Check if port is available
    PORT = 5001
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', PORT))
    sock.close()

    if result == 0:
        print(f"Error: Port {PORT} is already in use. Exiting.")
        sys.exit(1)

    try:
        # Start the scheduler in background
        start_scheduler()
        print(f"SentinelAI Backend Started on port {PORT}")
        app.run(host='0.0.0.0', port=PORT, debug=True, use_reloader=False)
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        if scheduler.running:
            print("Shutting down scheduler...")
            scheduler.shutdown()
