# WiFi Deauthentication Attack Detection System

## Overview
This system uses an **Autoencoder-based Anomaly Detection** model to identify WiFi deauthentication attacks in real-time. Unlike rule-based systems, this AI model learns normal network behavior patterns and flags deviations as potential attacks.

## Architecture

### Backend Components

1. **AI Model** (`set1/deauth_anomaly_detector.py`)
   - Deep learning autoencoder for anomaly detection
   - Monitors 10 key network features
   - Distinguishes between attacks and normal disconnections
   - Features analyzed:
     - Deauth frame rate
     - Reconnection frequency
     - Time between disconnects
     - Signal strength variation
     - Packet loss rate
     - Client disconnect rate
     - Management frame burst patterns
     - Channel switching frequency
     - Handshake capture attempts
     - Time window intensity

2. **Simulator** (`set1/deauth_simulator.py`)
   - Creates virtual WiFi networks
   - Simulates deauth attacks with variable intensity
   - Simulates normal client disconnections
   - Captures WPA/WPA2 handshakes
   - Provides realistic attack scenarios for testing

3. **API Endpoints** (`app.py`)
   - `/api/deauth/networks` - Manage virtual networks
   - `/api/deauth/attack/start` - Launch attack simulation
   - `/api/deauth/normal-disconnect/start` - Simulate normal behavior
   - `/api/deauth/detect` - Get AI detection results
   - `/api/deauth/handshakes` - View captured handshakes

### Frontend Components

1. **Network Configuration Page** (`/deauth-sim/net-config`)
   - Configure up to 10 virtual WiFi networks
   - Set SSID, password, encryption, channel, etc.
   - Add up to 10 connected devices per network
   - Auto-populate feature for quick testing

2. **Attacker Configuration Page** (`/deauth-sim/attacker-config`)
   - Launch deauth attack simulations
   - Configure attack intensity (low/medium/high)
   - Capture handshakes
   - Simulate normal disconnections (for comparison)
   - View captured handshakes and metrics

3. **Dashboard Integration** (`/`)
   - Real-time deauth detection widget
   - Color-coded threat levels (Safe/Warning/High Risk/Critical)
   - Live anomaly scores
   - Automatic updates every 2 seconds

## How It Works

### Attack Detection Flow

1. **Normal Behavior Training**
   - Model trains on normal network patterns
   - Learns baseline for reconnection rates, signal behavior, etc.

2. **Real-time Monitoring**
   - System continuously monitors network metrics
   - Extracts 10 feature values every monitoring cycle

3. **Anomaly Detection**
   - Autoencoder attempts to reconstruct input features
   - High reconstruction error = anomaly detected
   - Anomaly score compared to learned threshold

4. **Classification**
   - **SAFE**: Score < threshold (normal behavior)
   - **WARNING**: Score > 1.0x threshold
   - **HIGH_RISK**: Score > 1.5x threshold
   - **CRITICAL**: Score > 2.0x threshold

### Normal vs Attack Patterns

**Normal Disconnect:**
- Low deauth frame rate (~0)
- Occasional reconnections (0.1/min)
- Gradual signal degradation
- No handshake capture attempts

**Deauth Attack:**
- High deauth frame rate (2-20+/sec)
- Frequent reconnections (3-8+/min)
- Sudden signal changes
- Multiple handshake capture attempts
- Management frame bursts

## Usage

### 1. Set Up Networks
```
Navigate to: http://localhost:5173/deauth-sim/net-config
- Click "Auto Populate" for quick setup, or
- Manually create networks with custom parameters
```

### 2. Run Attack Simulation
```
Navigate to: http://localhost:5173/deauth-sim/attacker-config
- Select target network
- Choose intensity (low/medium/high)
- Set duration
- Enable handshake capture
- Click "Launch Attack"
```

### 3. Test Normal Disconnection
```
On attacker config page:
- Switch to "Normal Disconnect" tab
- Use suggested parameters or customize
- Click "Start Normal Disconnect Simulation"
```

