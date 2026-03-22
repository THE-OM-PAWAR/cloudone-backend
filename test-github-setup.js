require('dotenv').config();
const sshService = require('./src/services/ssh.service');

async function testGitHubSetup() {
  console.log('\n🔍 Testing GitHub Deployment Setup\n');
  console.log('='.repeat(50));

  // Check environment variables
  console.log('\n1. Checking Environment Variables...');
  const requiredEnvVars = [
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_REDIRECT_URI',
    'VPS_HOST',
    'VPS_USER',
    'VPS_KEY_PATH',
    'MONGODB_URI',
    'CLERK_SECRET_KEY'
  ];

  let allEnvVarsPresent = true;
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value !== `your_${varName.toLowerCase()}`) {
      console.log(`   ✅ ${varName}: Set`);
    } else {
      console.log(`   ❌ ${varName}: Missing or not configured`);
      allEnvVarsPresent = false;
    }
  });

  if (!allEnvVarsPresent) {
    console.log('\n⚠️  Please configure all required environment variables in .env file');
  }

  // Test SSH connection
  console.log('\n2. Testing SSH Connection to VPS...');
  try {
    const result = await sshService.checkConnection();
    if (result.success) {
      console.log(`   ✅ ${result.message}`);
    } else {
      console.log(`   ❌ ${result.message}`);
    }
  } catch (error) {
    console.log(`   ❌ SSH connection failed: ${error.message}`);
  }

  // Check SSH key file
  console.log('\n3. Checking SSH Key File...');
  const fs = require('fs');
  const path = require('path');
  const keyPath = path.resolve(process.env.VPS_KEY_PATH || './keys/vps_key2026.pem');
  
  if (fs.existsSync(keyPath)) {
    console.log(`   ✅ SSH key found at: ${keyPath}`);
    
    // Check permissions (Unix-like systems)
    if (process.platform !== 'win32') {
      const stats = fs.statSync(keyPath);
      const mode = (stats.mode & parseInt('777', 8)).toString(8);
      if (mode === '600' || mode === '400') {
        console.log(`   ✅ SSH key permissions: ${mode} (correct)`);
      } else {
        console.log(`   ⚠️  SSH key permissions: ${mode} (should be 600 or 400)`);
        console.log(`      Run: chmod 600 ${keyPath}`);
      }
    }
  } else {
    console.log(`   ❌ SSH key not found at: ${keyPath}`);
  }

  // Test MongoDB connection
  console.log('\n4. Testing MongoDB Connection...');
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-deploy');
    console.log('   ✅ MongoDB connected successfully');
    await mongoose.connection.close();
  } catch (error) {
    console.log(`   ❌ MongoDB connection failed: ${error.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n📋 Setup Summary:');
  console.log('   - Configure GitHub OAuth app at: https://github.com/settings/developers');
  console.log('   - Set callback URL to: ' + (process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/github/callback'));
  console.log('   - Ensure VPS has Node.js, npm, PM2, and Git installed');
  console.log('   - Test deployment with: npm run test:deploy');
  console.log('\n✨ Setup check complete!\n');
}

testGitHubSetup().catch(error => {
  console.error('\n❌ Setup test failed:', error.message);
  process.exit(1);
});
