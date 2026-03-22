const SSHClient = require('../../ssh/sshClient');
const ProjectNameGenerator = require('./projectNameGenerator');
const PortManager = require('./portManager');
const NginxService = require('./nginxService');
const ServerValidator = require('./serverValidator');
const ProjectTypeDetector = require('./projectTypeDetector');
const fs = require('fs-extra');
const path = require('path');

class DeployService {
  constructor() {
    this.sshClient = new SSHClient();
    this.portManager = new PortManager();
    this.nginxService = new NginxService();
    this.serverValidator = new ServerValidator();
    this.projectTypeDetector = new ProjectTypeDetector();
    this.appsDirectory = '/home/ubuntu/apps';
    this.deploymentsFilePath = path.join(__dirname, '../../data/deployments.json');
  }

  /**
   * Initialize deployment service
   */
  async initialize() {
    try {
      // Ensure data directory exists
      await fs.ensureDir(path.dirname(this.deploymentsFilePath));
      
      // Create deployments file if it doesn't exist
      if (!await fs.pathExists(this.deploymentsFilePath)) {
        await fs.writeJson(this.deploymentsFilePath, {}, { spaces: 2 });
      }
      
      // Initialize port manager
      await this.portManager.initialize();
    } catch (error) {
      throw new Error(`Failed to initialize deploy service: ${error.message}`);
    }
  }

