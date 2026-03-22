const SSHClient = require('../../ssh/sshClient');
const path = require('path');

class DockerService {
  constructor() {
    this.sshClient = new SSHClient();
    this.appsDir = '/home/ubuntu/apps';
  }

  /**
   * Check if Docker is installed and running on VPS
   */
  async checkDockerAvailability() {
    try {
      console.log('🔍 Checking Docker availability on VPS...');
      const versionResult = await this.sshClient.executeCommand('docker --version');
      const psResult = await this.sshClient.executeCommand('docker ps');
      
      if (versionResult.code === 0 && psResult.code === 0) {
        console.log('✅ Docker is available on VPS');
        console.log(`   Version: ${versionResult.stdout.trim()}`);
        return true;
      }
      
      throw new Error('Docker is not available or not running on VPS');
    } catch (error) {
      console.error('❌ Docker check failed:', error.message);
      throw new Error('Docker is not available or not running on VPS');
    }
  }

  /**
   * Pull Docker image on VPS
   */
  async pullImage(imageName) {
    try {
      console.log(`📦 Pulling Docker image on VPS: ${imageName}`);
      const result = await this.sshClient.executeCommand(`docker pull ${imageName}`);
      
      if (result.code !== 0) {
        throw new Error(`Failed to pull image: ${result.stderr}`);
      }
      
      console.log('✅ Image pulled successfully on VPS');
      return { success: true, output: result.stdout };
    } catch (error) {
      console.error('❌ Failed to pull image:', error.message);
      throw new Error(`Failed to pull Docker image: ${error.message}`);
    }
  }

  /**
   * Create project directory on VPS
   */
  async createProjectDirectory(projectName) {
    const projectPath = path.join(this.appsDir, projectName);
    
    try {
      console.log(`📁 Creating project directory on VPS: ${projectPath}`);
      const result = await this.sshClient.executeCommand(`mkdir -p ${projectPath}`);
      
      if (result.code !== 0) {
        throw new Error(`Failed to create directory: ${result.stderr}`);
      }
      
      console.log(`✅ Created project directory: ${projectPath}`);
      return projectPath;
    } catch (error) {
      throw new Error(`Failed to create project directory: ${error.message}`);
    }
  }

  /**
   * Generate .env file on VPS
   */
  async generateEnvFile(projectPath, envVars) {
    const envFilePath = path.join(projectPath, '.env');
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\\n');

    try {
      console.log(`📝 Generating .env file on VPS: ${envFilePath}`);
      
      // Use cat with heredoc to create file
      const command = `cat > ${envFilePath} << 'EOF'
${envContent}
EOF`;
      
      const result = await this.sshClient.executeCommand(command);
      
      if (result.code !== 0) {
        throw new Error(`Failed to create .env file: ${result.stderr}`);
      }
      
      console.log(`✅ Generated .env file at: ${envFilePath}`);
      return envFilePath;
    } catch (error) {
      throw new Error(`Failed to generate .env file: ${error.message}`);
    }
  }

  /**
   * Deploy Docker container on VPS
   */
  async deployDockerContainer(options) {
    const {
      containerName,
      imageName,
      port,
      defaultPort,
      cpu,
      memory,
      envVars = {},
      projectPath
    } = options;

    try {
      // Build environment variables string
      const envString = Object.entries(envVars)
        .map(([key, value]) => `-e ${key}="${value}"`)
        .join(' ');

      // Build Docker run command
      const dockerCommand = `docker run -d \\
        --name ${containerName} \\
        -p ${port}:${defaultPort} \\
        --cpus="${cpu}" \\
        --memory="${memory}" \\
        --restart unless-stopped \\
        ${envString} \\
        -v ${projectPath}:/data \\
        ${imageName}`;

      console.log(`🚀 Running Docker container on VPS: ${containerName}`);
      const result = await this.sshClient.executeCommand(dockerCommand);
      
      if (result.code !== 0) {
        throw new Error(`Failed to start container: ${result.stderr}`);
      }
      
      const containerId = result.stdout.trim();
      console.log(`✅ Container started on VPS with ID: ${containerId}`);

      // Wait for container to be healthy
      await this.waitForContainer(containerName);

      return {
        success: true,
        containerId,
        containerName
      };
    } catch (error) {
      console.error('❌ Failed to deploy container:', error.message);
      
      // Cleanup on failure
      await this.removeContainer(containerName).catch(() => {});
      
      throw new Error(`Failed to deploy Docker container: ${error.message}`);
    }
  }

  /**
   * Deploy using Docker Compose on VPS
   */
  async deployDockerCompose(options) {
    const {
      projectName,
      projectPath,
      composeYaml,
      envVars = {}
    } = options;

    try {
      // Write docker-compose.yml
      const composePath = path.join(projectPath, 'docker-compose.yml');
      const writeComposeCommand = `cat > ${composePath} << 'EOF'
${composeYaml}
EOF`;
      
      console.log(`📝 Creating docker-compose.yml on VPS: ${composePath}`);
      const writeResult = await this.sshClient.executeCommand(writeComposeCommand);
      
      if (writeResult.code !== 0) {
        throw new Error(`Failed to create docker-compose.yml: ${writeResult.stderr}`);
      }
      
      console.log(`✅ Created docker-compose.yml at: ${composePath}`);

      // Generate .env file
      await this.generateEnvFile(projectPath, envVars);

      // Run docker compose
      console.log(`🚀 Starting Docker Compose on VPS for: ${projectName}`);
      const composeCommand = `cd ${projectPath} && docker compose up -d`;
      const result = await this.sshClient.executeCommand(composeCommand);
      
      if (result.code !== 0) {
        throw new Error(`Failed to start docker compose: ${result.stderr}`);
      }

      console.log('✅ Docker Compose deployment successful on VPS');
      return {
        success: true,
        output: result.stdout
      };
    } catch (error) {
      console.error('❌ Failed to deploy with Docker Compose:', error.message);
      
      // Cleanup on failure
      await this.stopDockerCompose(projectPath).catch(() => {});
      
      throw new Error(`Failed to deploy with Docker Compose: ${error.message}`);
    }
  }

