const githubService = require('../services/github.service');
const User = require('../../models/User');
const Project = require('../../models/Project');

class CliController {
  /**
   * Get GitHub repositories
   * GET /api/cli/github/repos
   */
  async getRepositories(req, res) {
    try {
      const user = await User.findOne({ clerkId: req.user.clerkId }).select('+githubAccessToken');

      if (!user || !user.githubAccessToken) {
        return res.status(400).json({
          success: false,
          message: 'GitHub account not connected. Please connect your GitHub account first.',
          code: 'GITHUB_NOT_CONNECTED'
        });
      }

      const repositories = await githubService.getUserRepositories(user.githubAccessToken);

      res.json({
        success: true,
        repositories
      });
    } catch (error) {
      console.error('Error fetching repositories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch repositories',
        error: error.message
      });
    }
  }

  /**
   * Get repository branches
   * GET /api/cli/github/repos/:owner/:repo/branches
   */
  async getBranches(req, res) {
    try {
      const { owner, repo } = req.params;
      
      const user = await User.findOne({ clerkId: req.user.clerkId }).select('+githubAccessToken');

      if (!user || !user.githubAccessToken) {
        return res.status(400).json({
          success: false,
          message: 'GitHub account not connected',
          code: 'GITHUB_NOT_CONNECTED'
        });
      }

      const branches = await githubService.getRepositoryBranches(
        user.githubAccessToken,
        owner,
        repo
      );

      res.json({
        success: true,
        branches
      });
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch repository branches',
        error: error.message
      });
    }
  }

  /**
   * Deploy application
   * POST /api/cli/deploy
   */
  async deploy(req, res) {
    try {
      const { repoUrl, siteName, branch } = req.body;

      if (!repoUrl) {
        return res.status(400).json({
          success: false,
          message: 'Repository URL is required'
        });
      }

      // Extract repo owner and name from URL
      const githubUrlRegex = /github\.com\/([^\/]+)\/([^\/\.]+)/;
      const match = repoUrl.match(githubUrlRegex);
      
      if (!match) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GitHub repository URL format'
        });
      }
      
      const repoOwner = match[1];
      const repoName = match[2];

      // Check if subdomain already exists
      if (siteName) {
        const existingProject = await Project.findOne({ subdomain: siteName });
        if (existingProject) {
          return res.status(400).json({
            success: false,
            message: 'This subdomain is already taken. Please choose another name.'
          });
        }
      }

      // Start deployment asynchronously (reuse existing service)
      const githubDeployService = require('../services/githubDeploy.service');
      
      githubDeployService.deployRepository(
        req.user.clerkId,
        {
          repoOwner,
          repoName,
          branch: branch || 'main',
          subdomain: siteName
        },
        null, // No socket.io for CLI
        null  // No socket ID
      ).catch(error => {
        console.error('Deployment failed:', error);
      });

      res.json({
        success: true,
        message: 'Deployment started',
        status: 'deploying',
        repository: `${repoOwner}/${repoName}`
      });

    } catch (error) {
      console.error('Error deploying:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start deployment',
        error: error.message
      });
    }
  }

  /**
   * Get deployment status
   * GET /api/cli/deploy/status/:identifier
   * identifier can be projectId or subdomain
   */
  async getDeploymentStatus(req, res) {
    try {
      const { identifier } = req.params;
      
      // Try to find by ID first, then by subdomain
      let project = await Project.findById(identifier);
      
      if (!project) {
        // Try finding by subdomain
        project = await Project.findOne({ 
          subdomain: identifier,
          userId: req.user.clerkId 
        });
      }

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Deployment not found'
        });
      }

      // Verify ownership
      if (project.userId !== req.user.clerkId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const platformDomain = process.env.PLATFORM_DOMAIN || 'aitoyz.in';

      res.json({
        success: true,
        deployment: {
          id: project._id,
          name: project.name,
          status: project.status,
          subdomain: project.subdomain,
          url: project.status === 'deployed' ? `https://${project.subdomain}.${platformDomain}` : null,
          port: project.port,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          logs: project.deploymentLogs || []
        }
      });

    } catch (error) {
      console.error('Error fetching deployment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch deployment status',
        error: error.message
      });
    }
  }

  /**
   * List all deployments
   * GET /api/cli/deploy
   */
  async listDeployments(req, res) {
    try {
      const user = await User.findOne({ clerkId: req.user.clerkId });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const projects = await Project.find({ owner: user._id })
        .sort({ createdAt: -1 })
        .select('-__v');

      const platformDomain = process.env.PLATFORM_DOMAIN || 'aitoyz.in';

      const deployments = projects.map(project => ({
        id: project._id,
        name: project.name,
        status: project.status,
        subdomain: project.subdomain,
        url: project.status === 'deployed' ? `https://${project.subdomain}.${platformDomain}` : null,
        repository: `${project.repoOwner}/${project.repoName}`,
        branch: project.branch,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }));

      res.json({
        success: true,
        deployments
      });

    } catch (error) {
      console.error('Error listing deployments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list deployments',
        error: error.message
      });
    }
  }
}

module.exports = new CliController();
