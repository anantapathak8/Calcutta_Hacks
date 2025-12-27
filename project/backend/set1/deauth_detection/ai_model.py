"""
AI Model Architecture
=====================
Autoencoder model for anomaly detection.
"""

import os
import pickle
import numpy as np
from sklearn.preprocessing import StandardScaler
from datetime import datetime

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

from utils.terminal_logger import log_event


class AutoencoderModel:
    """
    Autoencoder-based anomaly detection model.
    Uses deep learning to learn normal network behavior patterns.
    """
    
    def __init__(self, model_path=None, scaler_path=None):
        """
        Initialize the autoencoder model.
        
        Args:
            model_path: Path to save/load the trained model
            scaler_path: Path to save/load the feature scaler
        """
        self.model_path = model_path or os.path.join(
            os.path.dirname(__file__), 
            '../../models/deauth_autoencoder.h5'
        )
        self.scaler_path = scaler_path or os.path.join(
            os.path.dirname(__file__),
            '../../models/deauth_scaler.pkl'
        )
        
        self.model = None
        self.scaler = StandardScaler()
        self.threshold = None
        
        # Try to load existing model
        self._load_model()
    
    def _load_model(self):
        """Load existing model and scaler if available"""
        if os.path.exists(self.model_path) and TF_AVAILABLE:
            try:
                self.model = keras.models.load_model(self.model_path)
                with open(self.scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                log_event("INFO", "Loaded existing deauth detection model", "MODEL")
            except Exception as e:
                log_event("WARNING", f"Could not load model: {e}", "MODEL")
    
    def build_autoencoder(self, input_dim=10):
        """
        Build the autoencoder architecture.
        
        Architecture:
        - Encoder: input -> 16 -> 8 -> 4 (latent)
        - Decoder: 4 -> 8 -> 16 -> output
        - BatchNormalization for stable training
        
        Args:
            input_dim: Number of input features
            
        Returns:
            Compiled autoencoder model
        """
        if not TF_AVAILABLE:
            raise ImportError("TensorFlow required for model training")
        
        # Encoder
        encoder_input = layers.Input(shape=(input_dim,))
        encoded = layers.Dense(16, activation='relu')(encoder_input)
        encoded = layers.BatchNormalization()(encoded)
        encoded = layers.Dense(8, activation='relu')(encoded)
        encoded = layers.BatchNormalization()(encoded)
        encoded = layers.Dense(4, activation='relu')(encoded)
        
        # Decoder
        decoded = layers.Dense(8, activation='relu')(encoded)
        decoded = layers.BatchNormalization()(decoded)
        decoded = layers.Dense(16, activation='relu')(decoded)
        decoded = layers.BatchNormalization()(decoded)
        decoded = layers.Dense(input_dim, activation='linear')(decoded)
        
        # Autoencoder model
        autoencoder = keras.Model(encoder_input, decoded)
        autoencoder.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        return autoencoder
    
    def train(self, normal_traffic_data, epochs=100, validation_split=0.2):
        """
        Train the autoencoder on normal network traffic patterns.
        
        Args:
            normal_traffic_data: numpy array of normal traffic features
            epochs: Number of training epochs
            validation_split: Fraction of data for validation
            
        Returns:
            True if training successful, False otherwise
        """
        if not TF_AVAILABLE:
            log_event("ERROR", "TensorFlow not available for training", "MODEL")
            return False
        
        log_event("INFO", "Training deauth detection model on normal traffic...", "MODEL")
        
        # Scale features
        X_scaled = self.scaler.fit_transform(normal_traffic_data)
        
        # Build and train autoencoder
        self.model = self.build_autoencoder(input_dim=normal_traffic_data.shape[1])
        
        history = self.model.fit(
            X_scaled, X_scaled,
            epochs=epochs,
            batch_size=32,
            validation_split=validation_split,
            shuffle=True,
            verbose=0,
            callbacks=[
                keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=10,
                    restore_best_weights=True
                )
            ]
        )
        
        # Calculate reconstruction threshold (95th percentile of training errors)
        predictions = self.model.predict(X_scaled, verbose=0)
        mse = np.mean(np.power(X_scaled - predictions, 2), axis=1)
        self.threshold = np.percentile(mse, 95)
        
        # Save model and scaler
        self._save_model()
        
        log_event("SUCCESS", f"Model trained. Threshold: {self.threshold:.4f}", "MODEL")
        return True
    
    def _save_model(self):
        """Save model and scaler to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.model.save(self.model_path)
        with open(self.scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
    
    def predict(self, features):
        """
        Get reconstruction error for features.
        
        Args:
            features: numpy array of features (1, n_features)
            
        Returns:
            reconstruction error (MSE), anomaly score
        """
        if self.model is None:
            return None, None
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Get reconstruction
        reconstruction = self.model.predict(features_scaled, verbose=0)
        
        # Calculate reconstruction error
        mse = np.mean(np.power(features_scaled - reconstruction, 2))
        
        # Calculate anomaly score
        anomaly_score = mse / self.threshold if self.threshold else mse
        
        return float(mse), float(anomaly_score)
    
    def is_available(self):
        """Check if model is available for prediction"""
        return self.model is not None
