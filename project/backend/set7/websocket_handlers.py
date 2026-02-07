"""
WebSocket Event Handlers for NLP-based Wi-Fi Hotspot Generator
"""
from flask_socketio import emit
import logging
from .nlp_processor import NLPProcessor
from .parameter_validator import ParameterValidator
from .os_detector import OSDetector
from .execution_engine import ExecutionEngine
from .security_checks import SecurityChecker


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


def register_hotspot_handlers(socketio):
    """Register all WebSocket event handlers for hotspot generator"""
    
    @socketio.on('connect', namespace='/hotspot')
    def handle_connect():
        """Handle client connection"""
        logging.info("Client connected to hotspot namespace")
        emit('connected', {'status': 'connected', 'message': 'Connected to Hotspot Generator'})
    
    @socketio.on('disconnect', namespace='/hotspot')
    def handle_disconnect():
        """Handle client disconnection"""
        logging.info("Client disconnected from hotspot namespace")
    
    @socketio.on('parse_command', namespace='/hotspot')
    def handle_parse_command(data):
        """
        Parse natural language command and extract hotspot parameters
        
        Event Data:
            {
                "command": "Create a WPA2 network mynet32 in 2.4 ghz and password will be 27273259"
            }
        
        Emits:
            parse_result: {
                "intent": "create_hotspot",
                "entities": {...},
                "confidence": 0.95,
                "validation": {...},
                "clarification": "..."
            }
        """
        try:
            # Get client information
            client_ip = "websocket-client"  # In real scenario, you can get from request context
            
            # Check rate limit
            rate_limit = security_checker.check_rate_limit(client_ip)
            if not rate_limit["allowed"]:
                emit('error', {
                    "error": rate_limit["message"],
                    "code": "RATE_LIMIT_EXCEEDED"
                })
                return
            
            # Get command from data
            if not data or "command" not in data:
                emit('error', {
                    "error": "Missing 'command' in request data",
                    "code": "INVALID_REQUEST"
                })
                return
            
            command = data["command"]
            
            # Check if NLP processor is available
            if not nlp_processor:
                emit('error', {
                    "error": "NLP processor not initialized. API key may be missing.",
                    "code": "NLP_UNAVAILABLE"
                })
                return
            
            # Emit parsing status
            emit('parse_status', {'status': 'parsing', 'message': 'Analyzing your command...'})
            
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
            
            emit('parse_result', response)
        
        except Exception as e:
            logging.error(f"Error in parse_command handler: {str(e)}")
            emit('error', {
                "error": f"Internal server error: {str(e)}",
                "code": "PARSE_ERROR"
            })
    
    @socketio.on('execute_hotspot', namespace='/hotspot')
    def handle_execute_hotspot(data):
        """
        Execute hotspot creation with validated parameters
        
        Event Data:
            {
                "ssid": "mynet32",
                "security": "WPA2",
                "band": "2.4GHz",
                "password": "27273259",
                "dry_run": false
            }
        
        Emits:
            execution_status: Real-time status updates
            execution_result: Final result
        """
        try:
            # Get client IP
            client_ip = "websocket-client"
            
            # Check rate limit
            rate_limit = security_checker.check_rate_limit(client_ip)
            if not rate_limit["allowed"]:
                emit('error', {
                    "error": rate_limit["message"],
                    "code": "RATE_LIMIT_EXCEEDED"
                })
                return
            
            # Get parameters from data
            if not data:
                emit('error', {
                    "error": "Missing request data",
                    "code": "INVALID_REQUEST"
                })
                return
            
            # Extract parameters
            params = {
                "ssid": data.get("ssid"),
                "security": data.get("security"),
                "band": data.get("band"),
                "password": data.get("password")
            }
            
            dry_run = data.get("dry_run", False)
            
            # Emit validation status
            emit('execution_status', {
                'stage': 'validation',
                'message': 'Validating parameters...'
            })
            
            # Validate parameters
            validation_result = validator.validate_all(params)
            
            if not validation_result["valid"]:
                emit('error', {
                    "error": "Invalid parameters",
                    "errors": validation_result["errors"],
                    "code": "VALIDATION_FAILED"
                })
                return
            
            # Use sanitized parameters
            sanitized_params = validation_result["sanitized_params"]
            
            # Additional SSID sanitization
            sanitized_params["ssid"] = security_checker.sanitize_ssid(sanitized_params["ssid"])
            
            # Check if system supports hotspot
            if not system_capabilities["supports_ap"] and not dry_run:
                emit('error', {
                    "error": "Your Wi-Fi adapter does not support hotspot mode",
                    "capabilities": system_capabilities,
                    "code": "UNSUPPORTED_HARDWARE"
                })
                return
            
            # Check permissions
            if not system_capabilities["has_permissions"] and not dry_run:
                emit('execution_status', {
                    'stage': 'permissions',
                    'message': 'Elevated permissions required. You may be prompted for your password.',
                    'requires_sudo': True
                })
            
            # Emit execution start status
            emit('execution_status', {
                'stage': 'creating',
                'message': f'Creating hotspot "{sanitized_params["ssid"]}"...'
            })
            
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
            
            # Emit final result
            emit('execution_result', result)
        
        except Exception as e:
            logging.error(f"Error in execute_hotspot handler: {str(e)}")
            emit('error', {
                "error": f"Internal server error: {str(e)}",
                "code": "EXECUTION_ERROR"
            })
    
    @socketio.on('stop_hotspot', namespace='/hotspot')
    def handle_stop_hotspot(data=None):
        """
        Stop the currently active hotspot
        
        Emits:
            stop_result: {
                "status": "success",
                "message": "Hotspot stopped successfully"
            }
        """
        try:
            # Get client IP
            client_ip = "websocket-client"
            
            # Emit status
            emit('execution_status', {
                'stage': 'stopping',
                'message': 'Stopping hotspot...'
            })
            
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
            
            emit('stop_result', result)
        
        except Exception as e:
            logging.error(f"Error in stop_hotspot handler: {str(e)}")
            emit('error', {
                "error": f"Internal server error: {str(e)}",
                "code": "STOP_ERROR"
            })
    
    @socketio.on('get_capabilities', namespace='/hotspot')
    def handle_get_capabilities(data=None):
        """
        Get system capabilities for hotspot creation
        
        Emits:
            capabilities: {
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
            
            emit('capabilities', current_capabilities)
        
        except Exception as e:
            logging.error(f"Error in get_capabilities handler: {str(e)}")
            emit('error', {
                "error": f"Internal server error: {str(e)}",
                "code": "CAPABILITIES_ERROR"
            })
    
    @socketio.on('health_check', namespace='/hotspot')
    def handle_health_check(data=None):
        """Health check for the hotspot service"""
        emit('health_status', {
            "status": "healthy",
            "service": "NLP Hotspot Generator",
            "nlp_available": nlp_processor is not None
        })
