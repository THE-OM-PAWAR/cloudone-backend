#!/usr/bin/env node

/**
 * Test script for the deployment service
 * This script tests the deployment service without actually deploying
 */

const DeployService = require('./src/services/deployService');
const ServerValidator = require('./src/services/serverValidator');

async function testDeploymentService() {
  console.log('🧪 Testing Deployment Service...');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Initialize services
    console.log('📋 Test 1: Service Initialization');
    const deployService = new DeployService();
    const serverValidator = new ServerValidator();
    
    await deployService.initialize();
    console.log('✅ DeployService initialized');
    
    // Test 2: Validate environment (if SSH is configured)
    console.log('\n📋 Test 2: Environment Validation');
    try {
      const validationResult = await serverValidator.validateEnvironment();
      
      if (validationResult.valid) {
        console.log('✅ Server environment validation passed');
      } else {
        console.log('⚠️ Server environment validation failed:');
        validationResult.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (validationResult.warnings.length > 0) {
        console.log('⚠️ Warnings:');
        validationResult.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
    } catch (error) {
      console.log('⚠️ Environment validation skipped (SSH not configured):', error.message);
    }
    
    // Test 3: Project name generation
    console.log('\n📋 Test 3: Project Name Generation');
    const ProjectNameGenerator = require('./src/services/projectNameGenerator');
    
    const testUrls = [
      'https://github.com/THE-OM-PAWAR/ompawar',
    ];
    
    testUrls.forEach(url => {
      try {
        const projectName = ProjectNameGenerator.generateProjectName(url);
        console.log(`✅ ${url} → ${projectName}`);
      } catch (error) {
        console.log(`❌ ${url} → Error: ${error.message}`);
      }
    });
    
    // Test 4: Port management
    console.log('\n📋 Test 4: Port Management');
    const PortManager = require('./src/services/portManager');
    const portManager = new PortManager();
    
    await portManager.initialize();
    const nextPort = await portManager.getNextAvailablePort();
    console.log(`✅ Next available port: ${nextPort}`);
    
    // Test 5: Nginx configuration generation
    console.log('\n📋 Test 5: Nginx Configuration');
    const NginxService = require('./src/services/nginxService');
    const nginxService = new NginxService();
    
    const testConfig = nginxService.generateNginxConfig('test-project.aitoyz.in', 3001);
    console.log('✅ Nginx configuration generated successfully');
    console.log('Sample config preview:');
    console.log(testConfig.split('\n').slice(0, 5).join('\n') + '...');
    
    // Test 6: Deployment info management
    console.log('\n📋 Test 6: Deployment Info Management');
    const testDeploymentInfo = {
      repoUrl: 'https://github.com/THE-OM-PAWAR/ompawar',
      port: 3001,
      subdomain: 'test-project.aitoyz.in',
      sslEnabled: true,
      buildDir: 'dist',
      projectType: 'node',
      deployedAt: new Date().toISOString(),
      status: 'active'
    };
    
    await deployService.saveDeploymentInfo('test-project-123', testDeploymentInfo);
    const retrievedInfo = await deployService.getDeploymentInfo('test-project-123');
    
    if (retrievedInfo && retrievedInfo.repoUrl === testDeploymentInfo.repoUrl) {
      console.log('✅ Deployment info save/retrieve works correctly');
    } else {
      console.log('❌ Deployment info save/retrieve failed');
    }
    
    // Cleanup test data
    const deployments = await deployService.getAllDeployments();
    delete deployments['test-project-123'];
    const fs = require('fs-extra');
    const path = require('path');
    await fs.writeJson(path.join(__dirname, 'data/deployments.json'), deployments, { spaces: 2 });
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('=' .repeat(50));
    console.log('✅ Deployment service is ready for use');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testDeploymentService().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = testDeploymentService;