const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testComplete() {
  console.log('🧪 Testing CLI Complete Endpoint\n');

  try {
    // First, get a session
    console.log('1️⃣  Getting session...');
    const initResponse = await axios.post(`${API_URL}/api/cli/auth/init`);
    const { sessionId } = initResponse.data;
    console.log('✅ Session ID:', sessionId);
    console.log();

    // Try to complete without token (should fail with 401)
    console.log('2️⃣  Testing without auth token (should fail)...');
    try {
      await axios.post(`${API_URL}/api/cli/auth/complete`, { sessionId });
      console.log('❌ Should have failed but succeeded!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected (401 Unauthorized)');
      } else {
        console.log('❌ Wrong error:', error.response?.status, error.message);
      }
    }
    console.log();

    // Check if endpoint exists
    console.log('3️⃣  Checking if endpoint exists...');
    try {
      await axios.post(`${API_URL}/api/cli/auth/complete`, { sessionId });
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('❌ ENDPOINT NOT FOUND (404)');
        console.log('   The /api/cli/auth/complete route is not registered!');
        console.log('   Please restart the backend server.');
      } else if (error.response?.status === 401) {
        console.log('✅ Endpoint exists (got 401 as expected)');
      } else {
        console.log('⚠️  Got status:', error.response?.status);
      }
    }
    console.log();

    console.log('📝 Summary:');
    console.log('   - Init endpoint: ✅ Working');
    console.log('   - Complete endpoint: Check above');
    console.log();
    console.log('💡 If you see 404, restart the backend:');
    console.log('   cd cloud-plateform-backend');
    console.log('   npm run dev');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Backend is not running!');
      console.error('   Start it with: cd cloud-plateform-backend && npm run dev');
    }
  }
}

testComplete();
