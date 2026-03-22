const DeployService = require('../services/deployService');
const Project = require('../../models/Project');
const User = require('../../models/User');

class DeployController {
  constructor(io = null) {
    this.deployService = new DeployService(io);
  }

  /**
   * Deploy a new application (Public Repo Flow)
   */
  async deployApplication(req, res) {
    try {
      const { repoUrl, siteName } = req.body;
      const clerkId = req.user.clerkId; // From auth middleware (Clerk ID)
      
      console.log('🚀 Public repo deployment request received:', { repoUrl, siteName, clerkId });
      
      // Validate request body
      if (!repoUrl) {
        return res.status(400).json({
          status: 'error',
          message: 'Repository URL is required'
        });
      }
      
      if (typeof repoUrl !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Repository URL must be a string'
        });
      }

      // Extract repoOwner and repoName from GitHub URL
      const githubUrlRegex = /github\.com\/([^\/]+)\/([^\/\.]+)/;
      const match = repoUrl.match(githubUrlRegex);
      
      if (!match) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid GitHub repository URL format'
        });
      }
      
      const repoOwner = match[1];
      const repoName = match[2];
      
      console.log(`📦 Extracted: ${repoOwner}/${repoName}`);

      // Validate siteName if provided
      if (siteName && typeof siteName !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Site name must be a string'
        });
      }

      if (siteName && !/^[a-z0-9-]+$/.test(siteName)) {
        return res.status(400).json({
          status: 'error',
          message: 'Site name can only contain lowercase letters, numbers, and hyphens'
        });
      }

      // Check if subdomain already exists
      if (siteName) {
        const existingProject = await Project.findOne({ subdomain: siteName });
        if (existingProject) {
          return res.status(400).json({
            status: 'error',
            message: 'This subdomain is already taken. Please choose another name.'
          });
        }
      }
      
      // Get user from database
      const user = await User.findOne({ clerkId });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      console.log(`🚀 Starting deployment for: ${repoUrl}`);
      if (siteName) {
        console.log(`📝 Custom site name: ${siteName}`);
      }
      
      // Generate deployment ID
      const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Create project in database with ALL required fields
      const project = await Project.create({
        name: siteName || repoName,
        repoOwner,
        repoName,
        branch: 'main',
        repositoryUrl: repoUrl,
        subdomain: siteName || `${repoName}-${Date.now()}`,
        port: 0, // Will be assigned during deployment
        status: 'pending',
        owner: user._id,
        userId: clerkId
      });

      console.log('✅ Project created in database:', project._id);
      
      // Return deployment ID immediately for real-time tracking
      res.status(202).json({
        status: 'started',
        deploymentId,
        projectId: project._id,
        message: 'Deployment started. Use the deploymentId to track progress via WebSocket.'
      });
      
      // Start deployment asynchronously
      this.deployService.deployApplication(repoUrl, siteName, deploymentId)
        .then(async (result) => {
          console.log('✅ Deployment completed successfully:', result);
          
          // Update project with deployment results
          await Project.findByIdAndUpdate(project._id, {
            port: result.port,
            subdomain: result.subdomain,
            deployedUrl: result.url,
            status: 'deployed',
            updatedAt: new Date()
          });
          
          console.log('✅ Project updated with deployment info');
        })
        .catch(async (error) => {
          console.error('❌ Deployment error:', error.message);
          
          // Update project status to failed
          await Project.findByIdAndUpdate(project._id, {
            status: 'failed',
            updatedAt: new Date()
          });
        });
      
    } catch (error) {
      console.error('❌ Deployment error:', error.message);
      console.error('❌ Stack trace:', error.stack);
      
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get all deployments for the authenticated user
   */
  async getAllDeployments(req, res) {
    try {
      const clerkId = req.user.clerkId;
      
      // Get user from database
      const user = await User.findOne({ clerkId });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // Get projects from MongoDB for this user
      const projects = await Project.find({ owner: user._id })
        .sort({ createdAt: -1 })
        .select('-__v');
      
      res.status(200).json({
        status: 'success',
        projects
      });
      
    } catch (error) {
      console.error('❌ Error fetching deployments:', error.message);
      
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Get specific deployment info (only if user owns it)
   */
  async getDeploymentInfo(req, res) {
    try {
      const { projectName } = req.params;
      const clerkId = req.user.clerkId;
      
      // Get user from database
      const user = await User.findOne({ clerkId });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // Find project by subdomain and verify ownership
      const project = await Project.findOne({ 
        subdomain: projectName,
        owner: user._id 
      });
      
      if (!project) {
        return res.status(404).json({
          status: 'error',
          message: 'Project not found or you do not have access'
        });
      }
      
      res.status(200).json({
        status: 'success',
        project
      });
      
    } catch (error) {
      console.error('❌ Error fetching deployment info:', error.message);
      
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Delete a deployment (only if user owns it)
   */
  async deleteDeployment(req, res) {
    try {
      const { projectName } = req.params;
      const clerkId = req.user.clerkId;
      
      // Get user from database
      const user = await User.findOne({ clerkId });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // Find and verify ownership
      const project = await Project.findOne({ 
        subdomain: projectName,
        owner: user._id 
      });
      
      if (!project) {
        return res.status(404).json({
          status: 'error',
          message: 'Project not found or you do not have access'
        });
      }
      
      // Delete from deployment service
      await this.deployService.deleteDeployment(projectName);
      
      // Delete project from database
      await Project.findByIdAndDelete(project._id);
      
      res.status(200).json({
        status: 'success',
        message: `Project ${projectName} deleted successfully`
      });
      
    } catch (error) {
      console.error('❌ Error deleting deployment:', error.message);
      
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Redeploy an existing application (only if user owns it)
   */
  async redeployApplication(req, res) {
    try {
      const { projectName } = req.params;
      const clerkId = req.user.clerkId;
      
      // Get user from database
      const user = await User.findOne({ clerkId });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // Find and verify ownership
      const project = await Project.findOne({ 
        subdomain: projectName,
        owner: user._id 
      });
      
      if (!project) {
        return res.status(404).json({
          status: 'error',
          message: 'Project not found or you do not have access'
        });
      }
      
      // Update status to deploying
      project.status = 'deploying';
      await project.save();
      
      // Delete existing deployment
      await this.deployService.deleteDeployment(projectName);
      
      // Redeploy with same repository URL
      const result = await this.deployService.deployApplication(
        project.repositoryUrl,
        project.subdomain
      );
      
      // Update project with new deployment info
      project.port = result.port;
      project.status = 'deployed';
      project.updatedAt = new Date();
      await project.save();
      
      res.status(200).json({
        status: 'success',
        message: 'Redeployment completed successfully',
        project
      });
      
    } catch (error) {
      console.error('❌ Redeployment error:', error.message);
      
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * Get deployment status (only if user owns it)
   */
  async getDeploymentStatus(req, res) {
    try {
      const { projectName } = req.params;
      const clerkId = req.user.clerkId;
      
      // Get user from database
      const user = await User.findOne({ clerkId });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // Find and verify ownership
      const project = await Project.findOne({ 
        subdomain: projectName,
        owner: user._id 
      });
      
      if (!project) {
        return res.status(404).json({
          status: 'error',
          message: 'Project not found or you do not have access'
        });
      }
      
      const platformDomain = process.env.PLATFORM_DOMAIN || 'aitoyz.in';
      
      res.status(200).json({
        status: 'success',
        projectName: project.name,
        deploymentStatus: project.status,
        url: `https://${project.subdomain}.${platformDomain}`,
        port: project.port,
        deployedAt: project.createdAt
      });
      
    } catch (error) {
      console.error('❌ Error checking deployment status:', error.message);
      
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = DeployController;