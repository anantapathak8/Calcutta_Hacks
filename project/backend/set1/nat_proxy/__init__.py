"""
NAT & Proxy Simulator Module
============================
AI-powered NAT forwarding and nginx proxy configuration management.
"""

from .nat_forwarding import NginxConfigManager
from .protocol_predictor import predict_protocol

__all__ = ['NginxConfigManager', 'predict_protocol']
