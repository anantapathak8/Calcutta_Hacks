"""
Parameter Validator for Wi-Fi Hotspot Configuration
Validates and sanitizes all network parameters before execution
"""
import re
from typing import Dict, Any, List, Tuple
from .config import (
    MAX_SSID_LENGTH, MIN_SSID_LENGTH, SSID_ALLOWED_CHARS,
    MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, WEAK_PASSWORDS,
    SUPPORTED_SECURITY, SUPPORTED_BANDS
)


class ParameterValidator:
    """
    Validates Wi-Fi hotspot parameters for security and correctness
    """
    
    def validate_all(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate all parameters and return validation results
        
        Args:
            entities: Dictionary of extracted entities
            
        Returns:
            Dictionary with validation results:
            {
                "valid": bool,
                "errors": list of error messages,
                "warnings": list of warning messages,
                "sanitized_params": cleaned parameters ready for execution
            }
        """
        errors = []
        warnings = []
        sanitized = {}
        
        # Validate SSID
        if "ssid" in entities:
            valid, error, ssid = self.validate_ssid(entities["ssid"])
            if not valid:
                errors.append(error)
            else:
                sanitized["ssid"] = ssid
        else:
            errors.append("SSID is required")
        
        # Validate security type
        if "security" in entities:
            valid, error, security = self.validate_security(entities["security"])
            if not valid:
                errors.append(error)
            else:
                sanitized["security"] = security
        else:
            # Default to WPA2
            sanitized["security"] = "WPA2"
            warnings.append("No security type specified, defaulting to WPA2")
        
        # Validate band
        if "band" in entities:
            valid, error, band = self.validate_band(entities["band"])
            if not valid:
                errors.append(error)
            else:
                sanitized["band"] = band
        else:
            # Default to 2.4GHz (better compatibility)
            sanitized["band"] = "2.4GHz"
            warnings.append("No frequency band specified, defaulting to 2.4GHz")
        
        # Validate password
        security = sanitized.get("security", "WPA2")
        if security in ["WPA2", "WPA3"]:
            if "password" in entities and entities["password"]:
                valid, error, password = self.validate_password(
                    entities["password"], 
                    security
                )
                if not valid:
                    errors.append(error)
                else:
                    sanitized["password"] = password
            else:
                errors.append(f"{security} requires a password")
        elif security == "Open":
            if "password" in entities and entities["password"]:
                warnings.append("Open networks cannot have passwords, ignoring password")
            sanitized["password"] = None
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "sanitized_params": sanitized if len(errors) == 0 else {}
        }
    
    def validate_ssid(self, ssid: str) -> Tuple[bool, str, str]:
        """
        Validate SSID (network name)
        
        Returns:
            (is_valid, error_message, sanitized_ssid)
        """
        if not ssid:
            return False, "SSID cannot be empty", ""
        
        # Check length
        if len(ssid) < MIN_SSID_LENGTH:
            return False, f"SSID must be at least {MIN_SSID_LENGTH} character", ""
        
        if len(ssid) > MAX_SSID_LENGTH:
            return False, f"SSID cannot exceed {MAX_SSID_LENGTH} characters", ""
        
        # Check for allowed characters (prevent command injection)
        if not re.match(SSID_ALLOWED_CHARS, ssid):
            return False, "SSID contains invalid characters. Use only letters, numbers, spaces, hyphens, and underscores", ""
        
        # Check for potential command injection patterns
        dangerous_patterns = [';', '|', '&', '$', '`', '\\', '>', '<', '\n', '\r']
        for pattern in dangerous_patterns:
            if pattern in ssid:
                return False, f"SSID contains dangerous character: '{pattern}'", ""
        
        # Sanitize: trim whitespace
        sanitized = ssid.strip()
        
        return True, "", sanitized
    
    def validate_security(self, security: str) -> Tuple[bool, str, str]:
        """
        Validate security type
        
        Returns:
            (is_valid, error_message, sanitized_security)
        """
        if not security:
            return False, "Security type is required", ""
        
        # Normalize case
        security_upper = security.upper()
        
        # Check if supported
        if security_upper in ["WPA2", "WPA3"]:
            return True, "", security_upper
        elif security_upper == "OPEN":
            return True, "", "Open"
        else:
            supported = ", ".join(SUPPORTED_SECURITY)
            return False, f"Unsupported security type '{security}'. Supported: {supported}", ""
    
    def validate_band(self, band: str) -> Tuple[bool, str, str]:
        """
        Validate frequency band
        
        Returns:
            (is_valid, error_message, sanitized_band)
        """
        if not band:
            return False, "Frequency band is required", ""
        
        # Normalize format
        if "2.4" in band or "2,4" in band:
            return True, "", "2.4GHz"
        elif "5" in band:
            return True, "", "5GHz"
        else:
            supported = ", ".join(SUPPORTED_BANDS)
            return False, f"Unsupported frequency band '{band}'. Supported: {supported}", ""
    
    def validate_password(self, password: str, security: str) -> Tuple[bool, str, str]:
        """
        Validate password strength and format
        
        Returns:
            (is_valid, error_message, sanitized_password)
        """
        if not password:
            return False, "Password is required for secure networks", ""
        
        # Check length
        if len(password) < MIN_PASSWORD_LENGTH:
            return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters", ""
        
        if len(password) > MAX_PASSWORD_LENGTH:
            return False, f"Password cannot exceed {MAX_PASSWORD_LENGTH} characters", ""
        
        # Check for weak passwords
        if password.lower() in WEAK_PASSWORDS:
            return False, "Password is too weak. Please choose a stronger password", ""
        
        # Check for common weak patterns
        if password.isdigit():
            return False, "Password cannot be all numbers", ""
        
        if password.isalpha() and password.lower() in ["password", "qwerty", "abcdefgh"]:
            return False, "Password is too common", ""
        
        # Check for repeated characters (e.g., "aaaaaaaa")
        if len(set(password)) < 4:
            return False, "Password has too many repeated characters", ""
        
        # Calculate password strength
        strength = self._calculate_password_strength(password)
        if strength < 3:
            return False, "Password is too weak. Use a mix of letters, numbers, and special characters", ""
        
        return True, "", password
    
    def _calculate_password_strength(self, password: str) -> int:
        """
        Calculate password strength score (0-5)
        """
        score = 0
        
        # Length bonus
        if len(password) >= 12:
            score += 1
        
        # Character diversity
        if re.search(r'[a-z]', password):
            score += 1
        if re.search(r'[A-Z]', password):
            score += 1
        if re.search(r'[0-9]', password):
            score += 1
        if re.search(r'[^a-zA-Z0-9]', password):
            score += 1
        
        return score
    
    def sanitize_for_logging(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a sanitized copy of parameters safe for logging (redacted password)
        """
        sanitized = params.copy()
        if "password" in sanitized and sanitized["password"]:
            sanitized["password"] = "********"
        return sanitized