  /**
   * Wait for container to be running on VPS
   */
  async waitForContainer(containerName, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await this.sshClient.executeCommand(
          `docker inspect -f '{{.State.Running}}' ${containerName}`
        );
        
        if (result.code === 0 && result.stdout.trim() === 'true') {
          console.log(`✅ Container ${containerName} is running on VPS`);
          return true;
        }
      } catch (error) {
        // Container not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Container ${containerName} failed to start within timeout`);
  }

  /**
   * Get container status from VPS
   */
  async getContainerStatus(containerName) {
    try {
      const result = await this.sshClient.executeCommand(
        `docker inspect -f '{{.State.Status}}' ${containerName}`
      );
      
      if (result.code === 0) {
        return result.stdout.trim();
      }
      
      return 'not_found';
    } catch (error) {
      return 'not_found';
    }
  }

  /**
   * Stop container on VPS
   */
  async stopContainer(containerName) {
    try {
      console.log(`⏸️ Stopping container on VPS: ${containerName}`);
      const result = await this.sshClient.executeCommand(`docker stop ${containerName}`);
      
      if (result.code === 0) {
        console.log(`✅ Stopped container: ${containerName}`);
        return true;
      }
      
      console.error(`❌ Failed to stop container: ${result.stderr}`);
      return false;
    } catch (error) {
      console.error(`❌ Failed to stop container: ${error.message}`);
      return false;
    }
  }

  /**
   * Start container on VPS
   */
  async startContainer(containerName) {
    try {
      console.log(`▶️ Starting container on VPS: ${containerName}`);
      const result = await this.sshClient.executeCommand(`docker start ${containerName}`);
      
      if (result.code !== 0) {
        throw new Error(`Failed to start container: ${result.stderr}`);
      }
      
      console.log(`✅ Started container: ${containerName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to start container: ${error.message}`);
      throw new Error(`Failed to start container: ${error.message}`);
    }
  }

  /**
   * Remove container from VPS
   */
  async removeContainer(containerName) {
    try {
      console.log(`🗑️ Removing container from VPS: ${containerName}`);
      const result = await this.sshClient.executeCommand(`docker rm -f ${containerName}`);
      
      if (result.code === 0) {
        console.log(`✅ Removed container: ${containerName}`);
        return true;
      }
      
      console.error(`❌ Failed to remove container: ${result.stderr}`);
      return false;
    } catch (error) {
      console.error(`❌ Failed to remove container: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove project directory from VPS
   * @param {string} projectName - Project name
   */
  async removeProjectDirectory(projectName) {
    try {
      console.log(`🗑️ Removing project directory for: ${projectName}`);
      
      const projectPath = `/home/ubuntu/apps/${projectName}`;
      const result = await this.sshClient.executeCommand(`rm -rf ${projectPath}`);
      
      if (result.code === 0) {
        console.log(`✅ Project directory removed: ${projectPath}`);
        return true;
      }
      
      console.warn(`⚠️ Failed to remove directory: ${result.stderr}`);
      return false;
    } catch (error) {
      console.warn(`⚠️ Directory removal warning: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop Docker Compose on VPS
   */
  async stopDockerCompose(projectPath) {
    try {
      console.log(`⏸️ Stopping Docker Compose on VPS at: ${projectPath}`);
      const result = await this.sshClient.executeCommand(`cd ${projectPath} && docker compose down`);
      
      if (result.code === 0) {
        console.log(`✅ Stopped Docker Compose at: ${projectPath}`);
        return true;
      }
      
      console.error(`❌ Failed to stop Docker Compose: ${result.stderr}`);
      return false;
    } catch (error) {
      console.error(`❌ Failed to stop Docker Compose: ${error.message}`);
      return false;
    }
  }

  /**
   * Get container logs from VPS
   */
  async getContainerLogs(containerName, lines = 100) {
    try {
      const result = await this.sshClient.executeCommand(
        `docker logs --tail ${lines} ${containerName}`
      );
      
      if (result.code === 0) {
        return result.stdout;
      }
      
      throw new Error(`Failed to get logs: ${result.stderr}`);
    } catch (error) {
      throw new Error(`Failed to get container logs: ${error.message}`);
    }
  }

  /**
   * Get container stats from VPS
   */
  async getContainerStats(containerName) {
    try {
      const result = await this.sshClient.executeCommand(
        `docker stats ${containerName} --no-stream --format "{{json .}}"`
      );
      
      if (result.code === 0) {
        return JSON.parse(result.stdout);
      }
      
      throw new Error(`Failed to get stats: ${result.stderr}`);
    } catch (error) {
      throw new Error(`Failed to get container stats: ${error.message}`);
    }
  }
}

module.exports = DockerService;
