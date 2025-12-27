"""
WiFi Network & Deauth Attack Simulator Backend
=============================================
Simulates virtual WiFi networks and deauthentication attacks for testing
the AI-based anomaly detection system.
"""

import random
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List
import threading

# In-memory storage for simulated networks and attack states
virtual_networks: Dict[str, dict] = {}
attack_state = {
    "active": False,
    "target_network": None,
    "attack_type": None,
    "captured_handshakes": [],
    "attack_metrics": {},
    "normal_disconnect_active": False
}

# Real-time monitoring data for AI detection
network_monitoring_data = {
    "deauth_frame_rate": 0.0,
    "reconnection_frequency": 0.0,
    "avg_time_between_disconnects": 0.0,
    "signal_strength_variation": 0.0,
    "packet_loss_rate": 0.0,
    "client_disconnect_rate": 0.0,
    "mgmt_frame_burst_score": 0.0,
    "channel_switch_frequency": 0.0,
    "handshake_capture_attempts": 0.0,
    "time_window_intensity": 0.0,
    "last_update": None
}


def create_virtual_network(network_config: dict) -> dict:
    """Create a virtual WiFi network"""
    network_id = network_config.get('id') or str(uuid.uuid4())
    
    network = {
        "id": network_id,
        "ssid": network_config.get('ssid', f"Network-{network_id[:8]}"),
        "password": network_config.get('password', 'password123'),
        "encryption": network_config.get('encryption', 'WPA2-PSK'),
        "band": network_config.get('band', '2.4GHz'),
        "channel": network_config.get('channel', random.randint(1, 11)),
        "mtu": network_config.get('mtu', 1500),
        "mac_address": network_config.get('mac_address') or generate_mac(),
        "connected_devices": network_config.get('connected_devices', []),
        "status": "active",
        "created_at": datetime.now().isoformat(),
        "signal_strength": random.randint(-65, -30),
        "uptime": 0
    }
    
    # Ensure connected devices have proper format
    for i, device in enumerate(network['connected_devices']):
        if isinstance(device, str):
            network['connected_devices'][i] = {
                "mac": device,
                "ip": f"192.168.1.{100+i}",
                "connected": True,
                "last_seen": datetime.now().isoformat()
            }
    
    virtual_networks[network_id] = network
    return network


def generate_mac() -> str:
    """Generate a random MAC address"""
    return ':'.join([f'{random.randint(0, 255):02x}' for _ in range(6)])


def get_all_networks() -> List[dict]:
    """Get all virtual networks"""
    return list(virtual_networks.values())


def delete_network(network_id: str) -> bool:
    """Delete a virtual network"""
    if network_id in virtual_networks:
        del virtual_networks[network_id]
        return True
    return False


