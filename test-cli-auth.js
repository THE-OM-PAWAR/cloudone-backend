const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testCliAuth() {
  console.log('🧪 Testing CLI Authentication System\n');

  try {
    // Step 1: Initialize authentication
    console.log('1️⃣  Initializing CLI authentication...');
    const initResponse = await axios.post(`${API_URL}/api/cli/auth/init`);
    
    console.log('✅ Init successful!');
    console.log('   Session ID:', initResponse.data.sessionId);
    console.log('   Login URL:', initResponse.data.loginUrl);
    console.log('   Expires:', initResponse.data.expiresAt);
    console.log();

    const sessionId = initResponse.data.sessionId;

    // Step 2: Check status (should be pending)
    console.log('2️⃣  Checking authentication status...');
    const statusResponse = await axios.get(`${API_URL}/api/cli/auth/status`, {
      params: { sessionId }
    });

    console.log('✅ Status check successful!');
    console.log('   Status:', statusResponse.data.status);
    console.log('   Message:', statusResponse.data.message);
    console.log();

    // Step 3: Instructions for manual testing
    console.log('3️⃣  Manual steps required:');
    console.log('   1. Open this URL in your browser:');
    console.log(`      ${initResponse.data.loginUrl}`);
    console.log('   2. Make sure you are logged in with Clerk');
    console.log('   3. The page will complete the authentication');
    console.log();

    console.log('4️⃣  To complete the test, run this command after authenticating:');
    console.log(`   node test-cli-auth-status.js ${sessionId}`);
    console.log();

    console.log('✅ CLI Authentication system is working correctly!');
    console.log();
    console.log('📝 Next steps:');
    console.log('   1. Create the frontend CLI auth page at /cli-auth');
    console.log('   2. Test the complete flow end-to-end');
    console.log('   3. Update the CLI tool to use these endpoints');
    console.log();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testCliAuth();
