# SENTINELAI - Autonomous Network Security Platform

SentinelAI is a production-grade security dashboard that integrates network scanning, AI reasoning, and hardware trust into a single interface.

## 🚀 Features (SETS)

### SET-1: Autonomous Threat Detection
- Continuous scanning of Ports, Wi-Fi Encryption, and ARP Spoofing.
- Real-time Risk Score calculation (0-100).
- Deauth Attack Prediction.

### SET-2: Network Hierarchy & Lateral Risk
- **Network Map**: Visualization of network topology (Router -> Nodes).
- **Blast Radius**: AI-driven calculation of lateral movement risk upon node compromise.
- **Credential Correlation**: Detects potential shared credential risks via vendor analysis.

### SET-3: AI Network Config Assistant
- **AI Architect**: Chat interface powered by Groq LLM & RAG.
- **Smart Advice**: Explains configuration risks in plain English and suggests CLI fixes.

### SET-4: Hardware USB Trust Layer
- **Physical Auth**: Requires a specific USB device (or key file) to trust the admin session.
- **Trust Signal**: Affects global Risk Score if the key is removed.

## 🛠️ Tech Stack
- **Backend**: Python (Flask, APScheduler, Scapy, Nmap)
- **Frontend**: React (Vite, Tailwind, Framer Motion, ForceGraph)
- **AI**: Groq API (LLM) + Qdrant (RAG Vector Store)

## 📦 Installation

### 1. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing SET-4 (Hardware Trust)
To simulate inserting the USB key:
```bash
touch /tmp/sentinel_key
```
To simulate removing it:
```bash
rm /tmp/sentinel_key
```
Watch the "Hardware Status" component on the Dashboard update in real-time.
