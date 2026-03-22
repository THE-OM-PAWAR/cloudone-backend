const SSHClient = require('../../ssh/sshClient');
const githubService = require('./github.service');
const NginxService = require('./nginxService');
const User = require('../../models/User');
const Project = require('../../models/Project');
const crypto = require('crypto');

class GitHubDeployService {
  constructor() {
    this.deploymentDir = process.env.VPS_DEPLOYMENT_DIR || '/home/ubuntu/apps';
    this.basePort = 3001; // Starting port for deployments
    this.nginxService = new NginxService();
    this.platformDomain = process.env.PLATFORM_DOMAIN || 'aitoyz.in';
    this.sshClient = new SSHClient();
  }

  /**
   * Generate a unique subdomain for the project
   */
  generateSubdomain(repoName, userId) {
    const sanitized = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const hash = crypto.createHash('md5').update(userId + repoName + Date.now()).digest('hex').substring(0, 6);
    return `${sanitized}-${hash}`;
  }

  /**
   * Find next available port
   */
  async findAvailablePort() {
    try {
      // Get all deployed projects to find used ports
      const projects = await Project.find({ 
        status: { $in: ['deployed', 'deploying'] },
        port: { $gt: 0 }
      }).sort({ port: -1 }).limit(1);

      if (projects.length === 0) {
        return this.basePort;
      }

      return projects[0].port + 1;
    } catch (error) {
      console.error('Error finding available port:', error);
      return this.basePort;
    }
  }