def simulate_deauth_attack(config: dict) -> dict:
    """
    Simulate a deauthentication attack
    
    Args:
        config: Attack configuration including target network, intensity, etc.
    """
    global attack_state, network_monitoring_data
    
    target_network_id = config.get('target_network_id')
    attack_intensity = config.get('intensity', 'medium')  # low, medium, high
    duration = config.get('duration', 30)  # seconds
    capture_handshake = config.get('capture_handshake', True)
    
    if target_network_id not in virtual_networks:
        return {"error": "Target network not found"}
    
    attack_state['active'] = True
    attack_state['normal_disconnect_active'] = False
    attack_state['target_network'] = target_network_id
    attack_state['attack_type'] = 'deauth'
    attack_state['start_time'] = datetime.now().isoformat()
    attack_state['end_time'] = (datetime.now() + timedelta(seconds=duration)).isoformat()
    
    # Calculate attack metrics based on intensity
    intensity_multipliers = {
        'low': {'deauth_rate': 2, 'reconnect': 1, 'burst': 1, 'handshake': False},
        'medium': {'deauth_rate': 8, 'reconnect': 3, 'burst': 2.5, 'handshake': True},
        'high': {'deauth_rate': 20, 'reconnect': 8, 'burst': 5, 'handshake': True}
    }
    
    mult = intensity_multipliers.get(attack_intensity, intensity_multipliers['medium'])
    
    print(f"\n[ATTACK] Started - Intensity: {attack_intensity}, Duration: {duration}s")
    
    # Simulate handshake capture (only for medium/high attacks if enabled)
    should_capture = capture_handshake and mult.get('handshake', True)
    if should_capture:
        handshake = {
            "id": str(uuid.uuid4()),
            "network_id": target_network_id,
            "network_ssid": virtual_networks[target_network_id]['ssid'],
            "client_mac": random.choice(virtual_networks[target_network_id]['connected_devices'])['mac'] if virtual_networks[target_network_id]['connected_devices'] else generate_mac(),
            "ap_mac": virtual_networks[target_network_id]['mac_address'],
            "captured_at": datetime.now().isoformat(),
            "quality": random.choice(['good', 'good', 'partial']),
            "eapol_frames": random.randint(3, 4)
        }
        attack_state['captured_handshakes'].append(handshake)
    
    # Store attack metrics
    attack_state['attack_metrics'] = {
        "intensity": attack_intensity,
        "duration": duration,
        "deauth_packets_sent": mult['deauth_rate'] * duration,
        "clients_affected": len(virtual_networks[target_network_id]['connected_devices']),
        "handshakes_captured": len(attack_state['captured_handshakes'])
    }
    
    # Function to continuously update monitoring data
    def update_loop():
        """Keep updating attack data until simulation ends"""
        end_time = datetime.fromisoformat(attack_state.get('end_time', datetime.now().isoformat()))
        
        while attack_state.get('active') and datetime.now() < end_time:
            # Update with attack patterns - adding realistic variance
            network_monitoring_data.update({
                'deauth_frame_rate': mult['deauth_rate'] + random.uniform(-1, 3),
                'reconnection_frequency': mult['reconnect'] + random.uniform(0, 2),
                'avg_time_between_disconnects': 2.0 + random.uniform(-0.5, 1.0),
                'signal_strength_variation': 15.0 + random.uniform(0, 10),
                'packet_loss_rate': 25.0 + random.uniform(0, 15),
                'client_disconnect_rate': mult['reconnect'] + random.uniform(0, 3),
                'mgmt_frame_burst_score': mult['burst'] + random.uniform(0, 2),
                'channel_switch_frequency': random.uniform(0, 1.5),
                'handshake_capture_attempts': 3 if should_capture else 0,
                'time_window_intensity': mult['deauth_rate'] * 1.5 + random.uniform(-2, 5),
                'last_update': datetime.now().isoformat()
            })
            
            print(f"[ATTACK] Updated - Deauth: {network_monitoring_data['deauth_frame_rate']:.1f}, Burst: {network_monitoring_data['mgmt_frame_burst_score']:.1f}")
            
            time.sleep(2)  # Update every 2 seconds
        
        # End attack
        print(f"[ATTACK] Ending simulation")
        end_attack()
    
    # Start the update loop in a background thread
    import threading
    thread = threading.Thread(target=update_loop, daemon=True)
    thread.start()
    
    return {
        "status": "attack_started",
        "target": virtual_networks[target_network_id]['ssid'],
        "intensity": attack_intensity,
        "duration": duration,
        "message": "Deauthentication attack simulation in progress"
    }


def simulate_normal_disconnect(config: dict) -> dict:
    """
    Simulate normal client disconnections (not an attack)
    
    Args:
        config: Configuration for normal disconnect patterns
    """
    global network_monitoring_data, attack_state
    
    target_network_id = config.get('target_network_id')
    duration = config.get('duration', 30)  # seconds
    
    # Get suggested values or use provided ones
    disconnect_rate = config.get('disconnect_rate', 0.1)  # disconnects per minute
    reconnect_time = config.get('reconnect_time', 15.0)  # seconds
    signal_variation = config.get('signal_variation', 5.0)  # dBm
    
    if target_network_id and target_network_id not in virtual_networks:
        return {"error": "Target network not found"}
    
    # Set the state
    attack_state['normal_disconnect_active'] = True
    attack_state['active'] = False  # Not an attack
    attack_state['target_network'] = target_network_id
    attack_state['attack_type'] = 'normal_disconnect'
    attack_state['start_time'] = datetime.now().isoformat()
    attack_state['end_time'] = (datetime.now() + timedelta(seconds=duration)).isoformat()
    
    print(f"\n[NORMAL DISCONNECT] Started - Rate: {disconnect_rate}/min, Duration: {duration}s")
    
    # Function to continuously update monitoring data
    def update_loop():
        """Keep updating data until simulation ends"""
        end_time = datetime.fromisoformat(attack_state.get('end_time', datetime.now().isoformat()))
        
        while attack_state.get('normal_disconnect_active') and datetime.now() < end_time:
            # Update with normal patterns
            network_monitoring_data.update({
                'deauth_frame_rate': random.uniform(0.0, 0.1),  # Almost no deauth frames
                'reconnection_frequency': disconnect_rate + random.uniform(-0.05, 0.05),
                'avg_time_between_disconnects': (60.0 / disconnect_rate if disconnect_rate > 0 else 300.0) + random.uniform(-10, 10),
                'signal_strength_variation': signal_variation + random.uniform(-1, 1),
                'packet_loss_rate': random.uniform(0.5, 3.5),  # Normal packet loss
                'client_disconnect_rate': disconnect_rate + random.uniform(-0.03, 0.03),
                'mgmt_frame_burst_score': random.uniform(0.1, 0.4),  # Very low
                'channel_switch_frequency': random.uniform(0.0, 0.2),
                'handshake_capture_attempts': 0,
                'time_window_intensity': random.uniform(0.3, 0.8),
                'last_update': datetime.now().isoformat()
            })
            
            print(f"[NORMAL DISCONNECT] Updated - Deauth: {network_monitoring_data['deauth_frame_rate']:.3f}, Reconnect: {network_monitoring_data['reconnection_frequency']:.3f}")
            
            time.sleep(2)  # Update every 2 seconds
        
        # End simulation
        print(f"[NORMAL DISCONNECT] Ending simulation")
        end_attack()
    
    # Start the update loop in a background thread
    import threading
    thread = threading.Thread(target=update_loop, daemon=True)
    thread.start()
    
    return {
        "status": "normal_disconnect_started",
        "target": virtual_networks[target_network_id]['ssid'] if target_network_id else "All networks",
        "message": "Simulating normal client disconnection patterns",
        "parameters": {
            "disconnect_rate": disconnect_rate,
            "reconnect_time": reconnect_time,
            "signal_variation": signal_variation,
            "duration": duration
        }
    }


