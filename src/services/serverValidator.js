const SSHClient = require('../../ssh/sshClient');

class ServerValidator {
  constructor() {
    this.sshClient = new SSHClient();
    this.requiredCommands = [
      { command: 'node -v', name: 'Node.js' },
      { command: 'npm -v', name: 'npm' },
      { command: 'pm2 -v', name: 'PM2' },
      { command: 'nginx -v', name: 'Nginx' },
      { command: 'git --version', name: 'Git' }
    ];
    this.appsDirectory = '/home/ubuntu/apps';
  }

  /**
   * Validate server environment and prerequisites
   * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
   */
  async validateEnvironment() {
    console.log('🔍 Starting server environment validation...');
    
    const errors = [];
    const warnings = [];
    
    try {
      // Step 1: Validate required commands exist
      console.log('📋 Checking required dependencies...');
      const commandResults = await this.validateRequiredCommands();
      
      if (commandResults.errors.length > 0) {
        errors.push(...commandResults.errors);
      }
      
      if (commandResults.warnings.length > 0) {
        warnings.push(...commandResults.warnings);
      }
      
      // Step 2: Validate and setup deployment directory
      console.log('📁 Validating deployment directory...');
      const directoryResult = await this.validateDeploymentDirectory();
      
      if (!directoryResult.success) {
        errors.push(directoryResult.error);
      }
      
      // Step 3: Validate system services
      console.log('🔧 Checking system services...');
      const servicesResult = await this.validateSystemServices();
      
      if (servicesResult.errors.length > 0) {
        errors.push(...servicesResult.errors);
      }
      
      if (servicesResult.warnings.length > 0) {
        warnings.push(...servicesResult.warnings);
      }
      
      // Step 4: Validate disk space
      console.log('💾 Checking disk space...');
      const diskResult = await this.validateDiskSpace();
      
      if (!diskResult.sufficient) {
        warnings.push(`Low disk space: ${diskResult.available} available`);
      }
      
      const isValid = errors.length === 0;
      
      if (isValid) {
        console.log('✅ Server environment validation passed');
      } else {
        console.log('❌ Server environment validation failed');
        console.log('Errors:', errors);
      }
      
      if (warnings.length > 0) {
        console.log('⚠️ Warnings:', warnings);
      }
      
      return {
        valid: isValid,
        errors,
        warnings
      };
      
    } catch (error) {
      console.error('❌ Environment validation failed:', error.message);
      return {
        valid: false,
        errors: [`Environment validation failed: ${error.message}`],
        warnings
      };
    }
  }

