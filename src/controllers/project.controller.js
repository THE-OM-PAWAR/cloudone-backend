const githubDeployService = require('../services/githubDeploy.service');
const Project = require('../../models/Project');
const User = require('../../models/User');

class ProjectController {
  async deployProject(req, res) {
    try {
      const { repoOwner, repoName, branch, subdomain } = req.body;

      if (!repoOwner || !repoName) {
        return res.status(400).json({
          success: false,
          message: 'Repository owner and name are required'
        });
      }

      // Get socket.io instance from app
      const io = req.app.get('io');
      const socketId = req.headers['x-socket-id'];

      // Start deployment asynchronously
      githubDeployService.deployRepository(
        req.user.clerkId,
        { repoOwner, repoName, branch: branch || 'main', subdomain },
        io,
        socketId
      ).catch(error => {
        console.error('Deployment failed:', error);
      });

      res.json({
        success: true,
        message: 'Deployment started',
        status: 'deploying'
      });

    } catch (error) {
      console.error('Error starting deployment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start deployment',
        error: error.message
      });
    }
  }

  async getProjects(req, res) {
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
        .select('-deploymentLogs');

      res.json({
        success: true,
        projects
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch projects',
        error: error.message
      });
    }
  }

  async getProject(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findOne({ clerkId: req.user.clerkId });

      const project = await Project.findOne({
        _id: id,
        owner: user._id
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      res.json({
        success: true,
        project
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project',
        error: error.message
      });
    }
  }

  async getDeploymentLogs(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findOne({ clerkId: req.user.clerkId });

      const project = await Project.findOne({
        _id: id,
        owner: user._id
      }).select('deploymentLogs');

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      res.json({
        success: true,
        logs: project.deploymentLogs
      });
    } catch (error) {
      console.error('Error fetching deployment logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch deployment logs',
        error: error.message
      });
    }
  }

  async stopProject(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findOne({ clerkId: req.user.clerkId });

      const project = await Project.findOne({
        _id: id,
        owner: user._id
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const result = await githubDeployService.stopDeployment(id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error stopping project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop project',
        error: error.message
      });
    }
  }

  async restartProject(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findOne({ clerkId: req.user.clerkId });

      const project = await Project.findOne({
        _id: id,
        owner: user._id
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const result = await githubDeployService.restartDeployment(id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error restarting project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restart project',
        error: error.message
      });
    }
  }

  async deleteProject(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findOne({ clerkId: req.user.clerkId });

      const project = await Project.findOne({
        _id: id,
        owner: user._id
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const result = await githubDeployService.deleteDeployment(id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project',
        error: error.message
      });
    }
  }
}

module.exports = new ProjectController();