  /**
   * Detect project type and get appropriate start command
   * @param {string} projectDir - Project directory path
   * @returns {Promise<Object>} Project info with type and commands
   */
  async detectProjectType(projectDir) {
    try {
      // Check if package.json exists
      const checkPackageJson = await this.sshClient.executeCommand(`test -f ${projectDir}/package.json && echo "EXISTS" || echo "NOT_EXISTS"`);
      
      if (checkPackageJson.stdout.trim() !== 'EXISTS') {
        return {
          type: 'static-html',
          description: 'Static HTML/CSS/JS',
          buildCommand: null,
          startCommand: (port) => `pm2 start npx --name "{{name}}" -- serve -s . -p ${port} --no-clipboard`,
          buildDir: '.'
        };
      }

      // Read package.json
      const packageJsonResult = await this.sshClient.executeCommand(`cat ${projectDir}/package.json`);
      if (packageJsonResult.code !== 0) {
        throw new Error('Could not read package.json');
      }

      const packageJson = JSON.parse(packageJsonResult.stdout);
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const scripts = packageJson.scripts || {};

      // Detect Next.js
      if (dependencies.next) {
        // Check for static export configuration
        const nextConfigCheck = await this.sshClient.executeCommand(`test -f ${projectDir}/next.config.js && cat ${projectDir}/next.config.js || test -f ${projectDir}/next.config.mjs && cat ${projectDir}/next.config.mjs || echo "NO_CONFIG"`);
        
        let isStaticExport = false;
        if (nextConfigCheck.stdout && nextConfigCheck.stdout !== 'NO_CONFIG') {
          const configContent = nextConfigCheck.stdout;
          isStaticExport = configContent.includes('output: \'export\'') || 
                          configContent.includes('output: "export"') ||
                          configContent.includes('output:"export"');
        }

        if (isStaticExport) {
          return {
            type: 'nextjs-static',
            description: 'Next.js (Static Export)',
            buildCommand: 'npm run build',
            startCommand: (port) => `pm2 start npx --name "{{name}}" -- serve -s out -p ${port} --no-clipboard`,
            buildDir: 'out'
          };
        }

        return {
          type: 'nextjs-ssr',
          description: 'Next.js (SSR)',
          buildCommand: 'npm run build',
          startCommand: (port) => `PORT=${port} pm2 start npm --name "{{name}}" -- start`,
          buildDir: '.next'
        };
      }

      // Detect React (Create React App)
      if (dependencies['react-scripts']) {
        return {
          type: 'react-cra',
          description: 'Create React App',
          buildCommand: 'npm run build',
          startCommand: (port) => `pm2 start npx --name "{{name}}" -- serve -s build -p ${port} --no-clipboard`,
          buildDir: 'build'
        };
      }

      // Detect Vite
      if (dependencies.vite || scripts.dev?.includes('vite')) {
        return {
          type: 'vite',
          description: 'Vite (React/Vue/Svelte)',
          buildCommand: 'npm run build',
          startCommand: (port) => `pm2 start npx --name "{{name}}" -- serve -s dist -p ${port} --no-clipboard`,
          buildDir: 'dist'
        };
      }

      // Detect Angular
      if (dependencies['@angular/core']) {
        return {
          type: 'angular',
          description: 'Angular',
          buildCommand: 'npm run build',
          startCommand: (port) => `pm2 start npx --name "{{name}}" -- serve -s dist -p ${port} --no-clipboard`,
          buildDir: 'dist'
        };
      }

      // Detect Vue CLI
      if (dependencies['@vue/cli-service']) {
        return {
          type: 'vue-cli',
          description: 'Vue CLI',
          buildCommand: 'npm run build',
          startCommand: (port) => `pm2 start npx --name "{{name}}" -- serve -s dist -p ${port} --no-clipboard`,
          buildDir: 'dist'
        };
      }

      // Detect Express/Node.js server
      if (dependencies.express || scripts.start) {
        return {
          type: 'node-server',
          description: 'Node.js Server',
          buildCommand: scripts.build ? 'npm run build' : null,
          startCommand: (port) => `PORT=${port} pm2 start npm --name "{{name}}" -- start`,
          buildDir: null
        };
      }

      // Detect static site with build process
      if (scripts.build) {
        // Try to detect build directory
        const buildDirs = ['dist', 'build', 'public', 'out'];
        let detectedBuildDir = 'dist';
        
        for (const dir of buildDirs) {
          const checkDir = await this.sshClient.executeCommand(`test -d ${projectDir}/${dir} && echo "EXISTS" || echo "NOT_EXISTS"`);
          if (checkDir.stdout.trim() === 'EXISTS') {
            detectedBuildDir = dir;
            break;
          }
        }

        return {
          type: 'static-build',
          description: 'Static Site with Build',
          buildCommand: 'npm run build',
          startCommand: (port) => `pm2 start npx --name "{{name}}" -- serve -s ${detectedBuildDir} -p ${port} --no-clipboard`,
          buildDir: detectedBuildDir
        };
      }

      // Default: Static files
      return {
        type: 'static-files',
        description: 'Static Files',
        buildCommand: null,
        startCommand: (port) => `pm2 start npx --name "{{name}}" -- serve -s . -p ${port} --no-clipboard`,
        buildDir: '.'
      };

    } catch (error) {
      console.error('Error detecting project type:', error);
      // Fallback to static
      return {
        type: 'static-fallback',
        description: 'Static Files (Fallback)',
        buildCommand: null,
        startCommand: (port) => `pm2 start npx --name "{{name}}" -- serve -s . -p ${port} --no-clipboard`,
        buildDir: '.'
      };
    }
  }

