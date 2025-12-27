"""
Main Detector
=============
Master file that coordinates all detection components.
"""

from typing import Dict
from datetime import datetime
from utils.terminal_logger import log_event

from .network_model import NetworkFeatures, NetworkDataValidator
from .ai_model import AutoencoderModel
from .heuristic_detector import HeuristicDetector


class DeauthAnomalyDetector:
    """
    Main deauth attack detector that coordinates AI and heuristic detection.
    
    This class ties together:
    - Network feature extraction
    - AI-based anomaly detection (autoencoder)
    - Heuristic fallback detection
    """
    
    def __init__(self, model_path=None):
        """
        Initialize the detector.
        
        Args:
            model_path: Optional path to pre-trained model
        """
        self.ai_model = AutoencoderModel(model_path=model_path)
        self.feature_names = NetworkFeatures.FEATURE_NAMES
        self.model = self.ai_model.model
        self.scaler = self.ai_model.scaler
        self.threshold = self.ai_model.threshold
    
    def extract_features(self, network_data: Dict):
        """
        Extract features from network data.
        
        Args:
            network_data: Dict containing network metrics
            
        Returns:
            numpy array of features
        """
        return NetworkFeatures.extract_features(network_data)
    
    def train(self, normal_traffic_data, epochs=100, validation_split=0.2):
        """
        Train the AI model on normal traffic.
        
        Args:
            normal_traffic_data: List of dicts with normal network behavior
            epochs: Number of training epochs
            validation_split: Validation data fraction
            
        Returns:
            True if successful
        """
        import numpy as np
        
        # Extract features from traffic data
        X_normal = np.array([
            [d.get(fname, 0.0) for fname in self.feature_names]
            for d in normal_traffic_data
        ])
        
        return self.ai_model.train(X_normal, epochs, validation_split)
    
    def predict(self, network_data: Dict) -> Dict:
        """
        Predict if network behavior indicates a deauth attack.
        
        Args:
            network_data: Dict containing current network metrics
            
        Returns:
            Dict with prediction results
        """
        # Validate and sanitize input
        if not NetworkDataValidator.validate(network_data):
            return {
                "status": "ERROR",
                "details": "Invalid network data",
                "timestamp": datetime.now().isoformat()
            }
        
        network_data = NetworkDataValidator.sanitize(network_data)
        
        # Try AI model first
        if self.ai_model.is_available():
            return self._ai_predict(network_data)
        else:
            # Fallback to heuristic
            return self._heuristic_fallback(network_data)
    
    def _ai_predict(self, network_data: Dict) -> Dict:
        """Use AI model for prediction"""
        try:
            # Extract features
            features = self.extract_features(network_data)
            
            # Get prediction from AI model
            mse, anomaly_score = self.ai_model.predict(features)
            
            if mse is None or anomaly_score is None:
                return self._heuristic_fallback(network_data)
            
            # Classify severity based on anomaly score
            if anomaly_score > 2.0:
                status = "CRITICAL"
                details = "High probability deauthentication attack detected!"
                probability = "Very High"
            elif anomaly_score > 1.5:
                status = "HIGH_RISK"
                details = "Suspicious deauth activity detected. Possible attack in progress."
                probability = "High"
            elif anomaly_score > 1.0:
                status = "WARNING"
                details = "Unusual disconnection patterns detected. Monitor closely."
                probability = "Medium"
            else:
                status = "SAFE"
                details = "Network behavior within normal parameters."
                probability = "Low"
            
            log_event("SCAN", f"Deauth detection: {status} (score: {anomaly_score:.3f})", "SCAN")
            
            return {
                "status": status,
                "details": details,
                "probability": probability,
                "anomaly_score": float(anomaly_score),
                "reconstruction_error": float(mse),
                "threshold": float(self.threshold) if self.threshold else None,
                "features_analyzed": self.feature_names,
                "method": "ai_model",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            log_event("ERROR", f"AI prediction error: {e}", "MODEL")
            return self._heuristic_fallback(network_data)
    
    def _heuristic_fallback(self, network_data: Dict) -> Dict:
        """Fallback to heuristic detection"""
        return HeuristicDetector.detect(network_data)
    
    def build_autoencoder(self, input_dim=10):
        """Build autoencoder (delegates to AI model)"""
        return self.ai_model.build_autoencoder(input_dim)


# Global detector instance
_detector = None


def get_detector():
    """Get or create global detector instance"""
    global _detector
    if _detector is None:
        _detector = DeauthAnomalyDetector()
    return _detector


def predict_deauth_attack(network_data: Dict) -> Dict:
    """
    Main function to predict deauth attacks.
    
    Args:
        network_data: Dict with network metrics
        
    Returns:
        Prediction results dict
    """
    detector = get_detector()
    return detector.predict(network_data)