  /**
   * Validate required commands are available
   * @returns {Promise<{errors: string[], warnings: string[]}>}
   */
  async validateRequiredCommands() {
    const errors = [];
    const warnings = [];
    
    for (const { command, name } of this.requiredCommands) {
      try {
        console.log(`  🔍 Checking ${name}...`);
        const result = await this.sshClient.executeCommand(command);
        
        if (result.code !== 0) {
          errors.push(`${name} is not installed or not accessible (${command})`);
          console.log(`  ❌ ${name} - Not found`);
        } else {
          const version = result.stdout.trim().split('\n')[0];
          console.log(`  ✅ ${name} - ${version}`);
        }
      } catch (error) {
        errors.push(`Failed to check ${name}: ${error.message}`);
        console.log(`  ❌ ${name} - Error: ${error.message}`);
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Validate and setup deployment directory
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async validateDeploymentDirectory() {
    try {
      console.log(`  🔍 Checking if ${this.appsDirectory} exists...`);
      
      // Check if directory exists
      const checkResult = await this.sshClient.executeCommand(`test -d ${this.appsDirectory}`);
      
      if (checkResult.code !== 0) {
        console.log(`  📁 Creating ${this.appsDirectory}...`);
        
        // Create directory
        const mkdirResult = await this.sshClient.executeCommand(`mkdir -p ${this.appsDirectory}`);
        if (mkdirResult.code !== 0) {
          return {
            success: false,
            error: `Failed to create apps directory: ${mkdirResult.stderr}`
          };
        }
        
        console.log(`  ✅ Created ${this.appsDirectory}`);
      } else {
        console.log(`  ✅ ${this.appsDirectory} exists`);
      }
      
      // Set correct permissions
      console.log('  🔒 Setting correct permissions...');
      const chownResult = await this.sshClient.executeCommand(
        `sudo chown -R ubuntu:ubuntu ${this.appsDirectory}`
      );
      
      if (chownResult.code !== 0) {
        return {
          success: false,
          error: `Failed to set ownership: ${chownResult.stderr}`
        };
      }
      
      const chmodResult = await this.sshClient.executeCommand(
        `sudo chmod -R 755 ${this.appsDirectory}`
      );
      
      if (chmodResult.code !== 0) {
        return {
          success: false,
          error: `Failed to set permissions: ${chmodResult.stderr}`
        };
      }
      
      console.log('  ✅ Permissions set correctly');
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: `Directory validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate system services are running
   * @returns {Promise<{errors: string[], warnings: string[]}>}
   */
  async validateSystemServices() {
    const errors = [];
    const warnings = [];
    
    const services = [
      { name: 'nginx', required: true },
      { name: 'ssh', required: true }
    ];
    
    for (const service of services) {
      try {
        console.log(`  🔍 Checking ${service.name} service...`);
        const result = await this.sshClient.executeCommand(
          `sudo systemctl is-active ${service.name}`
        );
        
        if (result.code !== 0 || result.stdout.trim() !== 'active') {
          if (service.required) {
            errors.push(`${service.name} service is not running`);
            console.log(`  ❌ ${service.name} - Not active`);
          } else {
            warnings.push(`${service.name} service is not running`);
            console.log(`  ⚠️ ${service.name} - Not active`);
          }
        } else {
          console.log(`  ✅ ${service.name} - Active`);
        }
      } catch (error) {
        if (service.required) {
          errors.push(`Failed to check ${service.name} service: ${error.message}`);
        } else {
          warnings.push(`Failed to check ${service.name} service: ${error.message}`);
        }
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Validate available disk space
   * @returns {Promise<{sufficient: boolean, available: string, used: string}>}
   */
  async validateDiskSpace() {
    try {
      console.log('  🔍 Checking disk space...');
      const result = await this.sshClient.executeCommand('df -h /home');
      
      if (result.code !== 0) {
        return {
          sufficient: false,
          available: 'unknown',
          used: 'unknown'
        };
      }
      
      const lines = result.stdout.trim().split('\n');
      if (lines.length < 2) {
        return {
          sufficient: false,
          available: 'unknown',
          used: 'unknown'
        };
      }
      
      const diskInfo = lines[1].split(/\s+/);
      const available = diskInfo[3];
      const used = diskInfo[4];
      
      // Check if available space is less than 1GB (rough check)
      const availableNum = parseFloat(available);
      const availableUnit = available.slice(-1);
      
      let sufficient = true;
      if (availableUnit === 'M' || (availableUnit === 'G' && availableNum < 1)) {
        sufficient = false;
      }
      
      console.log(`  💾 Disk space - Available: ${available}, Used: ${used}`);
      
      return {
        sufficient,
        available,
        used
      };
      
    } catch (error) {
      console.log(`  ⚠️ Could not check disk space: ${error.message}`);
      return {
        sufficient: true, // Assume sufficient if we can't check
        available: 'unknown',
        used: 'unknown'
      };
    }
  }

  /**
   * Validate specific port availability
   * @param {number} port - Port to check
   * @returns {Promise<boolean>} True if port is available
   */
  async validatePortAvailability(port) {
    try {
      console.log(`🔍 Checking if port ${port} is available...`);
      
      // Check if port is in use
      const result = await this.sshClient.executeCommand(
        `netstat -tuln | grep :${port} || echo "PORT_AVAILABLE"`
      );
      
      const isAvailable = result.stdout.includes('PORT_AVAILABLE');
      
      if (isAvailable) {
        console.log(`✅ Port ${port} is available`);
      } else {
        console.log(`❌ Port ${port} is already in use`);
      }
      
      return isAvailable;
      
    } catch (error) {
      console.log(`⚠️ Could not check port ${port}: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate SSL certificate prerequisites
   * @returns {Promise<{valid: boolean, errors: string[]}>}
   */
  async validateSSLPrerequisites() {
    const errors = [];
    
    try {
      console.log('🔍 Checking SSL prerequisites...');
      
      // Check if certbot is installed
      const certbotResult = await this.sshClient.executeCommand('certbot --version');
      if (certbotResult.code !== 0) {
        errors.push('Certbot is not installed');
      } else {
        console.log('✅ Certbot is available');
      }
      
      // Check if nginx certbot plugin is available
      const pluginResult = await this.sshClient.executeCommand('certbot plugins | grep nginx');
      if (pluginResult.code !== 0) {
        errors.push('Certbot nginx plugin is not available');
      } else {
        console.log('✅ Certbot nginx plugin is available');
      }
      
    } catch (error) {
      errors.push(`SSL validation failed: ${error.message}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = ServerValidator;