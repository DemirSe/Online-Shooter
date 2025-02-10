#!/bin/bash

echo "Restarting servers..."

# Kill any process on port 3000 (backend server)
echo "Killing processes on port 3000..."
fuser -k 3000/tcp

# Kill any process on port 8080 (frontend server)
echo "Killing processes on port 8080..."
fuser -k 8080/tcp

# Wait a moment to ensure processes are terminated
sleep 2

# Start the backend server in the background
echo "Starting backend server..."
npm run dev &
backend_pid=$!

# Start the frontend server in the background
echo "Starting frontend server..."
npm run dev-client &
frontend_pid=$!

echo "Backend server started with PID: $backend_pid"
echo "Frontend server started with PID: $frontend_pid"
echo "Servers restarted successfully!" 