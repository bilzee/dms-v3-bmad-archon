#!/bin/sh

echo "=== Container Startup Debug ==="
echo "Date: $(date)"
echo "Working Directory: $(pwd)"
echo "User: $(whoami)"
echo "Node Version: $(node --version)"
echo ""
echo "=== Environment Variables ==="
env | sort
echo ""
echo "=== Files in Current Directory ==="
ls -la
echo ""
echo "=== Checking server.js ==="
if [ -f "server.js" ]; then
    echo "server.js exists and is readable"
    head -5 server.js
else
    echo "ERROR: server.js not found!"
    exit 1
fi
echo ""
echo "=== Starting Node.js Server ==="
node server.js