  async deployRepository(userId, deploymentData, io = null, socketId = null) {
    const { repoOwner, repoName, branch = 'main', subdomain: customSubdomain } = deploymentData;
    
    let project;
    let port = null;
    let subdomain = null;
    let projectType = null;
    
    try {
      // Get user with GitHub token
      const user = await User.findOne({ clerkId: userId }).select('+githubAccessToken');
      
      if (!user || !user.githubAccessToken) {
        throw new Error('GitHub account not connected');
      }

      // Use custom subdomain or generate one
      if (customSubdomain) {
        // Validate custom subdomain
        if (!/^[a-z0-9-]+$/.test(customSubdomain)) {
          throw new Error('Subdomain can only contain lowercase letters, numbers, and hyphens');
        }
        
        // Check if subdomain is already taken
        const existing = await Project.findOne({ subdomain: customSubdomain });
        if (existing) {
          throw new Error(`Subdomain "${customSubdomain}" is already taken`);
        }
        
        subdomain = customSubdomain;
      } else {
        // Generate unique subdomain
        subdomain = this.generateSubdomain(repoName, userId);
      }
      
      // Find available port
      port = await this.findAvailablePort();

      // Create project record with subdomain and port
      project = await Project.create({
        name: repoName,
        repoOwner,
        repoName,
        branch,
        repositoryUrl: `https://github.com/${repoOwner}/${repoName}`,
        subdomain,
        port,
        owner: user._id,
        userId: user.clerkId,
        status: 'deploying'
      });

      const emitProgress = async (type, message) => {
        const log = { type, message, timestamp: new Date() };
        
        // Add to logs array
        project.deploymentLogs.push(log);
        
        // Save immediately so CLI can see logs in real-time
        try {
          await project.save();
        } catch (saveError) {
          console.error('Error saving deployment log:', saveError);
        }
        
        // Emit via socket
        if (io && socketId) {
          io.to(socketId).emit('deployment:progress', {
            projectId: project._id,
            ...log
          });
        }
        
        console.log(`[${type.toUpperCase()}] ${message}`);
      };

      await emitProgress('info', `🚀 Starting deployment for ${repoOwner}/${repoName}`);
      await emitProgress('info', `📝 Subdomain: ${subdomain}.${this.platformDomain}`);
      await emitProgress('info', `🔌 Port: ${port}`);

      // Build authenticated clone URL
      const cloneUrl = githubService.buildAuthenticatedCloneUrl(
        user.githubAccessToken,
        repoOwner,
        repoName
      );

      // Generate project directory name
      const projectDir = `${this.deploymentDir}/${subdomain}`;
      
      await emitProgress('info', `📁 Deployment directory: ${projectDir}`);

      // Step 1: Clone repository
      await emitProgress('info', '📦 Cloning repository...');
      await this.sshClient.executeCommand(`mkdir -p ${projectDir}`);
      await this.sshClient.executeCommand(`cd ${projectDir} && git clone -b ${branch} ${cloneUrl} .`);
      await emitProgress('success', '✅ Repository cloned');

      // Step 2: Detect project type
      await emitProgress('info', '🔍 Detecting project type...');
      projectType = await this.detectProjectType(projectDir);
      await emitProgress('info', `📋 Project type: ${projectType.description}`);

      // Step 3: Install dependencies (if package.json exists)
      if (projectType.type !== 'static-html') {
        await emitProgress('info', '📦 Installing dependencies...');
        await this.sshClient.executeCommand(`cd ${projectDir} && npm install --production=false`);
        await emitProgress('success', '✅ Dependencies installed');
      }

      // Step 4: Create environment variables
      await emitProgress('info', '🔧 Setting up environment variables...');
      await this.sshClient.executeCommand(`echo "PORT=${port}" > ${projectDir}/.env`);
      await this.sshClient.executeCommand(`echo "NODE_ENV=production" >> ${projectDir}/.env`);
      await this.sshClient.executeCommand(`echo "NEXT_TELEMETRY_DISABLED=1" >> ${projectDir}/.env`);
      await emitProgress('success', '✅ Environment variables configured');

      // Step 5: Build project (if build command exists)
      if (projectType.buildCommand) {
        await emitProgress('info', `🔨 Building project...`);
        await this.sshClient.executeCommand(`cd ${projectDir} && ${projectType.buildCommand}`);
        await emitProgress('success', `✅ Build completed (${projectType.buildDir})`);
      }

      // Step 6: Ensure PM2 is installed
      await this.sshClient.executeCommand('which pm2 || npm install -g pm2');

      // Step 7: Stop any existing process
      await this.sshClient.executeCommand(`pm2 delete ${subdomain} 2>/dev/null || true`);

      // Step 8: Start application with PM2
      await emitProgress('info', '🚀 Starting application with PM2...');
      const startCommand = projectType.startCommand(port).replace('{{name}}', subdomain);
      await this.sshClient.executeCommand(`cd ${projectDir} && ${startCommand}`);
      await this.sshClient.executeCommand('pm2 save');
      await emitProgress('success', '✅ Application started with PM2');

      // Step 9: Setup Nginx reverse proxy and SSL
      await emitProgress('info', '🌐 Configuring Nginx reverse proxy...');
      const nginxResult = await this.nginxService.setupNginx(subdomain, port);
      await emitProgress('success', `✅ Nginx configured for ${nginxResult.fullDomain}`);
      
      if (nginxResult.sslEnabled) {
        await emitProgress('success', `🔒 SSL certificate generated - HTTPS enabled`);
      } else {
        await emitProgress('info', '⚠️ SSL certificate generation skipped - HTTP only');
      }

      // Update project status
      const finalUrl = nginxResult.sslEnabled 
        ? `https://${nginxResult.fullDomain}` 
        : `http://${nginxResult.fullDomain}`;
      
      project.status = 'deployed';
      project.deployedUrl = finalUrl;
      await project.save();

      await emitProgress('success', `🎉 Deployment completed successfully!`);
      await emitProgress('success', `🌐 Your app is live at: ${finalUrl}`);

      return {
        success: true,
        project: {
          id: project._id,
          name: project.name,
          subdomain: subdomain,
          status: project.status,
          deployedUrl: finalUrl,
          port: project.port,
          sslEnabled: nginxResult.sslEnabled,
          projectType: projectType.description
        }
      };

    } catch (error) {
      console.error('Deployment error:', error);
      
      if (project) {
        project.status = 'failed';
        project.deploymentLogs.push({
          type: 'error',
          message: error.message,
          timestamp: new Date()
        });
        await project.save();

        if (io && socketId) {
          io.to(socketId).emit('deployment:error', {
            projectId: project._id,
            message: error.message
          });
        }
      }

      throw error;
    }
  }

