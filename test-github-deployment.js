require('dotenv').config();
const mongoose = require('mongoose');
const githubDeployService = require('./src/services/githubDeploy.service');
const User = require('./models/User');

/**
 * Test script for GitHub deployment
 * Usage: node test-github-deployment.js <clerkId> <repoOwner> <repoName> <branch>
 */

async function testDeployment() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('\n❌ Usage: node test-github-deployment.js <clerkId> <repoOwner> <repoName> [branch]');
    console.log('\nExample: node test-github-deployment.js user_123 myusername my-repo main\n');
    process.exit(1);
  }

  const [clerkId, repoOwner, repoName, branch = 'main'] = args;

  try {
    console.log('\n🚀 Testing GitHub Deployment\n');
    console.log('='.repeat(50));
    console.log(`Clerk ID: ${clerkId}`);
    console.log(`Repository: ${repoOwner}/${repoName}`);
    console.log(`Branch: ${branch}`);
    console.log('='.repeat(50) + '\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-deploy');
    console.log('✅ Connected to MongoDB\n');

    // Check if user exists and has GitHub connected
    const user = await User.findOne({ clerkId }).select('+githubAccessToken');
    
    if (!user) {
      console.log('❌ User not found with Clerk ID:', clerkId);
      process.exit(1);
    }

    if (!user.githubConnected || !user.githubAccessToken) {
      console.log('❌ GitHub account not connected for this user');
      console.log('   Please connect GitHub account first via the API');
      process.exit(1);
    }

    console.log(`✅ User found: ${user.email}`);
    console.log(`✅ GitHub connected as: ${user.githubUsername}\n`);

    // Start deployment
    console.log('🔄 Starting deployment...\n');

    const result = await githubDeployService.deployRepository(
      clerkId,
      { repoOwner, repoName, branch },
      null, // No Socket.IO for testing
      null
    );

    console.log('\n' + '='.repeat(50));
    console.log('✅ Deployment completed successfully!');
    console.log('='.repeat(50));
    console.log('\nProject Details:');
    console.log(`  ID: ${result.project.id}`);
    console.log(`  Name: ${result.project.name}`);
    console.log(`  Status: ${result.project.status}`);
    console.log(`  URL: ${result.project.deployedUrl}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('\nError details:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB\n');
  }
}

testDeployment();