  /**
   * Deploy a frontend application following the exact sequential steps
   * @param {string} repoUrl - GitHub repository URL
   * @param {string} siteName - Optional custom site name
   * @returns {Promise<Object>} Deployment result
   */
  async deployApplication(repoUrl, siteName = null) {
    let projectName = null;
    let port = null;
    
    try {
      console.log('🚀 Starting robust deployment process...');
      console.log(`📦 Repository: ${repoUrl}`);
      console.log('=' .repeat(60));
      
      // STEP 1: Validate server environment
      console.log('📋 STEP 1: Validating server environment...');
      const validationResult = await this.serverValidator.validateEnvironment();
      
      if (!validationResult.valid) {
        throw new Error(`Server environment validation failed:\n${validationResult.errors.join('\n')}`);
      }
      
      if (validationResult.warnings.length > 0) {
        console.log('⚠️ Environment warnings:', validationResult.warnings);
      }
      console.log('✅ STEP 1 COMPLETED: Server environment validated');
      console.log('=' .repeat(60));
      
      // STEP 2: Initialize service
      console.log('🔧 STEP 2: Initializing deployment service...');
      await this.initialize();
      console.log('✅ STEP 2 COMPLETED: Service initialized');
      console.log('=' .repeat(60));
      
      // STEP 3: Validate and generate project name
      console.log('📝 STEP 3: Generating project name...');
      if (!ProjectNameGenerator.isValidGitHubUrl(repoUrl)) {
        throw new Error('Invalid GitHub repository URL format');
      }
      
      if (siteName) {
        projectName = ProjectNameGenerator.sanitizeProjectName(siteName);
        console.log(`📝 Using custom site name: ${projectName}`);
      } else {
        projectName = ProjectNameGenerator.generateProjectName(repoUrl);
        console.log(`📝 Generated project name: ${projectName}`);
      }
      
      // Check if project name already exists
      const existingDeployment = await this.getDeploymentInfo(projectName);
      if (existingDeployment) {
        throw new Error(`Project name "${projectName}" is already in use. Please choose a different name.`);
      }
      console.log('✅ STEP 3 COMPLETED: Project name generated and validated');
      console.log('=' .repeat(60));
      
      // STEP 4: Assign available port
      console.log('🔌 STEP 4: Assigning available port...');
      port = await this.portManager.getNextAvailablePort();
      console.log(`🔌 Scanning ports from 3001 upward...`);
      console.log(`✅ Found available port: ${port}`);
      
      // Validate port is actually available on the server
      const portAvailable = await this.serverValidator.validatePortAvailability(port);
      if (!portAvailable) {
        throw new Error(`Port ${port} is already in use on the server`);
      }
      
      await this.portManager.reservePort(projectName, port);
      console.log('✅ STEP 4 COMPLETED: Port assigned and reserved');
      console.log('=' .repeat(60));
      
      // STEP 5: Clone repository
      console.log('📥 STEP 5: Cloning repository...');
      await this.cloneRepository(repoUrl, projectName);
      console.log('✅ STEP 5 COMPLETED: Repository cloned');
      console.log('=' .repeat(60));
      
      // STEP 6: Install dependencies
      console.log('📦 STEP 6: Installing dependencies...');
      const projectType = await this.installDependencies(projectName);
      console.log(`✅ STEP 6 COMPLETED: Dependencies handled (project type: ${projectType})`);
      console.log('=' .repeat(60));
      
      // STEP 6.5: Handle environment variables
      console.log('🔧 STEP 6.5: Handling environment variables...');
      await this.handleEnvironmentVariables(projectName, port);
      console.log('✅ STEP 6.5 COMPLETED: Environment variables handled');
      console.log('=' .repeat(60));
      
      // STEP 7: Build the project
      console.log('🔨 STEP 7: Building project...');
      const buildResult = await this.buildProject(projectName);
      const { buildDir, projectInfo } = buildResult;
      console.log(`✅ STEP 7 COMPLETED: Project built, build directory: ${buildDir || 'root'}`);
      console.log('=' .repeat(60));
      
      // STEP 8: Start application using PM2
      console.log('🚀 STEP 8: Starting application with PM2...');
      await this.startApplication(projectName, port, projectInfo);
      console.log('✅ STEP 8 COMPLETED: Application started with PM2');
      console.log('=' .repeat(60));
      
      // STEP 9: Create nginx configuration
      console.log('🌐 STEP 9: Creating nginx configuration...');
      const nginxResult = await this.nginxService.setupNginx(projectName, port);
      console.log('✅ STEP 9 COMPLETED: Nginx configured');
      console.log('=' .repeat(60));
      
      // STEP 10: Verify deployment
      console.log('🔍 STEP 10: Verifying deployment...');
      const verificationResult = await this.verifyDeployment(projectName, port);
      if (!verificationResult.success) {
        throw new Error(`Deployment verification failed: ${verificationResult.error}`);
      }
      console.log('✅ STEP 10 COMPLETED: Deployment verified');
      console.log('=' .repeat(60));
      
      // STEP 11: Save deployment info
      console.log('💾 STEP 11: Saving deployment info...');
      await this.saveDeploymentInfo(projectName, {
        repoUrl,
        port,
        subdomain: nginxResult.subdomain,
        sslEnabled: nginxResult.sslEnabled,
        buildDir,
        projectType: projectInfo.type,
        deployedAt: new Date().toISOString(),
        status: 'active'
      });
      console.log('✅ STEP 11 COMPLETED: Deployment info saved');
      console.log('=' .repeat(60));
      
      const finalUrl = nginxResult.sslEnabled 
        ? `https://${nginxResult.subdomain}` 
        : `http://${nginxResult.subdomain}`;
      
      console.log('🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!');
      console.log(`🌐 URL: ${finalUrl}`);
      console.log(`🔌 Port: ${port}`);
      console.log(`📝 Project: ${projectName}`);
      console.log('=' .repeat(60));
      
      return {
        status: 'success',
        projectName,
        url: finalUrl,
        port,
        subdomain: nginxResult.subdomain,
        sslEnabled: nginxResult.sslEnabled
      };
      
    } catch (error) {
      console.error('❌ DEPLOYMENT FAILED:', error.message);
      console.error('❌ Full error:', error);
      
      // Cleanup on failure
      if (projectName && port) {
        console.log('🧹 Starting cleanup...');
        await this.cleanup(projectName, port);
        console.log('✅ Cleanup completed');
      }
      
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Clone repository to VPS with proper directory setup
   * @param {string} repoUrl - Repository URL
   * @param {string} projectName - Project name
   */
  async cloneRepository(repoUrl, projectName) {
    try {
      console.log(`📥 Cloning repository: ${repoUrl}`);
      
      const projectPath = `${this.appsDirectory}/${projectName}`;
      
      // Ensure apps directory exists with proper permissions (already validated in step 1)
      console.log('📁 Verifying apps directory...');
      const checkDir = await this.sshClient.executeCommand(`test -d ${this.appsDirectory}`);
      if (checkDir.code !== 0) {
        throw new Error(`Apps directory ${this.appsDirectory} does not exist`);
      }
      
      // Check if project directory already exists
      const checkProject = await this.sshClient.executeCommand(`test -d ${projectPath}`);
      if (checkProject.code === 0) {
        console.log('🗑️ Removing existing project directory...');
        const removeResult = await this.sshClient.executeCommand(`rm -rf ${projectPath}`);
        if (removeResult.code !== 0) {
          throw new Error(`Failed to remove existing directory: ${removeResult.stderr}`);
        }
      }
      
      // Clone repository with timeout and depth limit for faster cloning
      console.log('🔄 Starting git clone...');
      const cloneCommand = `cd ${this.appsDirectory} && timeout 300 git clone --depth 1 --single-branch ${repoUrl} ${projectName}`;
      const result = await this.sshClient.executeCommand(cloneCommand);
      
      if (result.code !== 0) {
        console.error('❌ Git clone failed:', result.stderr);
        throw new Error(`Git clone failed: ${result.stderr}`);
      }
      
      // Verify the clone was successful
      const verifyClone = await this.sshClient.executeCommand(`test -d ${projectPath}`);
      if (verifyClone.code !== 0) {
        throw new Error('Repository clone verification failed - directory not found');
      }
      
      console.log(`✅ Repository cloned successfully to: ${projectPath}`);
    } catch (error) {
      console.error('❌ Clone repository error:', error.message);
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Install project dependencies
   * @param {string} projectName - Project name
   */
  async installDependencies(projectName) {
    console.log(`📦 Installing dependencies for ${projectName}...`);
    
    const projectPath = `${this.appsDirectory}/${projectName}`;
    
    try {
      // Check if package.json exists
      console.log('🔍 Checking for package.json...');
      const checkPackageJson = await this.sshClient.executeCommand(`test -f ${projectPath}/package.json`);
      if (checkPackageJson.code !== 0) {
        console.log('📄 No package.json found - treating as static HTML site');
        return 'static'; // Return type for static sites
      }
      console.log('✅ package.json found');
      
      // Install dependencies with timeout
      console.log('🔄 Running npm install...');
      const installCommand = `cd ${projectPath} && timeout 600 npm install --production`;
      const result = await this.sshClient.executeCommand(installCommand);
      
      if (result.code !== 0) {
        console.error('❌ npm install failed:', result.stderr);
        throw new Error(`npm install failed: ${result.stderr}`);
      }
      
      console.log(`✅ Dependencies installed for ${projectName}`);
      return 'node'; // Return type for Node.js projects
      
    } catch (error) {
      // Only re-throw if it's not a static site detection
      if (error.message && error.message.includes('npm install failed')) {
        throw error;
      }
      console.error('❌ Install dependencies error:', error.message);
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }

  /**
   * Build the project and detect build output folder
   * @param {string} projectName - Project name
   * @param {string} projectType - Project type ('node' or 'static')
   * @returns {Promise<string>} Build directory name
   */
  /**
   * Handle environment variables for the project
   */
  async handleEnvironmentVariables(projectName, port) {
    try {
      const projectPath = `${this.appsDirectory}/${projectName}`;
      
      // Check if .env.example exists
      const envExampleCheck = await this.sshClient.executeCommand(`test -f ${projectPath}/.env.example`);
      const envCheck = await this.sshClient.executeCommand(`test -f ${projectPath}/.env`);
      
      if (envExampleCheck.code === 0 && envCheck.code !== 0) {
        console.log('📋 Found .env.example but no .env file');
        console.log('🔧 Creating .env file from .env.example...');
        
        // Copy .env.example to .env
        const copyResult = await this.sshClient.executeCommand(`cp ${projectPath}/.env.example ${projectPath}/.env`);
        if (copyResult.code !== 0) {
          console.log('⚠️ Failed to copy .env.example to .env');
          return;
        }
        
        // Read the .env.example content to see what variables are needed
        const envContent = await this.sshClient.executeCommand(`cat ${projectPath}/.env.example`);
        if (envContent.code === 0) {
          console.log('📝 Environment variables template:');
          console.log(envContent.stdout);
        }
      } else if (envCheck.code !== 0) {
        console.log('📋 No .env file found, creating one...');
        // Create a basic .env file
        await this.sshClient.executeCommand(`touch ${projectPath}/.env`);
      } else {
        console.log('✅ .env file already exists');
      }
      
      // Set essential environment variables including the port
      const essentialVars = {
        'PORT': port.toString(),
        'NODE_ENV': 'production',
        'NEXT_TELEMETRY_DISABLED': '1'
      };
      
      // Add common defaults for Next.js projects
      const packageJsonResult = await this.sshClient.executeCommand(`cat ${projectPath}/package.json`);
      if (packageJsonResult.code === 0) {
        const packageJson = JSON.parse(packageJsonResult.stdout);
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (dependencies.next) {
          console.log('🔧 Detected Next.js project - setting Next.js specific variables...');
          
          // Add Next.js specific variables
          essentialVars['NEXTAUTH_URL'] = `http://localhost:${port}`;
          essentialVars['NEXTAUTH_SECRET'] = 'deployment-secret-key-' + Math.random().toString(36).substring(7);
          
          // Check if NextAuth is used
          if (dependencies['next-auth']) {
            console.log('🔐 NextAuth detected - setting authentication variables');
          }
        }
      }
      
      // Apply all essential variables to .env file
      console.log('🔧 Setting essential environment variables:');
      for (const [key, value] of Object.entries(essentialVars)) {
        // Check if variable already exists in .env
        const checkVar = await this.sshClient.executeCommand(`grep "^${key}=" ${projectPath}/.env`);
        
        if (checkVar.code === 0) {
          // Variable exists, update it
          const updateResult = await this.sshClient.executeCommand(
            `sed -i 's|^${key}=.*|${key}=${value}|g' ${projectPath}/.env`
          );
          if (updateResult.code === 0) {
            console.log(`✅ Updated ${key}=${value}`);
          }
        } else {
          // Variable doesn't exist, add it
          const addResult = await this.sshClient.executeCommand(
            `echo "${key}=${value}" >> ${projectPath}/.env`
          );
          if (addResult.code === 0) {
            console.log(`✅ Added ${key}=${value}`);
          }
        }
      }
      
      // Create .env.local for production-specific overrides
      const envLocalContent = `# Production environment overrides
NODE_ENV=production
PORT=${port}
NEXT_TELEMETRY_DISABLED=1
`;
      
      await this.sshClient.executeCommand(`echo '${envLocalContent.trim()}' > ${projectPath}/.env.local`);
      console.log('✅ Created .env.local with production settings');
      
      // Show final .env content for debugging
      console.log('📋 Final .env file contents:');
      const finalEnvContent = await this.sshClient.executeCommand(`cat ${projectPath}/.env`);
      if (finalEnvContent.code === 0) {
        console.log(finalEnvContent.stdout);
      }
      
    } catch (error) {
      console.log(`⚠️ Environment variable handling failed: ${error.message}`);
      // Don't throw error - this is not critical for deployment
    }
  }

  /**
   * Detect project type remotely by analyzing files on the VPS
   */
  async detectProjectTypeRemotely(projectName) {
    try {
      const projectPath = `${this.appsDirectory}/${projectName}`;
      
      // Check if package.json exists
      const packageJsonCheck = await this.sshClient.executeCommand(`test -f ${projectPath}/package.json`);
      if (packageJsonCheck.code !== 0) {
        return {
          type: 'static',
          buildCommand: null,
          startCommand: 'npx serve -s .',
          buildDir: '.',
          description: 'Static files (no package.json)'
        };
      }

      // Read package.json
      const packageJsonResult = await this.sshClient.executeCommand(`cat ${projectPath}/package.json`);
      if (packageJsonResult.code !== 0) {
        throw new Error('Could not read package.json');
      }

      const packageJson = JSON.parse(packageJsonResult.stdout);
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const scripts = packageJson.scripts || {};

      // Detect Next.js
      if (dependencies.next) {
        const nextConfigCheck = await this.sshClient.executeCommand(`test -f ${projectPath}/next.config.js`);
        let isStaticExport = false;
        
        if (nextConfigCheck.code === 0) {
          const configResult = await this.sshClient.executeCommand(`cat ${projectPath}/next.config.js`);
          if (configResult.code === 0) {
            const configContent = configResult.stdout;
            // Check for static export configuration
            isStaticExport = configContent.includes('output: \'export\'') || 
                            configContent.includes('output: "export"') ||
                            configContent.includes('trailingSlash: true');
            
            console.log(`🔍 Next.js config analysis: ${isStaticExport ? 'Static Export' : 'SSR'}`);
            if (isStaticExport) {
              console.log('📋 Found output: export configuration in next.config.js');
            }
          }
        }

        // If it's configured for static export, use static export deployment
        if (isStaticExport) {
          return {
            type: 'nextjs-static',
            buildCommand: 'npm run build',
            startCommand: 'npx serve -s out',
            buildDir: 'out',
            description: 'Next.js (Static Export)'
          };
        }

        // Default to SSR Next.js only if NOT configured for static export
        return {
          type: 'nextjs-ssr',
          buildCommand: 'npm run build',
          startCommand: 'npm start',
          buildDir: '.next',
          description: 'Next.js (SSR)'
        };
      }

      // Detect React (Create React App)
      if (dependencies['react-scripts']) {
        return {
          type: 'react-cra',
          buildCommand: 'npm run build',
          startCommand: 'npx serve -s build',
          buildDir: 'build',
          description: 'Create React App'
        };
      }

      // Detect Vite
      if (dependencies.vite) {
        return {
          type: 'vite',
          buildCommand: 'npm run build',
          startCommand: 'npx serve -s dist',
          buildDir: 'dist',
          description: 'Vite project'
        };
      }

      // Check for vite config files
      const viteConfigCheck = await this.sshClient.executeCommand(`test -f ${projectPath}/vite.config.js -o -f ${projectPath}/vite.config.ts`);
      if (viteConfigCheck.code === 0) {
        return {
          type: 'vite',
          buildCommand: 'npm run build',
          startCommand: 'npx serve -s dist',
          buildDir: 'dist',
          description: 'Vite project'
        };
      }

      // Detect Node.js server (has start script but no build)
      if (scripts.start && !scripts.build) {
        return {
          type: 'node-server',
          buildCommand: null,
          startCommand: 'npm start',
          buildDir: null,
          description: 'Node.js server'
        };
      }

      // Detect static site with build process
      if (scripts.build) {
        const buildDir = await this.detectBuildDirectoryRemotely(projectPath);
        return {
          type: 'static-build',
          buildCommand: 'npm run build',
          startCommand: `npx serve -s ${buildDir}`,
          buildDir,
          description: 'Static site with build process'
        };
      }

      // Default to static
      return {
        type: 'static',
        buildCommand: null,
        startCommand: 'npx serve -s .',
        buildDir: '.',
        description: 'Static files'
      };

    } catch (error) {
      console.error('Error detecting project type remotely:', error);
      return {
        type: 'static',
        buildCommand: null,
        startCommand: 'npx serve -s .',
        buildDir: '.',
        description: 'Static files (fallback)'
      };
    }
  }

  /**
   * Detect build directory remotely
   */
  async detectBuildDirectoryRemotely(projectPath) {
    const commonBuildDirs = ['dist', 'build', 'public', 'www', 'out'];
    
    for (const dir of commonBuildDirs) {
      const checkDir = await this.sshClient.executeCommand(`test -d ${projectPath}/${dir}`);
      if (checkDir.code === 0) {
        return dir;
      }
    }
    
    return 'dist'; // Default fallback
  }

  async buildProject(projectName) {
    try {
      console.log(`🔨 Building project: ${projectName}...`);
      
      const projectPath = `${this.appsDirectory}/${projectName}`;
      
      // Detect project type
      console.log('🔍 Detecting project type...');
      const projectInfo = await this.detectProjectTypeRemotely(projectName);
      console.log(`� Project type detected: ${projectInfo.description}`);
      
      // Run build command if needed
      if (projectInfo.buildCommand) {
        // Update browserslist to avoid outdated warnings that can cause build failures
        console.log('🔄 Updating browserslist database...');
        await this.sshClient.executeCommand(`cd ${projectPath} && npx update-browserslist-db@latest || true`);
        
        console.log(`🔄 Running build command: ${projectInfo.buildCommand}`);
        const buildCommand = `cd ${projectPath} && ${projectInfo.buildCommand}`;
        const result = await this.sshClient.executeCommand(buildCommand);
        
        if (result.code !== 0) {
          console.error('❌ Build command failed:', result.stderr);
          throw new Error(`Build failed: ${result.stderr}`);
        }
        
        // Verify build directory exists and contains files
        if (projectInfo.buildDir && projectInfo.buildDir !== '.') {
          const verifyBuild = await this.sshClient.executeCommand(`find ${projectPath}/${projectInfo.buildDir} -type f | head -5`);
          if (verifyBuild.code !== 0 || !verifyBuild.stdout.trim()) {
            throw new Error(`Build directory ${projectInfo.buildDir} is empty or contains no files`);
          }
          console.log(`✅ Build directory ${projectInfo.buildDir} contains files:`);
          console.log(verifyBuild.stdout);
        }
      }
      
      console.log(`✅ Project built successfully. Build directory: ${projectInfo.buildDir}`);
      return { buildDir: projectInfo.buildDir, projectInfo };
    } catch (error) {
      throw new Error(`Failed to build project: ${error.message}`);
    }
  }

  /**
   * Detect build directory by checking common build output folders
   * @param {string} projectName - Project name
   * @returns {Promise<string>} Build directory name
   */
  async detectBuildDirectory(projectName) {
    try {
      const projectPath = `${this.appsDirectory}/${projectName}`;
      const possibleDirs = ['dist', 'build', '.next', 'out'];
      
      console.log('🔍 Checking for build directories:', possibleDirs.join(', '));
      
      for (const dir of possibleDirs) {
        const checkDir = await this.sshClient.executeCommand(`test -d ${projectPath}/${dir}`);
        if (checkDir.code === 0) {
          // Verify directory contains files
          const checkFiles = await this.sshClient.executeCommand(`find ${projectPath}/${dir} -type f | head -1`);
          if (checkFiles.code === 0 && checkFiles.stdout.trim()) {
            console.log(`✅ Found build directory: ${dir}`);
            return dir;
          }
        }
      }
      
      throw new Error(`No build directory found. Supported directories: ${possibleDirs.join(', ')}`);
    } catch (error) {
      throw new Error(`Failed to detect build directory: ${error.message}`);
    }
  }

  /**
   * Start application with PM2 using serve package
   * @param {string} projectName - Project name
   * @param {number} port - Port number
   * @param {string} buildDir - Build directory
   * @param {string} projectType - Project type ('node' or 'static')
   */
  async startApplication(projectName, port, projectInfo) {
    try {
      console.log(`🚀 Starting application: ${projectName} (${projectInfo.description})...`);
      
      const projectPath = `${this.appsDirectory}/${projectName}`;
      
      // Stop and completely remove any existing PM2 process
      console.log('🛑 Completely removing any existing PM2 process...');
      await this.sshClient.executeCommand(`pm2 delete ${projectName} 2>/dev/null || true`);
      await this.sshClient.executeCommand(`pm2 flush 2>/dev/null || true`);
      
      // Wait a moment to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the process is completely removed
      const verifyCleanup = await this.sshClient.executeCommand(`pm2 show ${projectName} 2>/dev/null || echo "PROCESS_NOT_FOUND"`);
      if (!verifyCleanup.stdout.includes('PROCESS_NOT_FOUND')) {
        console.log('⚠️ Old PM2 process still exists, forcing removal...');
        await this.sshClient.executeCommand(`pm2 kill`);
        await this.sshClient.executeCommand(`pm2 resurrect`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      console.log('✅ PM2 state cleaned successfully');
      
      let startCommand;
      
      if (projectInfo.type === 'nextjs-ssr') {
        // For Next.js SSR, use npm start with PORT environment variable
        startCommand = `cd ${projectPath} && PORT=${port} pm2 start npm --name "${projectName}" -- start`;
      } else if (projectInfo.type === 'node-server') {
        // For Node.js servers, use npm start with PORT environment variable
        startCommand = `cd ${projectPath} && PORT=${port} pm2 start npm --name "${projectName}" -- start`;
      } else {
        // For static sites and other build outputs, use serve with explicit interpreter
        // Install serve package locally if needed
        console.log('📦 Ensuring serve package is available...');
        const checkServe = await this.sshClient.executeCommand('which serve');
        if (checkServe.code !== 0) {
          console.log('📦 Installing serve package locally in project...');
          const installServe = await this.sshClient.executeCommand(`cd ${projectPath} && npm install serve`);
          if (installServe.code !== 0) {
            throw new Error(`Failed to install serve package: ${installServe.stderr}`);
          }
        }
        
        const serveDir = projectInfo.buildDir || '.';
        // Use explicit interpreter to prevent PM2 from confusing this with npm scripts
        startCommand = `cd ${projectPath} && pm2 start npx --name "${projectName}" -- serve -s ${serveDir} -l ${port}`;
      }
      
      console.log(`🔄 Running PM2 command: ${startCommand}`);
      const result = await this.sshClient.executeCommand(startCommand);
      
      if (result.code !== 0) {
        console.error('❌ PM2 start failed:', result.stderr);
        throw new Error(`Failed to start application with PM2: ${result.stderr}`);
      }
      
      // Wait a moment for the process to start (longer for Next.js)
      console.log('⏳ Waiting for application to start...');
      await new Promise(resolve => setTimeout(resolve, 8000)); // Increased wait time for Next.js
      
      // Verify the process is running with retry logic
      console.log('🔍 Verifying PM2 process...');
      let retries = 3;
      let processOnline = false;
      
      while (retries > 0 && !processOnline) {
        const verifyResult = await this.sshClient.executeCommand(`pm2 show ${projectName}`);
        if (verifyResult.code !== 0) {
          console.log(`⚠️ PM2 process not found, retries left: ${retries - 1}`);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          throw new Error('PM2 process verification failed - process not found');
        }
        
        // Check if process is online with detailed status
        const statusResult = await this.sshClient.executeCommand(`pm2 jlist | grep -A 5 -B 5 '"name":"${projectName}"' | grep '"status"' | head -1`);
        let status = 'unknown';
        
        if (statusResult.stdout) {
          const statusMatch = statusResult.stdout.match(/"status":"([^"]+)"/);
          if (statusMatch) {
            status = statusMatch[1];
          }
        }
        
        console.log(`📊 PM2 process status: ${status}`);
        
        if (status === 'online') {
          processOnline = true;
          break;
        } else if (status === 'errored' || status === 'stopped') {
          // Get process logs for debugging
          const logsResult = await this.sshClient.executeCommand(`pm2 logs ${projectName} --lines 20 --nostream`);
          console.error('❌ PM2 process failed. Recent logs:');
          console.error(logsResult.stdout);
          throw new Error(`PM2 process failed with status: ${status}. Check logs above.`);
        } else {
          console.log(`⏳ Process status: ${status}, waiting... (retries left: ${retries - 1})`);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      if (!processOnline) {
        // Final attempt to get logs
        const logsResult = await this.sshClient.executeCommand(`pm2 logs ${projectName} --lines 20 --nostream`);
        console.error('❌ Final PM2 logs:');
        console.error(logsResult.stdout);
        throw new Error('PM2 process did not come online within expected time');
      }
      
      // Save PM2 configuration
      console.log('💾 Saving PM2 configuration...');
      await this.sshClient.executeCommand('pm2 save');
      
      console.log(`✅ Application started successfully with PM2: ${projectName} on port ${port}`);
    } catch (error) {
      throw new Error(`Failed to start application: ${error.message}`);
    }
  }

  /**
   * Verify deployment is working correctly
   * @param {string} projectName - Project name
   * @param {number} port - Port number
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async verifyDeployment(projectName, port) {
    try {
      console.log(`🔍 Verifying deployment for ${projectName}...`);
      
      // Check PM2 process is running
      console.log('  🔍 Checking PM2 process status...');
      const pm2Status = await this.sshClient.executeCommand(`pm2 show ${projectName}`);
      if (pm2Status.code !== 0) {
        return {
          success: false,
          error: 'PM2 process not found'
        };
      }
      
      // Check if process is online
      const statusCheck = await this.sshClient.executeCommand(`pm2 jlist | grep -A 10 -B 10 "${projectName}" | grep '"status"'`);
      if (!statusCheck.stdout.includes('online')) {
        return {
          success: false,
          error: 'PM2 process is not online'
        };
      }
      console.log('  ✅ PM2 process is running and online');
      
      // Check if port is listening
      console.log(`🔍 Checking if port ${port} is listening...`);
      const portCheck = await this.sshClient.executeCommand(`netstat -tuln | grep :${port}`);
      if (portCheck.code !== 0) {
        // Port is not listening - get PM2 logs for debugging
        console.log('❌ Port is not listening. Getting PM2 logs for debugging...');
        const logsResult = await this.sshClient.executeCommand(`pm2 logs ${projectName} --lines 30 --nostream`);
        console.log('📋 Recent PM2 logs:');
        console.log(logsResult.stdout);
        
        // Also check what ports are actually open
        const openPorts = await this.sshClient.executeCommand(`netstat -tuln | grep LISTEN`);
        console.log('📋 Currently listening ports:');
        console.log(openPorts.stdout);
        
        // Check if the process is actually running on a different port
        const processCheck = await this.sshClient.executeCommand(`lsof -i -P | grep ${projectName} || echo "No ports found for ${projectName}"`);
        console.log(`📋 Ports used by ${projectName}:`);
        console.log(processCheck.stdout);
        
        return {
          success: false,
          error: `Port ${port} is not listening. Check logs above for details.`
        };
      }
      console.log(`  ✅ Port ${port} is listening`);
      
      // Check nginx configuration
      console.log('  🔍 Checking nginx configuration...');
      const nginxTest = await this.sshClient.executeCommand('sudo nginx -t');
      if (nginxTest.code !== 0) {
        return {
          success: false,
          error: `Nginx configuration test failed: ${nginxTest.stderr}`
        };
      }
      console.log('  ✅ Nginx configuration is valid');
      
      // Test HTTP response (basic connectivity test)
      console.log(`  🔍 Testing HTTP response on localhost:${port}...`);
      const httpTest = await this.sshClient.executeCommand(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${port} || echo "CURL_FAILED"`);
      if (httpTest.stdout.includes('CURL_FAILED')) {
        return {
          success: false,
          error: 'HTTP connectivity test failed'
        };
      }
      
      const httpCode = httpTest.stdout.trim();
      if (!httpCode.startsWith('2') && !httpCode.startsWith('3')) {
        console.log(`  ⚠️ HTTP response code: ${httpCode} (may be normal for some apps)`);
      } else {
        console.log(`  ✅ HTTP response code: ${httpCode}`);
      }
      
      console.log('✅ Deployment verification completed successfully');
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: `Verification failed: ${error.message}`
      };
    }
  }
  
  async saveDeploymentInfo(projectName, deploymentInfo) {
    try {
      const deployments = await fs.readJson(this.deploymentsFilePath);
      deployments[projectName] = deploymentInfo;
      await fs.writeJson(this.deploymentsFilePath, deployments, { spaces: 2 });
      
      console.log(`✅ Deployment info saved for ${projectName}`);
    } catch (error) {
      throw new Error(`Failed to save deployment info: ${error.message}`);
    }
  }

  /**
   * Get deployment information
   * @param {string} projectName - Project name
   * @returns {Promise<Object|null>} Deployment information
   */
  async getDeploymentInfo(projectName) {
    try {
      await this.initialize();
      const deployments = await fs.readJson(this.deploymentsFilePath);
      return deployments[projectName] || null;
    } catch (error) {
      throw new Error(`Failed to get deployment info: ${error.message}`);
    }
  }

  /**
   * Get all deployments
   * @returns {Promise<Object>} All deployments
   */
  async getAllDeployments() {
    try {
      await this.initialize();
      return await fs.readJson(this.deploymentsFilePath);
    } catch (error) {
      throw new Error(`Failed to get all deployments: ${error.message}`);
    }
  }

  /**
   * Delete a deployment
   * @param {string} projectName - Project name
   */
  async deleteDeployment(projectName) {
    try {
      console.log(`🗑️ Deleting deployment: ${projectName}...`);
      
      // Get deployment info
      const deploymentInfo = await this.getDeploymentInfo(projectName);
      if (!deploymentInfo) {
        throw new Error('Deployment not found');
      }
      
      // Stop PM2 process
      await this.sshClient.executeCommand(`pm2 delete ${projectName} || true`);
      await this.sshClient.executeCommand('pm2 save');
      
      // Remove Nginx configuration
      await this.nginxService.removeNginxConfig(projectName);
      
      // Remove project directory
      const projectPath = `${this.appsDirectory}/${projectName}`;
      await this.sshClient.executeCommand(`rm -rf ${projectPath}`);
      
      // Release port
      await this.portManager.releasePort(projectName);
      
      // Remove from deployments file
      const deployments = await fs.readJson(this.deploymentsFilePath);
      delete deployments[projectName];
      await fs.writeJson(this.deploymentsFilePath, deployments, { spaces: 2 });
      
      console.log(`✅ Deployment deleted: ${projectName}`);
    } catch (error) {
      throw new Error(`Failed to delete deployment: ${error.message}`);
    }
  }

  /**
   * Cleanup failed deployment
   * @param {string} projectName - Project name
   * @param {number} port - Port number
   */
  async cleanup(projectName, port) {
    try {
      console.log(`🧹 Cleaning up failed deployment: ${projectName}...`);
      
      // Stop PM2 process
      await this.sshClient.executeCommand(`pm2 delete ${projectName} || true`);
      
      // Remove project directory
      const projectPath = `${this.appsDirectory}/${projectName}`;
      await this.sshClient.executeCommand(`rm -rf ${projectPath} || true`);
      
      // Release port
      await this.portManager.releasePort(projectName);
      
      // Remove Nginx configuration
      await this.nginxService.removeNginxConfig(projectName).catch(() => {
        // Ignore errors during cleanup
      });
      
      console.log(`✅ Cleanup completed for ${projectName}`);
    } catch (error) {
      console.error(`⚠️ Cleanup failed: ${error.message}`);
    }
  }
}

module.exports = DeployService;