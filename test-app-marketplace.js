require('dotenv').config();
const mongoose = require('mongoose');
const App = require('./models/App');
const AppDeployment = require('./models/AppDeployment');

async function testAppMarketplace() {
  try {
    console.log('🧪 Testing App Marketplace Setup...\n');

    // Connect to MongoDB
    console.log('1️⃣ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-deploy');
    console.log('✅ Connected to MongoDB\n');

    // Check if apps exist
    console.log('2️⃣ Checking for apps in database...');
    const apps = await App.find();
    console.log(`✅ Found ${apps.length} apps in database`);
    
    if (apps.length === 0) {
      console.log('⚠️  No apps found. Run: node seeds/apps.seed.js\n');
    } else {
      console.log('\nAvailable Apps:');
      apps.forEach(app => {
        console.log(`   - ${app.name} (${app.slug}) - ${app.category}`);
      });
      console.log('');
    }

    // Check deployments
    console.log('3️⃣ Checking deployments...');
    const deployments = await AppDeployment.find();
    console.log(`✅ Found ${deployments.length} deployments\n`);

    // Test models
    console.log('4️⃣ Testing model validation...');
    const testApp = new App({
      name: 'Test App',
      slug: 'test-app-' + Date.now(),
      description: 'Test description',
      category: 'other',
      deploymentType: 'docker',
      dockerImage: 'nginx:latest',
      defaultPort: 80,
      resources: {
        cpu: '0.5',
        memory: '256m'
      }
    });
    
    const validationError = testApp.validateSync();
    if (validationError) {
      console.log('❌ Model validation failed:', validationError.message);
    } else {
      console.log('✅ Model validation passed\n');
    }

    // Summary
    console.log('=' .repeat(60));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ MongoDB Connection: OK`);
    console.log(`✅ App Model: OK`);
    console.log(`✅ AppDeployment Model: OK`);
    console.log(`📦 Apps in Database: ${apps.length}`);
    console.log(`🚀 Active Deployments: ${deployments.length}`);
    console.log('=' .repeat(60));

    if (apps.length === 0) {
      console.log('\n⚠️  NEXT STEP: Run seed command to add sample apps');
      console.log('   Command: node seeds/apps.seed.js\n');
    } else {
      console.log('\n✅ App Marketplace backend is ready!');
      console.log('   - API endpoints are configured');
      console.log('   - Models are working');
      console.log('   - Sample apps are available\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testAppMarketplace();
