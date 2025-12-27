"""
Deauth Detection Module
======================
Organized structure for WiFi deauthentication attack detection system.
"""

from .detector import DeauthAnomalyDetector, get_detector, predict_deauth_attack

__all__ = ['DeauthAnomalyDetector', 'get_detector', 'predict_deauth_attack']
