"""
WiFi Deauthentication Attack Detection using Autoencoder-based Anomaly Detection
================================================================================
This module is now organized into separate components for better readability.

New Structure:
--------------
deauth_detection/
    __init__.py         - Package initialization
    network_model.py    - Network data structures and feature extraction
    ai_model.py         - Autoencoder model architecture and training
    heuristic_detector.py - Rule-based fallback detection
    detector.py         - Main detector that coordinates all components

Usage:
------
from set1.deauth_anomaly_detector import predict_deauth_attack, get_detector

# Use the same functions as before
result = predict_deauth_attack(network_data)
detector = get_detector()
"""

# Import from new organized structure
from .deauth_detection import DeauthAnomalyDetector, get_detector, predict_deauth_attack

# Keep backward compatibility
__all__ = ['DeauthAnomalyDetector', 'get_detector', 'predict_deauth_attack']

