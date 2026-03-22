require('dotenv').config();
const mongoose = require('mongoose');
const App = require('../models/App');

async function updateApps() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-deploy');
    console.log('✅ Connected to MongoDB');

    // Get all existing apps
    const existingApps = await App.find();
    console.log(`📊 Found ${existingApps.length} existing apps`);

    if (existingApps.length === 0) {
      console.log('⚠️  No apps found. Run: node seeds/apps.seed.js');
      process.exit(0);
    }

    // Update each app
    let updated = 0;
    for (const app of existingApps) {
      console.log(`\n🔄 Updating: ${app.name} (${app.slug})`);
      
      // Ensure all required fields are present
      let needsUpdate = false;
      
      // Check if isActive field exists
      if (app.isActive === undefined) {
        app.isActive = true;
        needsUpdate = true;
        console.log('   ✓ Added isActive field');
      }
      
      // Check if deployCount exists
      if (app.deployCount === undefined) {
        app.deployCount = 0;
        needsUpdate = true;
        console.log('   ✓ Added deployCount field');
      }
      
      // Ensure resources are properly formatted
      if (!app.resources || !app.resources.cpu || !app.resources.memory) {
        app.resources = {
          cpu: app.resources?.cpu || '1.0',
          memory: app.resources?.memory || '512m'
        };
        needsUpdate = true;
        console.log('   ✓ Updated resources');
      }
      
      // Ensure env array exists
      if (!app.env) {
        app.env = [];
        needsUpdate = true;
        console.log('   ✓ Added env array');
      }
      
      // Validate env variables have all required fields
      if (app.env && app.env.length > 0) {
        app.env = app.env.map(envVar => ({
          key: envVar.key || '',
          value: envVar.value || '',
          description: envVar.description || '',
          required: envVar.required !== undefined ? envVar.required : false
        }));
        needsUpdate = true;
        console.log('   ✓ Validated env variables');
      }
      
      if (needsUpdate) {
        await app.save();
        updated++;
        console.log('   ✅ Updated successfully');
      } else {
        console.log('   ℹ️  No updates needed');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total apps: ${existingApps.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Unchanged: ${existingApps.length - updated}`);
    console.log('='.repeat(60));
    
    console.log('\n✅ Update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updateApps();
