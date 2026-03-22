const githubService = require('../services/github.service');
const User = require('../../models/User');

class GitHubController {
  async initiateOAuth(req, res) {
    try {
      const state = req.user.clerkId;
      const authUrl = githubService.getAuthorizationUrl(state);
      
      res.json({
        success: true,
        authUrl
      });
    } catch (error) {
      console.error('Error initiating GitHub OAuth:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate GitHub authentication',
        error: error.message
      });
    }
  }

  async handleCallback(req, res) {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code not provided'
        });
      }

      // Exchange code for access token
      const accessToken = await githubService.exchangeCodeForToken(code);

      // Fetch GitHub user profile
      const githubProfile = await githubService.getUserProfile(accessToken);

      // Find user by state (clerkId) or by current session
      const clerkId = state || req.user?.clerkId;
      
      if (!clerkId) {
        return res.status(400).json({
          success: false,
          message: 'User session not found'
        });
      }

      // Update user with GitHub credentials
      const user = await User.findOneAndUpdate(
        { clerkId },
        {
          githubUsername: githubProfile.username,
          githubAccessToken: accessToken,
          githubConnected: true
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Redirect to frontend success page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/dashboard?github=connected`);
    } catch (error) {
      console.error('Error handling GitHub callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/dashboard?github=error`);
    }
  }

  async getRepositories(req, res) {
    try {
      const user = await User.findOne({ clerkId: req.user.clerkId }).select('+githubAccessToken');

      if (!user || !user.githubAccessToken) {
        return res.status(400).json({
          success: false,
          message: 'GitHub account not connected'
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

  async getBranches(req, res) {
    try {
      const { owner, repo } = req.params;
      
      const user = await User.findOne({ clerkId: req.user.clerkId }).select('+githubAccessToken');

      if (!user || !user.githubAccessToken) {
        return res.status(400).json({
          success: false,
          message: 'GitHub account not connected'
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

  async disconnectGitHub(req, res) {
    try {
      const user = await User.findOneAndUpdate(
        { clerkId: req.user.clerkId },
        {
          githubUsername: null,
          githubAccessToken: null,
          githubConnected: false
        },
        { new: true }
      );

      res.json({
        success: true,
        message: 'GitHub account disconnected successfully',
        user: {
          githubConnected: user.githubConnected
        }
      });
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect GitHub account',
        error: error.message
      });
    }
  }

  async getConnectionStatus(req, res) {
    try {
      const user = await User.findOne({ clerkId: req.user.clerkId });

      res.json({
        success: true,
        connected: user.githubConnected || false,
        username: user.githubUsername || null
      });
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check GitHub connection status',
        error: error.message
      });
    }
  }
}

module.exports = new GitHubController();