def get_suggested_normal_params() -> dict:
    """Get suggested parameters for normal disconnection simulation"""
    return {
        "disconnect_rate": {
            "value": 0.1,
            "unit": "disconnects/minute",
            "description": "Typical client roaming or sleep mode disconnects"
        },
        "reconnect_time": {
            "value": 15.0,
            "unit": "seconds",
            "description": "Average time for client to reconnect normally"
        },
        "signal_variation": {
            "value": 5.0,
            "unit": "dBm",
            "description": "Normal signal strength fluctuation"
        },
        "packet_loss_rate": {
            "value": 2.0,
            "unit": "percentage",
            "description": "Acceptable packet loss in normal conditions"
        }
    }


def end_attack():
    """End the current attack simulation"""
    global attack_state, network_monitoring_data
    
    # Stop the attack/simulation
    attack_state['active'] = False
    attack_state['attack_type'] = None
    attack_state['normal_disconnect_active'] = False
    attack_state['target_network'] = None
    attack_state['start_time'] = None
    
    # Reset monitoring data to idle/baseline state
    network_monitoring_data.update({
        'deauth_frame_rate': 0.0,
        'reconnection_frequency': 0.0,
        'avg_time_between_disconnects': 0.0,
        'signal_strength_variation': random.uniform(2, 5),
        'packet_loss_rate': random.uniform(0, 2),
        'client_disconnect_rate': 0.0,
        'mgmt_frame_burst_score': 0.1,
        'channel_switch_frequency': 0.0,
        'handshake_capture_attempts': 0.0,
        'time_window_intensity': 0.0,
        'last_update': datetime.now().isoformat()
    })


def get_attack_state() -> dict:
    """Get current attack state"""
    # Ensure boolean values are returned as actual booleans
    return {
        "active": bool(attack_state.get('active', False)),
        "target_network": attack_state.get('target_network'),
        "attack_type": attack_state.get('attack_type'),
        "captured_handshakes": attack_state.get('captured_handshakes', []),
        "attack_metrics": attack_state.get('attack_metrics', {}),
        "normal_disconnect_active": bool(attack_state.get('normal_disconnect_active', False))
    }


def get_monitoring_data() -> dict:
    """Get current network monitoring data for AI analysis"""
    return network_monitoring_data.copy()


def get_captured_handshakes() -> List[dict]:
    """Get list of captured handshakes"""
    return attack_state.get('captured_handshakes', [])


def stop_attack() -> dict:
    """Manually stop the current attack or normal disconnect"""
    if attack_state.get('active') or attack_state.get('normal_disconnect_active'):
        print(f"[STOP] Manually stopping simulation")
        end_attack()
        return {"status": "stopped", "message": "Simulation stopped successfully"}
    return {"status": "no_active_simulation", "message": "No active simulation to stop"}


def auto_populate_networks(count: int = 3) -> List[dict]:
    """Auto-populate random networks for quick testing"""
    
    ssid_prefixes = ["HomeNet", "OfficeWiFi", "GuestNetwork", "SecureNet", "MyWiFi"]
    encryption_types = ["WPA2-PSK", "WPA3-SAE", "WPA2/WPA3-Mixed"]
    bands = ["2.4GHz", "5GHz"]
    
    networks = []
    
    for i in range(min(count, 10)):
        network_config = {
            "ssid": f"{random.choice(ssid_prefixes)}-{random.randint(1000, 9999)}",
            "password": f"Pass{random.randint(100000, 999999)}!",
            "encryption": random.choice(encryption_types),
            "band": random.choice(bands),
            "channel": random.randint(1, 11) if random.choice(bands) == "2.4GHz" else random.randint(36, 165),
            "mtu": 1500,
            "mac_address": generate_mac(),
            "connected_devices": [
                {
                    "mac": generate_mac(),
                    "ip": f"192.168.1.{100+j}",
                    "connected": True,
                    "last_seen": datetime.now().isoformat()
                }
                for j in range(random.randint(1, 5))
            ]
        }
        
        network = create_virtual_network(network_config)
        networks.append(network)
    
    return networks
