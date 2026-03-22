require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Validate required environment variables
const requiredEnvVars = ['SSH_HOST', 'SSH_USERNAME', 'SSH_PRIVATE_KEY_PATH'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('SSH functionality may not work properly.');
}

// Load SSH private key if path is provided
let sshPrivateKey = null;
if (process.env.SSH_PRIVATE_KEY_PATH) {
  try {
    const keyPath = path.resolve(process.env.SSH_PRIVATE_KEY_PATH);
    if (fs.existsSync(keyPath)) {
      sshPrivateKey = fs.readFileSync(keyPath, 'utf8');
    } else {
      console.warn(`SSH private key file not found at: ${keyPath}`);
    }
  } catch (error) {
    console.error('Error loading SSH private key:', error.message);
  }
}

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // SSH Configuration
  ssh: {
    host: process.env.SSH_HOST,
    username: process.env.SSH_USERNAME,
    port: parseInt(process.env.SSH_PORT) || 22,
    privateKey: sshPrivateKey,
    privateKeyPath: process.env.SSH_PRIVATE_KEY_PATH,
    connectTimeout: parseInt(process.env.SSH_CONNECT_TIMEOUT) || 10000,
    keepaliveInterval: parseInt(process.env.SSH_KEEPALIVE_INTERVAL) || 30000
  },
  
  // Frontend URL for CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
};