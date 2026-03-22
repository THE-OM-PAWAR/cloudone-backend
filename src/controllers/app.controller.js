const App = require('../../models/App');
const AppDeployment = require('../../models/AppDeployment');
const DockerService = require('../services/dockerService');
const PortManager = require('../services/portManager');
const NginxService = require('../services/nginxService');

const dockerService = new DockerService();
const portManager = new PortManager();
const nginxService = new NginxService();

class AppController {
  /**
   * Create new app (Admin only)
   */
  async createApp(req, res) {
    try {
      const appData = req.body;

      // Validate required fields
      if (!appData.name || !appData.slug || !appData.deploymentType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, slug, deploymentType'
        });
      }

      // Check if slug already exists
      const existingApp = await App.findOne({ slug: appData.slug });
      if (existingApp) {
        return res.status(400).json({
          success: false,
          message: 'App with this slug already exists'
        });
      }

      // Create app
      const app = await App.create(appData);

      res.status(201).json({
        success: true,
        message: 'App created successfully',
        app
      });
    } catch (error) {
      console.error('Create app error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create app',
        error: error.message
      });
    }
  }

  /**
   * Get all apps (Admin)
   */
  async getAllAppsAdmin(req, res) {
    try {
      const apps = await App.find().sort({ createdAt: -1 });

      res.json({
        success: true,
        count: apps.length,
        apps
      });
    } catch (error) {
      console.error('Get apps error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch apps',
        error: error.message
      });
    }
  }

  /**
   * Update app (Admin only)
   */
  async updateApp(req, res) {
    try {
      const { slug } = req.params;
      const updates = req.body;

      const app = await App.findOneAndUpdate(
        { slug },
        updates,
        { new: true, runValidators: true }
      );

      if (!app) {
        return res.status(404).json({
          success: false,
          message: 'App not found'
        });
      }

      res.json({
        success: true,
        message: 'App updated successfully',
        app
      });
    } catch (error) {
      console.error('Update app error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update app',
        error: error.message
      });
    }
  }

  /**
   * Delete app (Admin only)
   */
  async deleteApp(req, res) {
    try {
      const { slug } = req.params;

      const app = await App.findOneAndDelete({ slug });

      if (!app) {
        return res.status(404).json({
          success: false,
          message: 'App not found'
        });
      }

      res.json({
        success: true,
        message: 'App deleted successfully'
      });
    } catch (error) {
      console.error('Delete app error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete app',
        error: error.message
      });
    }
  }

  /**
   * Get all apps (Public marketplace)
   */
  async getMarketplaceApps(req, res) {
    try {
      const { category } = req.query;

      const query = { isActive: true };
      if (category) {
        query.category = category;
      }

      const apps = await App.find(query)
        .select('-composeYaml') // Don't expose compose yaml publicly
        .sort({ deployCount: -1, createdAt: -1 });

      res.json({
        success: true,
        count: apps.length,
        apps
      });
    } catch (error) {
      console.error('Get marketplace apps error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch marketplace apps',
        error: error.message
      });
    }
  }

  /**
   * Get single app details
   */
  async getAppBySlug(req, res) {
    try {
      const { slug } = req.params;

      const app = await App.findOne({ slug, isActive: true })
        .select('-composeYaml'); // Don't expose compose yaml publicly

      if (!app) {
        return res.status(404).json({
          success: false,
          message: 'App not found'
        });
      }

      res.json({
        success: true,
        app
      });
    } catch (error) {
      console.error('Get app error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch app',
        error: error.message
      });
    }
  }

  /**
   * Deploy app
   */
  async deployApp(req, res) {
    try {
      const { slug } = req.params;
      const { projectName, envVars = {} } = req.body;
      const userId = req.user.id;

      // Validate project name
      if (!projectName || !/^[a-z0-9-]+$/.test(projectName)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project name. Use only lowercase letters, numbers, and hyphens.'
        });
      }

      // Get app config
      const app = await App.findOne({ slug, isActive: true });
      if (!app) {
        return res.status(404).json({
          success: false,
          message: 'App not found'
        });
      }

      // Check if project name already exists
      const existingDeployment = await AppDeployment.findOne({ projectName });
      if (existingDeployment) {
        return res.status(400).json({
          success: false,
          message: 'Project name already exists. Please choose another name.'
        });
      }

      // Validate required environment variables (skip those with default placeholder values)
      const requiredEnvVars = app.env.filter(e => e.required);
      for (const envVar of requiredEnvVars) {
        const userValue = envVars[envVar.key];
        const defaultValue = envVar.value;
        
        // Skip validation if:
        // 1. User provided a value
        // 2. Default value is a placeholder ({{...}})
        // 3. Default value exists and is not empty
        const hasUserValue = userValue && userValue.trim();
        const hasPlaceholder = defaultValue && typeof defaultValue === 'string' && defaultValue.includes('{{');
        const hasDefaultValue = defaultValue && typeof defaultValue === 'string' && defaultValue.trim();
        
        if (!hasUserValue && !hasPlaceholder && !hasDefaultValue) {
          return res.status(400).json({
            success: false,
            message: `Missing required environment variable: ${envVar.key}`
          });
        }
      }

      // Check Docker availability
      await dockerService.checkDockerAvailability();

      // Allocate port
      const port = await portManager.getNextAvailablePort();
      await portManager.reservePort(projectName, port);

      // Generate subdomain
      const subdomain = projectName;
      const containerName = `app-${projectName}`;

      // Create deployment record
      const deployment = await AppDeployment.create({
        app: app._id,
        user: userId,
        projectName,
        subdomain,
        port,
        containerName,
        status: 'deploying',
        env: envVars,
        resources: app.resources
      });

      // Start deployment asynchronously
      this.performDeployment(deployment, app, envVars, port, containerName)
        .catch(error => {
          console.error('Deployment error:', error);
        });

      res.status(202).json({
        success: true,
        message: 'Deployment started',
        deployment: {
          id: deployment._id,
          projectName,
          subdomain,
          port,
          status: 'deploying'
        }
      });
    } catch (error) {
      console.error('Deploy app error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start deployment',
        error: error.message
      });
    }
  }

  /**
   * Perform actual deployment (async)
   */
  async performDeployment(deployment, app, envVars, port, containerName) {
    try {
      console.log(`🚀 Starting deployment for: ${deployment.projectName}`);

      // Create project directory
      const projectPath = await dockerService.createProjectDirectory(deployment.projectName);

      // Prepare environment variables with domain substitution
      const domain = `${deployment.subdomain}.aitoyz.in`;
      const finalEnvVars = {};
      
      app.env.forEach(envDef => {
        let value = envVars[envDef.key] || envDef.value || '';
        
        // Replace {{DOMAIN}} placeholder with actual domain
        if (typeof value === 'string') {
          value = value.replace(/\{\{DOMAIN\}\}/g, `https://${domain}`);
          value = value.replace(/\{\{SUBDOMAIN\}\}/g, deployment.subdomain);
          value = value.replace(/\{\{PORT\}\}/g, port.toString());
        }
        
        finalEnvVars[envDef.key] = value;
      });

      if (app.deploymentType === 'docker') {
        // Pull Docker image
        await dockerService.pullImage(app.dockerImage);

        // Deploy container
        await dockerService.deployDockerContainer({
          containerName,
          imageName: app.dockerImage,
          port,
          defaultPort: app.defaultPort,
          cpu: app.resources.cpu,
          memory: app.resources.memory,
          envVars: finalEnvVars,
          projectPath
        });
      } else if (app.deploymentType === 'compose') {
        // Deploy with Docker Compose
        await dockerService.deployDockerCompose({
          projectName: deployment.projectName,
          projectPath,
          composeYaml: app.composeYaml,
          envVars: finalEnvVars
        });
      }

      // Configure Nginx with complete setup (config + enable + test + reload + SSL)
      console.log('🌐 Configuring Nginx with SSL...');
      const nginxResult = await nginxService.setupNginx(deployment.subdomain, port);
      
      // Update deployment status
      deployment.status = 'running';
      deployment.url = nginxResult.sslEnabled 
        ? `https://${nginxResult.subdomain}` 
        : `http://${nginxResult.subdomain}`;
      deployment.sslEnabled = nginxResult.sslEnabled;
      await deployment.save();

      // Increment app deploy count
      await app.incrementDeployCount();

      console.log(`✅ Deployment successful: ${deployment.projectName}`);
    } catch (error) {
      console.error(`❌ Deployment failed: ${error.message}`);

      // Update deployment status
      deployment.status = 'failed';
      deployment.errorMessage = error.message;
      await deployment.save();

      // Cleanup
      await dockerService.removeContainer(containerName).catch(() => {});
      await portManager.releasePort(deployment.projectName).catch(() => {});
    }
  }

  /**
   * Get user's app deployments
   */
  async getUserDeployments(req, res) {
    try {
      const userId = req.user.id;

      const deployments = await AppDeployment.find({ user: userId })
        .populate('app', 'name slug logo category')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: deployments.length,
        deployments
      });
    } catch (error) {
      console.error('Get deployments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch deployments',
        error: error.message
      });
    }
  }

  /**
   * Get deployment details
   */
  async getDeploymentDetails(req, res) {
    try {
      const { projectName } = req.params;
      const userId = req.user.id;

      const deployment = await AppDeployment.findOne({
        projectName,
        user: userId
      }).populate('app', 'name slug logo category');

      if (!deployment) {
        return res.status(404).json({
          success: false,
          message: 'Deployment not found'
        });
      }

      // Get container status
      const containerStatus = await dockerService.getContainerStatus(deployment.containerName);

      res.json({
        success: true,
        deployment: {
          ...deployment.toObject(),
          containerStatus
        }
      });
    } catch (error) {
      console.error('Get deployment details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch deployment details',
        error: error.message
      });
    }
  }

  /**
   * Stop deployment
   */
  async stopDeployment(req, res) {
    try {
      const { projectName } = req.params;
      const userId = req.user.id;

      const deployment = await AppDeployment.findOne({
        projectName,
        user: userId
      });

      if (!deployment) {
        return res.status(404).json({
          success: false,
          message: 'Deployment not found'
        });
      }

      await dockerService.stopContainer(deployment.containerName);

      deployment.status = 'stopped';
      await deployment.save();

      res.json({
        success: true,
        message: 'Deployment stopped successfully'
      });
    } catch (error) {
      console.error('Stop deployment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop deployment',
        error: error.message
      });
    }
  }

  /**
   * Start deployment
   */
  async startDeployment(req, res) {
    try {
      const { projectName } = req.params;
      const userId = req.user.id;

      const deployment = await AppDeployment.findOne({
        projectName,
        user: userId
      });

      if (!deployment) {
        return res.status(404).json({
          success: false,
          message: 'Deployment not found'
        });
      }

      await dockerService.startContainer(deployment.containerName);

      deployment.status = 'running';
      await deployment.save();

      res.json({
        success: true,
        message: 'Deployment started successfully'
      });
    } catch (error) {
      console.error('Start deployment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start deployment',
        error: error.message
      });
    }
  }

  /**
   * Delete deployment
   */
  /**
   * Delete deployment completely
   * @param {string} projectName - Project name
   * @param {string} userId - User ID
   */
  async deleteDeployment(req, res) {
    try {
      const { projectName } = req.params;
      const userId = req.user.id;

      console.log(`🗑️ Starting complete deletion for: ${projectName}`);

      const deployment = await AppDeployment.findOne({
        projectName,
        user: userId
      });

      if (!deployment) {
        return res.status(404).json({
          success: false,
          message: 'Deployment not found'
        });
      }

      // Step 1: Stop and remove Docker container
      console.log('Step 1: Removing Docker container...');
      try {
        await dockerService.removeContainer(deployment.containerName);
      } catch (error) {
        console.warn(`Container removal warning: ${error.message}`);
      }

      // Step 2: Remove Nginx config and SSL certificate
      console.log('Step 2: Cleaning up Nginx and SSL...');
      try {
        await nginxService.cleanupNginx(deployment.subdomain);
      } catch (error) {
        console.warn(`Nginx cleanup warning: ${error.message}`);
      }

      // Step 3: Remove project directory
      console.log('Step 3: Removing project directory...');
      try {
        await dockerService.removeProjectDirectory(projectName);
      } catch (error) {
        console.warn(`Directory removal warning: ${error.message}`);
      }

      // Step 4: Release port
      console.log('Step 4: Releasing port...');
      try {
        await portManager.releasePort(projectName);
      } catch (error) {
        console.warn(`Port release warning: ${error.message}`);
      }

      // Step 5: Delete deployment record from MongoDB
      console.log('Step 5: Removing database record...');
      await AppDeployment.findByIdAndDelete(deployment._id);

      console.log(`✅ Complete deletion finished for: ${projectName}`);

      res.json({
        success: true,
        message: 'Deployment deleted successfully'
      });
    } catch (error) {
      console.error('Delete deployment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete deployment',
        error: error.message
      });
    }
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(req, res) {
    try {
      const { projectName } = req.params;
      const userId = req.user.id;
      const { lines = 100 } = req.query;

      const deployment = await AppDeployment.findOne({
        projectName,
        user: userId
      });

      if (!deployment) {
        return res.status(404).json({
          success: false,
          message: 'Deployment not found'
        });
      }

      const logs = await dockerService.getContainerLogs(deployment.containerName, lines);

      res.json({
        success: true,
        logs
      });
    } catch (error) {
      console.error('Get logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch logs',
        error: error.message
      });
    }
  }
}

module.exports = AppController;
