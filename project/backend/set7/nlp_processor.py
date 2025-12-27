"""
NLP Processor using Local LLaMA via Ollama for intent detection and entity extraction
"""
import json
import re
from typing import Dict, Any, Optional
import sys
import os
# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai.ollama_client import get_ollama_client, get_model_name


class NLPProcessor:
    """
    Processes natural language commands to extract hotspot configuration parameters
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Ollama client"""
        self.client = get_ollama_client()
        if not self.client:
            raise ValueError("Ollama client not available. Make sure Ollama is running.")
        
        self.model = get_model_name()
        self.temperature = 0.1  # Low temperature for consistent entity extraction
        
    def _build_system_prompt(self) -> str:
        """Build the system prompt for Groq API"""
        return """You are a network configuration parameter extractor. Your job is to parse natural language commands about Wi-Fi hotspot creation and extract structured parameters.

Extract these entities:
- intent: The user's intent (create_hotspot, modify_hotspot, stop_hotspot, unknown)
- ssid: Network name (1-32 characters)
- security: Security type (WPA2, WPA3, Open)
- band: Frequency band (2.4GHz or 5GHz)
- password: Network password (8-63 characters for WPA2/WPA3, null for Open)

Return ONLY valid JSON in this exact format:
{
  "intent": "create_hotspot",
  "entities": {
    "ssid": "network_name",
    "security": "WPA2",
    "band": "2.4GHz",
    "password": "password123"
  },
  "confidence": 0.95,
  "missing": []
}

If parameters are missing, list them in "missing" array and set confidence lower.
If you cannot understand the intent, set intent to "unknown".

Examples:
Input: "Create a WPA2 network mynet32 in 2.4 ghz and password will be 27273259"
Output: {"intent": "create_hotspot", "entities": {"ssid": "mynet32", "security": "WPA2", "band": "2.4GHz", "password": "27273259"}, "confidence": 0.98, "missing": []}

Input: "Make a secure Wi-Fi hotspot called GuestNet on 5GHz"
Output: {"intent": "create_hotspot", "entities": {"ssid": "GuestNet", "security": "WPA2", "band": "5GHz", "password": null}, "confidence": 0.85, "missing": ["password"]}

Input: "Stop the hotspot"
Output: {"intent": "stop_hotspot", "entities": {}, "confidence": 0.99, "missing": []}

Be strict with JSON format. No markdown, no code blocks, just raw JSON."""

    def parse_command(self, command: str) -> Dict[str, Any]:
        """
        Parse natural language command and extract hotspot parameters
        
        Args:
            command: Natural language command from user
            
        Returns:
            Dictionary containing intent, entities, confidence, and missing parameters
        """
        try:
            # Call Ollama API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._build_system_prompt()},
                    {"role": "user", "content": command}
                ],
                temperature=self.temperature,
                max_tokens=500
            )
            
            # Extract response
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            # Remove markdown code blocks if present
            content = re.sub(r'```json\s*', '', content)
            content = re.sub(r'```\s*', '', content)
            
            result = json.loads(content)
            
            # Validate response structure
            required_keys = ["intent", "entities", "confidence", "missing"]
            if not all(key in result for key in required_keys):
                raise ValueError("Invalid response structure from Ollama API")
            
            # Normalize security type (case-insensitive)
            if "security" in result["entities"] and result["entities"]["security"]:
                security = result["entities"]["security"].upper()
                if security in ["WPA2", "WPA3"]:
                    result["entities"]["security"] = security
                elif security == "OPEN":
                    result["entities"]["security"] = "Open"
            
            # Normalize band format
            if "band" in result["entities"] and result["entities"]["band"]:
                band = result["entities"]["band"]
                if "2.4" in band or "2,4" in band:
                    result["entities"]["band"] = "2.4GHz"
                elif "5" in band:
                    result["entities"]["band"] = "5GHz"
            
            return result
            
        except json.JSONDecodeError as e:
            # Fallback: try to extract parameters using regex
            return self._fallback_parse(command, error=str(e))
        except Exception as e:
            return {
                "intent": "unknown",
                "entities": {},
                "confidence": 0.0,
                "missing": [],
                "error": f"NLP processing error: {str(e)}"
            }
    
    def _fallback_parse(self, command: str, error: str = "") -> Dict[str, Any]:
        """
        Fallback regex-based parsing when Groq API fails
        """
        entities = {}
        missing = []
        
        # Try to extract SSID (look for network name patterns)
        ssid_patterns = [
            r'network\s+(?:name\s+)?["\']?([a-zA-Z0-9_-]+)["\']?',
            r'ssid\s+["\']?([a-zA-Z0-9_-]+)["\']?',
            r'called\s+["\']?([a-zA-Z0-9_-]+)["\']?'
        ]
        for pattern in ssid_patterns:
            match = re.search(pattern, command, re.IGNORECASE)
            if match:
                entities["ssid"] = match.group(1)
                break
        
        # Extract security type
        if re.search(r'\bWPA3\b', command, re.IGNORECASE):
            entities["security"] = "WPA3"
        elif re.search(r'\bWPA2\b', command, re.IGNORECASE):
            entities["security"] = "WPA2"
        elif re.search(r'\bopen\b', command, re.IGNORECASE):
            entities["security"] = "Open"
        
        # Extract band
        if re.search(r'2\.4\s*GHz|2,4\s*GHz', command, re.IGNORECASE):
            entities["band"] = "2.4GHz"
        elif re.search(r'5\s*GHz', command, re.IGNORECASE):
            entities["band"] = "5GHz"
        
        # Extract password
        password_patterns = [
            r'password\s+(?:is\s+|will\s+be\s+)?["\']?([a-zA-Z0-9@#$%^&*!_-]+)["\']?',
            r'key\s+["\']?([a-zA-Z0-9@#$%^&*!_-]+)["\']?'
        ]
        for pattern in password_patterns:
            match = re.search(pattern, command, re.IGNORECASE)
            if match:
                entities["password"] = match.group(1)
                break
        
        # Determine intent
        intent = "unknown"
        if re.search(r'\b(create|make|start|setup)\b', command, re.IGNORECASE):
            intent = "create_hotspot"
        elif re.search(r'\b(stop|end|disable)\b', command, re.IGNORECASE):
            intent = "stop_hotspot"
        
        # Determine missing parameters
        if intent == "create_hotspot":
            required = ["ssid", "security", "band"]
            missing = [field for field in required if field not in entities]
        
        return {
            "intent": intent,
            "entities": entities,
            "confidence": 0.5 if entities else 0.1,  # Low confidence for fallback
            "missing": missing,
            "error": f"Fallback parsing used. Ollama API error: {error}" if error else "Fallback parsing used"
        }
    
    def generate_clarification_request(self, missing: list) -> str:
        """
        Generate a human-friendly clarification request for missing parameters
        """
        if not missing:
            return ""
        
        clarifications = {
            "ssid": "What should the network name (SSID) be?",
            "security": "What security type do you want? (WPA2, WPA3, or Open)",
            "band": "Which frequency band? (2.4GHz or 5GHz)",
            "password": "What password should I use for the network?"
        }
        
        questions = [clarifications.get(param, f"Please provide: {param}") for param in missing]
        
        if len(questions) == 1:
            return questions[0]
        elif len(questions) == 2:
            return f"{questions[0]} Also, {questions[1].lower()}"
        else:
            return "I need more information:\n- " + "\n- ".join(questions)