  async getDeploymentLogs(projectId) {
    try {
      const project = await Project.findById(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      return project.deploymentLogs;
    } catch (error) {
      console.error('Error fetching deployment logs:', error);
      throw error;
    }
  }

  async stopDeployment(projectId) {
    try {
      const project = await Project.findById(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Only try to stop if deployment was successful
      if (project.status !== 'deployed') {
        return { 
          success: false, 
          message: `Cannot stop project with status: ${project.status}` 
        };
      }

      await this.sshClient.executeCommand(`pm2 stop ${project.subdomain}`);
      await this.sshClient.executeCommand('pm2 save');

      project.status = 'stopped';
      await project.save();

      return { success: true, message: 'Deployment stopped successfully' };
    } catch (error) {
      console.error('Error stopping deployment:', error);
      throw error;
    }
  }

  async restartDeployment(projectId) {
    try {
      const project = await Project.findById(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Only try to restart if deployment exists
      if (project.status !== 'stopped' && project.status !== 'deployed') {
        return { 
          success: false, 
          message: `Cannot restart project with status: ${project.status}` 
        };
      }

      await this.sshClient.executeCommand(`pm2 restart ${project.subdomain}`);

      project.status = 'deployed';
      await project.save();

      return { success: true, message: 'Deployment restarted successfully' };
    } catch (error) {
      console.error('Error restarting deployment:', error);
      throw error;
    }
  }

  async deleteDeployment(projectId) {
    try {
      const project = await Project.findById(projectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Only try to stop PM2 process if deployment was successful
      if (project.status === 'deployed' || project.status === 'stopped') {
        try {
          await this.sshClient.executeCommand(`pm2 stop ${project.subdomain} 2>/dev/null || true`);
          await this.sshClient.executeCommand(`pm2 delete ${project.subdomain} 2>/dev/null || true`);
          await this.sshClient.executeCommand('pm2 save');
        } catch (error) {
          console.log(`Warning: Could not stop PM2 process (may not exist): ${error.message}`);
          // Continue with deletion even if PM2 cleanup fails
        }
      }

      // Clean up Nginx configuration and SSL certificate
      if (project.subdomain) {
        try {
          await this.nginxService.cleanupNginx(project.subdomain);
        } catch (error) {
          console.log(`Warning: Could not cleanup Nginx: ${error.message}`);
          // Continue with deletion
        }
      }

      // Try to remove deployment directory if it exists
      if (project.subdomain) {
        try {
          await this.sshClient.executeCommand(`rm -rf ${this.deploymentDir}/${project.subdomain}`);
        } catch (error) {
          console.log(`Warning: Could not remove deployment directory: ${error.message}`);
          // Continue with deletion even if directory cleanup fails
        }
      }

      // Delete project from database
      await Project.findByIdAndDelete(projectId);

      return { success: true, message: 'Deployment deleted successfully' };
    } catch (error) {
      console.error('Error deleting deployment:', error);
      throw error;
    }
  }
}

module.exports = new GitHubDeployService();
