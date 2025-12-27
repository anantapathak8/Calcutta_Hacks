"""
SET 7: NLP-Based Wi-Fi Hotspot Generator

An NLP-to-infrastructure automation system that converts natural language commands
into validated Wi-Fi hotspot configurations and executes OS-level commands to create
real, functional hotspots.

Components:
- nlp_processor: Groq API integration for intent detection and entity extraction
- parameter_validator: Validates and sanitizes all network parameters
- os_detector: Detects OS and Wi-Fi adapter capabilities
- execution_engine: OS-specific hotspot creation with rollback support
- security_checks: Password validation, audit logging, safety checks
- api_routes: REST API endpoints for the frontend
"""

__version__ = "1.0.0"
__author__ = "Calcutta Hacks Team"
