"""
Network Data Model
==================
Data structures and feature extraction for network traffic analysis.
"""

import numpy as np
from typing import Dict, List


class NetworkFeatures:
    """
    Defines the features monitored for deauth attack detection.
    
    Features monitored:
    - Deauth frame rate (frames per second)
    - Reconnection frequency
    - Time between disconnects
    - Signal strength variation
    - Packet loss rate
    - Client disconnect rate
    - Management frame burst patterns
    - Channel switching frequency
    - Handshake capture attempts
    - Time window intensity
    """
    
    FEATURE_NAMES = [
        'deauth_frame_rate',
        'reconnection_frequency', 
        'avg_time_between_disconnects',
        'signal_strength_variation',
        'packet_loss_rate',
        'client_disconnect_rate',
        'mgmt_frame_burst_score',
        'channel_switch_frequency',
        'handshake_capture_attempts',
        'time_window_intensity'
    ]
    
    @staticmethod
    def extract_features(network_data: Dict) -> np.ndarray:
        """
        Extract features from network traffic data.
        
        Args:
            network_data: Dict containing network metrics
            
        Returns:
            numpy array of features (1, n_features)
        """
        features = []
        
        for fname in NetworkFeatures.FEATURE_NAMES:
            features.append(network_data.get(fname, 0.0))
        
        return np.array(features).reshape(1, -1)
    
    @staticmethod
    def get_feature_count() -> int:
        """Get the number of features"""
        return len(NetworkFeatures.FEATURE_NAMES)
    
    @staticmethod
    def get_feature_description() -> Dict[str, str]:
        """Get descriptions of all features"""
        return {
            'deauth_frame_rate': 'Deauthentication frames per second',
            'reconnection_frequency': 'Client reconnections per minute',
            'avg_time_between_disconnects': 'Average time between disconnects (seconds)',
            'signal_strength_variation': 'Signal strength variation (dBm)',
            'packet_loss_rate': 'Packet loss percentage',
            'client_disconnect_rate': 'Client disconnections per minute',
            'mgmt_frame_burst_score': 'Management frame burst intensity score',
            'channel_switch_frequency': 'Channel switching frequency',
            'handshake_capture_attempts': 'Handshake capture attempt count',
            'time_window_intensity': 'Overall activity intensity in time window'
        }


class NetworkDataValidator:
    """Validates network data before processing"""
    
    @staticmethod
    def validate(network_data: Dict) -> bool:
        """
        Validate network data structure.
        
        Args:
            network_data: Dict containing network metrics
            
        Returns:
            True if valid, False otherwise
        """
        if not isinstance(network_data, dict):
            return False
        
        # Check if at least some features are present
        feature_count = sum(1 for f in NetworkFeatures.FEATURE_NAMES if f in network_data)
        
        return feature_count > 0
    
    @staticmethod
    def sanitize(network_data: Dict) -> Dict:
        """
        Sanitize network data by filling missing values.
        
        Args:
            network_data: Dict containing network metrics
            
        Returns:
            Sanitized dict with all features
        """
        sanitized = {}
        
        for fname in NetworkFeatures.FEATURE_NAMES:
            value = network_data.get(fname, 0.0)
            # Ensure numeric and non-negative
            try:
                sanitized[fname] = max(0.0, float(value))
            except (ValueError, TypeError):
                sanitized[fname] = 0.0
        
        return sanitized
