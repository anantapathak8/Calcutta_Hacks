"""
AI-based Protocol Predictor for NAT Forwarding
==============================================
Uses NLP to predict network protocol based on service description.
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
import pickle
import os


class ProtocolPredictor:
    """
    AI model to predict network protocol (TCP/UDP/BOTH) based on service description.
    """
    
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.model_path = os.path.join(os.path.dirname(__file__), '../models/protocol_classifier.pkl')
        self.vectorizer_path = os.path.join(os.path.dirname(__file__), '../models/protocol_vectorizer.pkl')
        
        # Training dataset
        self.training_data = {
            'descriptions': [
                # TCP services
                'web server', 'http server', 'https', 'website', 'web service', 'rest api',
                'file transfer', 'ftp server', 'sftp', 'file upload', 'file download',
                'ssh connection', 'secure shell', 'remote login', 'terminal access',
                'email server', 'smtp', 'mail service', 'email relay',
                'database', 'mysql', 'postgresql', 'mongodb', 'sql server',
                'telnet', 'remote terminal', 'terminal service',
                'git server', 'version control', 'repository',
                'proxy server', 'reverse proxy', 'load balancer',
                'chat application', 'messaging', 'instant messaging',
                'api server', 'backend service', 'microservice',
                'socks proxy', 'socks4', 'socks5',
                
                # UDP services
                'video streaming', 'live stream', 'video broadcast', 'media streaming',
                'voice call', 'voip', 'video call', 'audio streaming',
                'game server', 'gaming', 'multiplayer game', 'online game',
                'udp tunnel', 'udp proxy', 'udp forward',
                'ntp server', 'time synchronization', 'network time',
                'snmp', 'network monitoring', 'device monitoring',
                'tftp', 'trivial file transfer',
                'syslog', 'logging server', 'log collection',
                'iot service', 'sensor data', 'device telemetry',
                
                # BOTH (TCP + UDP)
                'dns server', 'domain name service', 'name resolution',
                'vpn server', 'virtual private network', 'openvpn', 'wireguard',
                'pptp', 'point to point tunnel',
                'ipsec', 'ip security', 'secure tunnel',
                'sip server', 'sip proxy', 'voip server',
                'ldap', 'directory service', 'active directory',
                'radius', 'authentication server', 'aaa server',
                'l2tp', 'layer 2 tunnel',
                'kerberos', 'authentication protocol',
                'netbios', 'windows file sharing', 'smb',
            ],
            'protocols': [
                # TCP
                'TCP', 'TCP', 'TCP', 'TCP', 'TCP', 'TCP',
                'TCP', 'TCP', 'TCP', 'TCP', 'TCP',
                'TCP', 'TCP', 'TCP', 'TCP',
                'TCP', 'TCP', 'TCP', 'TCP',
                'TCP', 'TCP', 'TCP', 'TCP', 'TCP',
                'TCP', 'TCP', 'TCP',
                'TCP', 'TCP', 'TCP',
                'TCP', 'TCP', 'TCP',
                'TCP', 'TCP', 'TCP',
                'TCP', 'TCP', 'TCP',
                'TCP', 'TCP', 'TCP',
                
                # UDP
                'UDP', 'UDP', 'UDP', 'UDP',
                'UDP', 'UDP', 'UDP', 'UDP',
                'UDP', 'UDP', 'UDP', 'UDP',
                'UDP', 'UDP', 'UDP',
                'UDP', 'UDP', 'UDP',
                'UDP', 'UDP',
                'UDP', 'UDP', 'UDP',
                'UDP', 'UDP', 'UDP',
                'UDP', 'UDP', 'UDP',
                
                # BOTH
                'BOTH', 'BOTH', 'BOTH',
                'BOTH', 'BOTH', 'BOTH', 'BOTH',
                'BOTH', 'BOTH', 'BOTH',
                'BOTH', 'BOTH', 'BOTH',
                'BOTH', 'BOTH', 'BOTH',
                'BOTH', 'BOTH', 'BOTH',
                'BOTH', 'BOTH', 'BOTH',
                'BOTH', 'BOTH', 'BOTH',
                'BOTH', 'BOTH', 'BOTH',
            ]
        }
        
        # Load or train model
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize or load the trained model"""
        if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                with open(self.vectorizer_path, 'rb') as f:
                    self.vectorizer = pickle.load(f)
                print("[PROTOCOL AI] Loaded existing protocol prediction model")
            except Exception as e:
                print(f"[PROTOCOL AI] Error loading model: {e}. Training new model...")
                self._train_model()
        else:
            self._train_model()
    
    def _train_model(self):
        """Train the protocol prediction model"""
        print("[PROTOCOL AI] Training protocol prediction model...")
        
        # Create TF-IDF vectorizer
        self.vectorizer = TfidfVectorizer(
            max_features=100,
            ngram_range=(1, 2),
            lowercase=True
        )
        
        # Transform text to features
        X = self.vectorizer.fit_transform(self.training_data['descriptions'])
        y = self.training_data['protocols']
        
        # Train Random Forest classifier
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.model.fit(X, y)
        
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
        with open(self.vectorizer_path, 'wb') as f:
            pickle.dump(self.vectorizer, f)
        
        print("[PROTOCOL AI] Model trained and saved")
    
    def predict(self, description: str) -> dict:
        """
        Predict protocol based on service description.
        
        Args:
            description: Natural language description of the service
            
        Returns:
            Dict with prediction and confidence
        """
        if not description or not description.strip():
            return {
                "protocol": "TCP",
                "confidence": 0.5,
                "suggestion": "Default to TCP (no description provided)"
            }
        
        # Transform input
        X = self.vectorizer.transform([description.lower()])
        
        # Get prediction and probabilities
        prediction = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        confidence = max(probabilities)
        
        # Generate explanation
        suggestions = {
            'TCP': 'TCP is reliable and connection-oriented, suitable for data integrity.',
            'UDP': 'UDP is fast and connectionless, ideal for real-time applications.',
            'BOTH': 'This service typically uses both TCP and UDP for different functions.'
        }
        
        return {
            "protocol": prediction,
            "confidence": float(confidence),
            "suggestion": suggestions.get(prediction, ""),
            "all_probabilities": {
                protocol: float(prob) 
                for protocol, prob in zip(self.model.classes_, probabilities)
            }
        }


# Global predictor instance
_predictor = None


def get_predictor():
    """Get or create global predictor instance"""
    global _predictor
    if _predictor is None:
        _predictor = ProtocolPredictor()
    return _predictor


def predict_protocol(description: str) -> dict:
    """
    Predict network protocol from service description.
    
    Args:
        description: Natural language description
        
    Returns:
        Prediction dict
    """
    predictor = get_predictor()
    return predictor.predict(description)