### 4. View Detection Results
```
Navigate to: http://localhost:5173/ (Dashboard)
- See real-time AI detection widget
- Color indicates threat level
- Anomaly score shows detection confidence
- No manual refresh needed
```

## For Hackathon Judges

### Addressing "False Positive" Concerns

**Question**: "Won't normal disconnections trigger false alarms?"

**Answer**: No, because:

1. **AI Learning**: The model is trained on normal patterns, not rules
2. **Feature Differentiation**: Normal disconnects have:
   - Zero deauth frames (clients disconnect gracefully)
   - Longer reconnection times (15+ seconds)
   - Lower frequency (0.1/min vs 3-8/min in attacks)
   - No handshake capture attempts

3. **Live Demo**: Use the "Normal Disconnect" simulator to show the AI correctly identifies it as SAFE

4. **Attack Patterns**: Deauth attacks have distinctive signatures:
   - Burst of deauth management frames
   - Rapid repeated reconnections
   - Handshake capture synchronization
   - High management frame traffic

### Demo Script for Judges

1. **Show Normal Behavior**
   - Start normal disconnect simulation
   - Dashboard shows GREEN (SAFE)
   - Explain: "AI recognizes this as normal roaming"

2. **Launch Attack**
   - Start medium intensity deauth attack
   - Dashboard immediately turns ORANGE/RED
   - Explain: "AI detects anomalous pattern"

3. **Show Handshake Capture**
   - View captured handshakes
   - Explain: "This is what attackers use for password cracking"

4. **Highlight AI Advantage**
   - "Rule-based systems use fixed thresholds"
   - "Our AI adapts to network conditions"
   - "Distinguishes subtle differences in patterns"

## Technical Details

### Model Architecture
```
Input Layer (10 features)
    ↓
Encoder: 10 → 16 → 8 → 4 (with BatchNorm)
    ↓
Decoder: 4 → 8 → 16 → 10 (with BatchNorm)
    ↓
Output Layer (reconstructed features)
```

### Attack Intensity Levels

**Low** (Stealthy):
- 2-3 deauth frames/sec
- 1 reconnection/min
- Harder to detect, slower

**Medium** (Balanced):
- 8-10 deauth frames/sec
- 3 reconnections/min
- Standard attack pattern

**High** (Aggressive):
- 20+ deauth frames/sec
- 8+ reconnections/min
- Very obvious, very fast

## Dependencies

New packages added to `requirements.txt`:
```
tensorflow
scikit-learn
numpy
```

Install with:
```bash
cd project/backend
pip install -r requirements.txt
```

## API Reference

### Network Management
- `GET /api/deauth/networks` - List all networks
- `POST /api/deauth/networks` - Create network
- `DELETE /api/deauth/networks/<id>` - Delete network
- `POST /api/deauth/networks/auto-populate` - Quick setup

### Attack Simulation
- `POST /api/deauth/attack/start` - Start attack
- `POST /api/deauth/attack/stop` - Stop attack
- `GET /api/deauth/attack/status` - Get status

### Detection
- `GET /api/deauth/detect` - Get AI detection results

### Normal Behavior
- `POST /api/deauth/normal-disconnect/start` - Simulate normal
- `GET /api/deauth/normal-disconnect/suggested-params` - Get defaults

## Security Note

This is a **cybersecurity research and education tool**. The simulations are virtual and do not affect real networks. Use responsibly and only on networks you own or have permission to test.

## Model Training

The autoencoder trains automatically on normal traffic patterns. For production use:

1. Collect normal network behavior data
2. Generate training dataset
3. Train model: `detector.train(normal_data, epochs=100)`
4. Model saves automatically to `backend/models/`

## Roadmap

- [ ] Add more attack types (Evil Twin, Karma, etc.)
- [ ] Real packet capture integration
- [ ] Multi-network monitoring
- [ ] Attack mitigation suggestions
- [ ] Historical attack analysis

---

Built for **Calcutta Hacks** - A proof-of-concept for AI-powered wireless security.
