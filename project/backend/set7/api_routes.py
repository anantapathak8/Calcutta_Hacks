"""
API Routes for NLP-based Wi-Fi Hotspot Generator
"""
from flask import Blueprint, request, jsonify
import logging
from .nlp_processor import NLPProcessor
from .parameter_validator import ParameterValidator
from .os_detector import OSDetector
from .execution_engine import ExecutionEngine
from .security_checks import SecurityChecker


# Create Blueprint
set7_bp = Blueprint('set7', __name__, url_prefix='/api/set7')

# Initialize components
try:
    nlp_processor = NLPProcessor()
except ValueError as e:
    nlp_processor = None
    logging.warning(f"NLP Processor initialization failed: {e}")

validator = ParameterValidator()
os_detector = OSDetector()
security_checker = SecurityChecker()

# Get system capabilities once at startup
system_capabilities = os_detector.get_system_capabilities()

# Execution engine (will be initialized per-request in dry-run mode)
execution_engine = None


@set7_bp.route('/parse', methods=['POST'])
def parse_command():
    """
    Parse natural language command and extract hotspot parameters
    
    Request Body:
        {
            "command": "Create a WPA2 network mynet32 in 2.4 ghz and password will be 27273259"
        }
    
    Response:
        {
            "intent": "create_hotspot",
            "entities": {...},
            "confidence": 0.95,
            "validation": {...},
            "clarification": "..."
        }
    """
    try:
        # Get client IP for rate limiting
        client_ip = request.remote_addr or "unknown"
        
        # Check rate limit
        rate_limit = security_checker.check_rate_limit(client_ip)
        if not rate_limit["allowed"]:
            return jsonify({
                "error": rate_limit["message"]
            }), 429  # Too Many Requests
        
        # Get command from request
        data = request.get_json()
        if not data or "command" not in data:
            return jsonify({
                "error": "Missing 'command' in request body"
            }), 400
        
        command = data["command"]
        
        # Check if NLP processor is available
        if not nlp_processor:
            return jsonify({
                "error": "NLP processor not initialized. Please set GROQ_API_KEY environment variable."
            }), 500
        
        # Parse command using NLP
        nlp_result = nlp_processor.parse_command(command)
        
        # Validate extracted entities
        validation_result = {"valid": True, "errors": [], "warnings": []}
        if nlp_result["intent"] == "create_hotspot" and nlp_result["entities"]:
            validation_result = validator.validate_all(nlp_result["entities"])
        
        # Generate clarification if needed
        clarification = ""
        if nlp_result["missing"]:
            clarification = nlp_processor.generate_clarification_request(nlp_result["missing"])
        elif not validation_result["valid"]:
            clarification = "Please fix the following issues:\n- " + "\n- ".join(validation_result["errors"])
        
        # Audit log
        security_checker.audit_log(
            action="parse",
            params={"command": command},
            client_ip=client_ip,
            result="success"
        )
        
        response = {
            "intent": nlp_result["intent"],
            "entities": nlp_result["entities"],
            "confidence": nlp_result["confidence"],
            "missing": nlp_result.get("missing", []),
            "validation": validation_result,
            "clarification": clarification
        }
        
        # Include NLP error if present
        if "error" in nlp_result:
            response["nlp_error"] = nlp_result["error"]
        
        return jsonify(response), 200
    
    except Exception as e:
        logging.error(f"Error in parse endpoint: {str(e)}")
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500


@set7_bp.route('/execute', methods=['POST'])
def execute_hotspot():
    """
    Execute hotspot creation with validated parameters
    
    Request Body:
        {
            "ssid": "mynet32",
            "security": "WPA2",
            "band": "2.4GHz",
            "password": "27273259",
            "dry_run": false,
            "confirmation_token": "abc123"
        }
    
    Response:
        {
            "status": "success",
            "message": "Hotspot created successfully",
            "ssid": "mynet32"
        }
    """
    try:
        # Get client IP
        client_ip = request.remote_addr or "unknown"
        
        # Check rate limit
        rate_limit = security_checker.check_rate_limit(client_ip)
        if not rate_limit["allowed"]:
            return jsonify({
                "error": rate_limit["message"]
            }), 429
        
        # Get parameters from request
        data = request.get_json()
        if not data:
            return jsonify({
                "error": "Missing request body"
            }), 400
        
        # Extract parameters
        params = {
            "ssid": data.get("ssid"),
            "security": data.get("security"),
            "band": data.get("band"),
            "password": data.get("password")
        }
        
        dry_run = data.get("dry_run", False)
        confirmation_token = data.get("confirmation_token")
        
        # Validate parameters
        validation_result = validator.validate_all(params)
        
        if not validation_result["valid"]:
            return jsonify({
                "status": "error",
                "message": "Invalid parameters",
                "errors": validation_result["errors"]
            }), 400
        
        # Use sanitized parameters
        sanitized_params = validation_result["sanitized_params"]
        
        # Additional SSID sanitization
        sanitized_params["ssid"] = security_checker.sanitize_ssid(sanitized_params["ssid"])
        
        # Check if system supports hotspot
        if not system_capabilities["supports_ap"] and not dry_run:
            return jsonify({
                "status": "error",
                "message": "Your Wi-Fi adapter does not support hotspot mode",
                "capabilities": system_capabilities
            }), 400
        
        # Check permissions
        if not system_capabilities["has_permissions"] and not dry_run:
            return jsonify({
                "status": "warning",
                "message": "Elevated permissions required. You may be prompted for your password.",
                "requires_sudo": True
            }), 403
        
        # Create execution engine
        engine = ExecutionEngine(system_capabilities, dry_run=dry_run)
        
        # Execute hotspot creation
        result = engine.create_hotspot(sanitized_params)
        
        # Audit log
        security_checker.audit_log(
            action="create",
            params=sanitized_params,
            client_ip=client_ip,
            result=result["status"]
        )
        
        # Return result
        status_code = 200 if result["status"] == "success" else 500
        return jsonify(result), status_code
    
    except Exception as e:
        logging.error(f"Error in execute endpoint: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500


@set7_bp.route('/stop', methods=['POST'])
def stop_hotspot():
    """
    Stop the currently active hotspot
    
    Response:
        {
            "status": "success",
            "message": "Hotspot stopped successfully"
        }
    """
    try:
        # Get client IP
        client_ip = request.remote_addr or "unknown"
        
        # Create execution engine
        engine = ExecutionEngine(system_capabilities, dry_run=False)
        
        # Stop hotspot
        result = engine.stop_hotspot()
        
        # Audit log
        security_checker.audit_log(
            action="stop",
            params={},
            client_ip=client_ip,
            result=result["status"]
        )
        
        status_code = 200 if result["status"] == "success" else 500
        return jsonify(result), status_code
    
    except Exception as e:
        logging.error(f"Error in stop endpoint: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500


@set7_bp.route('/capabilities', methods=['GET'])
def get_capabilities():
    """
    Get system capabilities for hotspot creation
    
    Response:
        {
            "os": "linux",
            "adapter": "wlan0",
            "supports_ap": true,
            "has_permissions": true,
            "command_tool": "nmcli"
        }
    """
    try:
        # Refresh capabilities (in case permissions changed)
        current_capabilities = os_detector.get_system_capabilities()
        
        return jsonify(current_capabilities), 200
    
    except Exception as e:
        logging.error(f"Error in capabilities endpoint: {str(e)}")
        return jsonify({
            "error": f"Internal server error: {str(e)}"
        }), 500


@set7_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({
        "status": "healthy",
        "service": "NLP Hotspot Generator",
        "nlp_available": nlp_processor is not None
    }), 200
