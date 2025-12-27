#!/bin/bash
# run.sh - Start SentinelAI

# Function to kill background processes on exit
cleanup() {
    echo "Stopping SentinelAI..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "--- SentinelAI Startup ---"

echo "[1/2] Starting Backend..."
source venv/bin/activate
python backend/app.py &
BACKEND_PID=$!
echo "Backend running (PID $BACKEND_PID)"

echo "[2/2] Starting Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend running (PID $FRONTEND_PID)"

echo "---------------------------------------"
echo "Dashboard: http://localhost:5173"
echo "Backend:   http://localhost:5000"
echo "---------------------------------------"
echo "Press Ctrl+C to stop."

wait
