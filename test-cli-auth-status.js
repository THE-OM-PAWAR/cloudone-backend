const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const sessionId = process.argv[2];

if (!sessionId) {
  console.error('❌ Please provide session ID as argument');
  console.error('   Usage: node test-cli-auth-status.js <SESSION_ID>');
  process.exit(1);
}

async function checkStatus() {
  console.log('🔍 Checking authentication status...\n');

  try {
    const response = await axios.get(`${API_URL}/api/cli/auth/status`, {
      params: { sessionId }
    });

    console.log('Status:', response.data.status);
    
    if (response.data.status === 'authenticated') {
      console.log('✅ Authentication successful!');
      console.log('\n🔑 CLI Token:');
      console.log(response.data.token);
      console.log('\n📝 Save this token and use it for CLI requests:');
      console.log(`   Authorization: Bearer ${response.data.token}`);
      console.log('\n🧪 Test the token:');
      console.log(`   curl -H "Authorization: Bearer ${response.data.token}" ${API_URL}/api/cli/github/repos`);
    } else if (response.data.status === 'pending') {
      console.log('⏳ Still waiting for authentication...');
      console.log('   Please complete authentication in your browser');
    } else {
      console.log('❌ Authentication failed or expired');
      console.log('   Message:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

checkStatus();
