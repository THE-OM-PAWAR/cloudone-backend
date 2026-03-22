#!/bin/bash

# Fix Static Site Deployment Script
# This script fixes deployments that have no package.json (static HTML sites)

PROJECT_NAME="code-cult-task-2"
PORT=3005
PROJECT_DIR="/home/ubuntu/apps/${PROJECT_NAME}"

echo "🔧 Fixing static site deployment: ${PROJECT_NAME}"
echo "============================================================"

# Stop the broken PM2 process
echo "🛑 Stopping broken PM2 process..."
pm2 delete ${PROJECT_NAME} 2>/dev/null || true

# Wait a moment
sleep 2

# Check if serve is installed globally
echo "📦 Checking for serve package..."
if ! command -v serve &> /dev/null; then
    echo "📦 Installing serve globally..."
    npm install -g serve
fi

# Start the static site with serve
echo "🚀 Starting static site with serve..."
cd ${PROJECT_DIR} && pm2 start npx --name "${PROJECT_NAME}" -- serve -s . -p ${PORT} --no-clipboard

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Check status
echo "📊 Checking PM2 status..."
pm2 show ${PROJECT_NAME}

# Test the site
echo "🔍 Testing site on localhost:${PORT}..."
sleep 3
curl -I http://localhost:${PORT}

echo "============================================================"
echo "✅ Fix complete! Site should now be accessible at:"
echo "🌐 https://${PROJECT_NAME}.aitoyz.in"
echo ""
echo "To verify, run: pm2 logs ${PROJECT_NAME}"
