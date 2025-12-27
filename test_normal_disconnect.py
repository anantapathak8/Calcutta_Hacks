#!/usr/bin/env python3
"""
Quick test script to verify normal disconnect simulation works
"""
import requests
import time
import json

BASE_URL = "http://localhost:5001"

def test_normal_disconnect():
    print("=" * 60)
    print("TESTING NORMAL DISCONNECT SIMULATION")
    print("=" * 60)
    
    # Step 1: Create a test network
    print("\n1. Creating test network...")
    network_data = {
        "ssid": "TestNetwork",
        "password": "password123",
        "encryption": "WPA2-PSK",
        "connected_devices": [
            {"mac": "AA:BB:CC:DD:EE:FF", "ip": "192.168.1.100"}
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/deauth/networks", json=network_data)
    result = response.json()
    
    # Check if there's an error
    if 'error' in result:
        print(f"✗ Error creating network: {result['error']}")
        print("   Trying to use existing network...")
        response = requests.get(f"{BASE_URL}/api/deauth/networks")
        all_networks = response.json()
        networks_list = all_networks.get('networks', [])
        if networks_list:
            network = networks_list[-1]
            network_id = network['id']
            print(f"✓ Using existing network: {network['ssid']} (ID: {network_id})")
        else:
            print("✗ No networks available! Please create networks first.")
            return
    else:
        # Network was created successfully
        network = result.get('network', {})
        network_id = network['id']
        print(f"✓ Network created: {network['ssid']} (ID: {network_id})")
    
    # Step 2: Check initial detection state (should be idle)
    print("\n2. Checking initial detection state...")
    response = requests.get(f"{BASE_URL}/api/deauth/detect")
    initial_detection = response.json()
    print(f"   Status: {initial_detection['prediction']['status']}")
    print(f"   Deauth Rate: {initial_detection['monitoring_data']['deauth_frame_rate']}")
    
    # Step 3: Start normal disconnect simulation
    print("\n3. Starting normal disconnect simulation...")
    normal_config = {
        "target_network_id": network_id,
        "disconnect_rate": 0.1,
        "duration": 15,  # 15 seconds for quick test
        "signal_variation": 5.0
    }
    
    response = requests.post(f"{BASE_URL}/api/deauth/normal-disconnect/start", json=normal_config)
    result = response.json()
    print(f"✓ {result['message']}")
    print(f"   Target: {result['target']}")
    print(f"   Duration: {result['parameters']['duration']} seconds")
    
    # Step 4: Monitor detection changes in real-time
    print("\n4. Monitoring detection changes (every 3 seconds for 12 seconds)...")
    detections = []
    for i in range(4):
        time.sleep(3)
        response = requests.get(f"{BASE_URL}/api/deauth/detect")
        detection = response.json()
        detections.append(detection)
        
        print(f"\n   [+{i*3+3}s] Detection Update:")
        print(f"      Status: {detection['prediction']['status']}")
        print(f"      Details: {detection['prediction']['details']}")
        print(f"      Deauth Rate: {detection['monitoring_data']['deauth_frame_rate']:.3f}/s")
        print(f"      Reconnect Freq: {detection['monitoring_data']['reconnection_frequency']:.3f}/min")
        print(f"      Mgmt Burst: {detection['monitoring_data']['mgmt_frame_burst_score']:.3f}")
        print(f"      Last Update: {detection['monitoring_data']['last_update']}")
    
    # Step 5: Check final state after simulation ends
    print("\n5. Checking final state (after simulation ends)...")
    time.sleep(5)
    response = requests.get(f"{BASE_URL}/api/deauth/detect")
    final_detection = response.json()
    print(f"   Status: {final_detection['prediction']['status']}")
    print(f"   Deauth Rate: {final_detection['monitoring_data']['deauth_frame_rate']}")
    
    # Use detection from the middle of the simulation for verification
    mid_detection = detections[1] if len(detections) > 1 else detections[0]
    
    # Verify results
    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)
    
    success = True
    
    # Check that monitoring data was NOT all zeros during simulation (using mid-simulation data)
    if mid_detection['monitoring_data']['reconnection_frequency'] > 0 or mid_detection['monitoring_data']['deauth_frame_rate'] > 0:
        print(f"✓ Monitoring data was active during simulation")
        print(f"  - Reconnect Freq: {mid_detection['monitoring_data']['reconnection_frequency']:.3f}/min")
        print(f"  - Deauth Rate: {mid_detection['monitoring_data']['deauth_frame_rate']:.3f}/s")
    else:
        print("✗ FAILED: Monitoring data was all zeros during simulation")
        success = False
    
    # Check that status was SAFE or WARNING (not CRITICAL for normal disconnect)
    if mid_detection['prediction']['status'] in ['SAFE', 'WARNING']:
        print(f"✓ AI correctly classified as non-attack: {mid_detection['prediction']['status']}")
    else:
        print(f"✗ FAILED: AI incorrectly classified as: {mid_detection['prediction']['status']}")
        success = False
    
    # Check that data resets after simulation
    if final_detection['monitoring_data']['deauth_frame_rate'] < 0.1:
        print("✓ Monitoring data reset after simulation ended")
    else:
        print("✗ WARNING: Data did not reset properly")
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Normal disconnect simulation is working!")
    else:
        print("\n❌ SOME TESTS FAILED - Check the output above")
    
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_normal_disconnect()
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to backend at http://localhost:5001")
        print("   Make sure the Flask backend is running!")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
