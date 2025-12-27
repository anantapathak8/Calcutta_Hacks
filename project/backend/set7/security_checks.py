"""
Security checks and audit logging for hotspot operations
"""
import logging
import hashlib
import time
from typing import Dict, Any, Optional
from collections import defaultdict
from datetime import datetime, timedelta
from .config import (
    RATE_LIMIT_REQUESTS, 
    RATE_LIMIT_WINDOW,
    LOG_FILE,
    PASSWORD_REDACTION
)


# Configure logging
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SecurityChecker:
    """
    Security and safety checks for hotspot operations
    """
    
    def __init__(self):
        self.request_counts = defaultdict(list)  # IP -> [timestamp, timestamp, ...]
        
    def check_rate_limit(self, client_ip: str) -> Dict[str, Any]:
        """
        Check if client has exceeded rate limit
        
        Args:
            client_ip: Client's IP address
            
        Returns:
            Dictionary with allowed status and message
        """
        current_time = time.time()
        
        # Clean old timestamps
        cutoff_time = current_time - RATE_LIMIT_WINDOW
        self.request_counts[client_ip] = [
            ts for ts in self.request_counts[client_ip]
            if ts > cutoff_time
        ]
        
        # Check count
        request_count = len(self.request_counts[client_ip])
        
        if request_count >= RATE_LIMIT_REQUESTS:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return {
                "allowed": False,
                "message": f"Rate limit exceeded. Maximum {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW} seconds."
            }
        
        # Add current request
        self.request_counts[client_ip].append(current_time)
        
        return {
            "allowed": True,
            "requests_remaining": RATE_LIMIT_REQUESTS - request_count - 1
        }
    
    def sanitize_ssid(self, ssid: str) -> str:
        """
        Sanitize SSID to prevent command injection
        Remove or escape dangerous characters
        """
        # Remove shell metacharacters
        dangerous_chars = [';', '|', '&', '$', '`', '\\', '>', '<', '\n', '\r', '"', "'"]
        sanitized = ssid
        
        for char in dangerous_chars:
            sanitized = sanitized.replace(char, '')
        
        return sanitized.strip()
    
    def audit_log(self, action: str, params: Dict[str, Any], client_ip: str, result: str) -> None:
        """
        Log all hotspot operations for audit trail
        
        Args:
            action: Action performed (parse, create, stop)
            params: Parameters used (password will be redacted)
            client_ip: Client IP address
            result: Result of the operation
        """
        # Redact password
        safe_params = params.copy()
        if "password" in safe_params and safe_params["password"]:
            safe_params["password"] = PASSWORD_REDACTION
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "params": safe_params,
            "client_ip": self._hash_ip(client_ip),  # Hash IP for privacy
            "result": result
        }
        
        logger.info(f"AUDIT: {log_entry}")
    
    def _hash_ip(self, ip: str) -> str:
        """Hash IP address for privacy in logs"""
        return hashlib.sha256(ip.encode()).hexdigest()[:16]
    
    def validate_confirmation(self, params: Dict[str, Any], confirmation_token: Optional[str]) -> bool:
        """
        Validate that user has confirmed the operation
        
        In production, this would use a more sophisticated token system
        For now, we'll use a simple hash-based confirmation
        """
        if not confirmation_token:
            return False
        
        # Generate expected token
        expected_token = self._generate_confirmation_token(params)
        
        return confirmation_token == expected_token
    
    def generate_confirmation_token(self, params: Dict[str, Any]) -> str:
        """
        Generate confirmation token for parameters
        Public method for API to use
        """
        return self._generate_confirmation_token(params)
    
    def _generate_confirmation_token(self, params: Dict[str, Any]) -> str:
        """
        Generate a simple confirmation token based on parameters
        """
        # Create a string from params
        param_str = f"{params.get('ssid', '')}-{params.get('security', '')}-{params.get('band', '')}"
        
        # Hash it
        token = hashlib.md5(param_str.encode()).hexdigest()[:16]
        
        return token
