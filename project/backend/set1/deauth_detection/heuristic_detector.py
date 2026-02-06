"""
Heuristic Detection Logic
=========================
Rule-based fallback detection when AI model is not available.
"""

from datetime import datetime
from typing import Dict


class HeuristicDetector:
    """
    Rule-based heuristic detection for deauth attacks.
    Used as fallback when ML model is unavailable.
    """
        
    @staticmethod
    def detect(network_data: Dict) -> Dict:
        """
        Perform heuristic-based detection.
        
        Args:
            network_data: Dict containing network metrics
            
        Returns:
            Detection result dict
        """
        # Extract all relevant metrics
        deauth_rate = network_data.get('deauth_frame_rate', 0)
        reconnect_freq = network_data.get('reconnection_frequency', 0)
        handshake_attempts = network_data.get('handshake_capture_attempts', 0)
        mgmt_burst = network_data.get('mgmt_frame_burst_score', 0)
        signal_variation = network_data.get('signal_strength_variation', 0)
        packet_loss = network_data.get('packet_loss_rate', 0)
        disconnect_rate = network_data.get('client_disconnect_rate', 0)
        time_intensity = network_data.get('time_window_intensity', 0)
        
        # Calculate comprehensive risk score with balanced weights
        risk_score = (
            (deauth_rate * 4.0) +           # High deauth rate is critical
            (reconnect_freq * 1.5) +        # High reconnection frequency
            (handshake_attempts * 15.0) +   # Handshake capture is VERY suspicious
            (mgmt_burst * 2.5) +            # Management frame bursts
            (max(0, signal_variation - 5) * 0.8) +  # Signal variation above 5 dBm
            (max(0, packet_loss - 5) * 0.6) +       # Packet loss above 5%
            (disconnect_rate * 1.5) +       # Client disconnect rate
            (time_intensity * 1.2)          # Time window intensity
        )
        
        # Log metrics for debugging
        print(f"\n[AI DETECTION] Analyzing metrics:")
        print(f"  Deauth Rate: {deauth_rate:.2f}/s")
        print(f"  Reconnect Freq: {reconnect_freq:.2f}/min")
        print(f"  Signal Variation: {signal_variation:.2f} dBm")
        print(f"  Mgmt Burst: {mgmt_burst:.2f}")
        print(f"  Packet Loss: {packet_loss:.2f}%")
        print(f"  Disconnect Rate: {disconnect_rate:.2f}/min")
        print(f"  Time Intensity: {time_intensity:.2f}")
        print(f"  Risk Score: {risk_score:.2f}")
        
        # Classify based on risk score and key indicators
        status, details, probability = HeuristicDetector._classify_risk(
            risk_score, deauth_rate, handshake_attempts, mgmt_burst,
            reconnect_freq, signal_variation
        )
        
        print(f"  Status: {status}\n")
        
        return {
            "status": status,
            "details": details,
            "probability": probability,
            "anomaly_score": risk_score,
            "method": "heuristic",
            "timestamp": datetime.now().isoformat()
        }
    
    @staticmethod
    def _classify_risk(risk_score, deauth_rate, handshake_attempts, mgmt_burst,
                       reconnect_freq, signal_variation):
        """
        Classify risk level based on metrics.
        
        Returns:
            (status, details, probability) tuple
        """
        # Fine-tuned classification thresholds for proper gradation
        if handshake_attempts > 0 or deauth_rate > 15 or risk_score > 55:
            # Definite attack - handshake capture or very high deauth rate (HIGH attack)
            return (
                "CRITICAL",
                "🚨 DEAUTH ATTACK DETECTED! High probability of malicious activity.",
                "Very High (95%+)"
            )
        
        elif deauth_rate > 6 or mgmt_burst > 2.8 or risk_score > 30:
            # Strong attack indicators - medium intensity attack
            return (
                "HIGH_RISK",
                "⚠️ Suspicious attack patterns detected. Likely deauth attack in progress.",
                "High (70-95%)"
            )
        
        elif deauth_rate > 1.5 or mgmt_burst > 0.9 or reconnect_freq > 2.5 or signal_variation > 12 or risk_score > 10:
            # Elevated suspicious activity - low attack or unsafe params
            return (
                "WARNING",
                "⚡ Abnormal network behavior. Elevated disconnection activity detected.",
                "Medium (40-70%)"
            )
        
        elif reconnect_freq > 0.5 or mgmt_burst > 0.6 or signal_variation > 7 or risk_score > 3:
            # Slightly elevated - borderline suspicious
            return (
                "MODERATE",
                "⚠️ Slightly elevated activity. Monitor network closely.",
                "Low-Medium (20-40%)"
            )
        
        else:
            # Normal behavior
            return (
                "SAFE",
                "✅ Network behavior within normal parameters.",
                "Very Low (<20%)"
            )
