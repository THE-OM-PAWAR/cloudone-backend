#!/bin/bash
# VPS Setup Script for Deployment System
# Run this on your VPS as root or with sudo

echo "🚀 Setting up VPS for deployments..."
echo "=================================="

# Create deployment directory
echo "📁 Creating deployment directory..."
sudo mkdir -p /home/ubuntu/apps
sudo chown -R ubuntu:ubuntu /home/ubuntu/apps
sudo chmod -R 755 /home/ubuntu/apps

echo "✅ Deployment directory created: /home/ubuntu/apps"
echo "   Owner: ubuntu"
echo "   Permissions: 755"

# Install required packages
echo ""
echo "📦 Installing required packages..."

# Update package list
sudo apt-get update

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Installing npm..."
    sudo apt-get install -y npm
else
    echo "✅ npm already installed: $(npm --version)"
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
    pm2 startup
else
    echo "✅ PM2 already installed: $(pm2 --version)"
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    sudo apt-get install -y git
else
    echo "✅ Git already installed: $(git --version)"
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    echo "✅ Nginx already installed: $(nginx -v 2>&1)"
fi

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    sudo apt-get install -y certbot python3-certbot-nginx
else
    echo "✅ Certbot already installed: $(certbot --version)"
fi

# Configure firewall
echo ""
echo "🔥 Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 'Nginx Full'
    sudo ufw allow OpenSSH
    echo "✅ Firewall configured (Nginx Full, OpenSSH)"
else
    echo "⚠️  UFW not found, skipping firewall configuration"
fi

echo ""
echo "=================================="
echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify deployment directory: ls -la /home/ubuntu/apps"
echo "2. Check Nginx status: sudo systemctl status nginx"
echo "3. Configure your domain DNS to point to this server"
echo "4. Update BASE_DOMAIN in your backend .env file"
echo "5. Test deployment from your platform"
echo ""
