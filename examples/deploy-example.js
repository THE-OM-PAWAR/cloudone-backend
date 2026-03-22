const axios = require('axios');

/**
 * Example: Deploy a React application
 */
async function deployReactApp() {
  try {
    console.log('🚀 Deploying React application...');
    
    const response = await axios.post('http://localhost:5000/api/deploy', {
      repoUrl: 'https://github.com/facebook/create-react-app'
    });
    
    console.log('✅ Deployment successful!');
    console.log('📊 Deployment Details:');
    console.log(`   Project Name: ${response.data.projectName}`);
    console.log(`   URL: ${response.data.url}`);
    console.log(`   Port: ${response.data.port}`);
    console.log(`   SSL Enabled: ${response.data.sslEnabled}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Deployment failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example: Deploy a Vite application
 */
async function deployViteApp() {
  try {
    console.log('🚀 Deploying Vite application...');
    
    const response = await axios.post('http://localhost:5000/api/deploy', {
      repoUrl: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react'
    });
    
    console.log('✅ Deployment successful!');
    console.log('📊 Deployment Details:');
    console.log(`   Project Name: ${response.data.projectName}`);
    console.log(`   URL: ${response.data.url}`);
    console.log(`   Port: ${response.data.port}`);
    console.log(`   SSL Enabled: ${response.data.sslEnabled}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Deployment failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example: Get all deployments
 */
async function getAllDeployments() {
  try {
    console.log('📋 Fetching all deployments...');
    
    const response = await axios.get('http://localhost:5000/api/deploy');
    
    console.log('✅ Deployments retrieved:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch deployments:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example: Delete a deployment
 */
async function deleteDeployment(projectName) {
  try {
    console.log(`🗑️ Deleting deployment: ${projectName}...`);
    
    const response = await axios.delete(`http://localhost:5000/api/deploy/${projectName}`);
    
    console.log('✅ Deployment deleted successfully!');
    console.log(response.data.message);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to delete deployment:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example: Complete deployment workflow
 */
async function completeWorkflowExample() {
  try {
    console.log('🔄 Starting complete deployment workflow...\n');
    
    // Step 1: Deploy an application
    const deployment = await deployReactApp();
    const projectName = deployment.projectName;
    
    console.log('\n⏳ Waiting 5 seconds before checking status...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 2: Check deployment status
    console.log('\n📊 Checking deployment status...');
    const statusResponse = await axios.get(`http://localhost:5000/api/deploy/${projectName}/status`);
    console.log('Status:', statusResponse.data);
    
    // Step 3: Get deployment info
    console.log('\n📋 Getting deployment info...');
    const infoResponse = await axios.get(`http://localhost:5000/api/deploy/${projectName}`);
    console.log('Info:', infoResponse.data);
    
    // Step 4: List all deployments
    console.log('\n📝 Listing all deployments...');
    await getAllDeployments();
    
    console.log('\n🎉 Workflow completed successfully!');
    console.log(`\n🌐 Your application is live at: ${deployment.url}`);
    
    // Uncomment the line below if you want to clean up the deployment
    // await deleteDeployment(projectName);
    
  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
  }
}

// Export functions for use in other modules
module.exports = {
  deployReactApp,
  deployViteApp,
  getAllDeployments,
  deleteDeployment,
  completeWorkflowExample
};

// Run complete workflow if this file is executed directly
if (require.main === module) {
  completeWorkflowExample();
}