const SSHClient = require('../../ssh/sshClient');

class NginxService {
  constructor() {
    this.sshClient = new SSHClient();
    this.domain = process.env.PLATFORM_DOMAIN || 'aitoyz.in';
    this.nginxSitesAvailable = '/etc/nginx/sites-available';
    this.nginxSitesEnabled = '/etc/nginx/sites-enabled';
    this.certbotEmail = process.env.CERTBOT_EMAIL || 'admin@aitoyz.in';
  }

  /**
   * Create Nginx configuration for a project (alias for backward compatibility)
   * @param {string} projectName - Project name
   * @param {number} port - Port number
   */
  async createConfig(projectName, port) {
    return this.createNginxConfig(projectName, port);
  }

  /**
   * Create Nginx configuration for a project
   * @param {string} projectName - Project name
   * @param {number} port - Port number
   */
  async createNginxConfig(projectName, port) {
    try {
      console.log(`🔧 Creating Nginx configuration for ${projectName}...`);
      
      const subdomain = `${projectName}.${this.domain}`;
      const configContent = this.generateNginxConfig(subdomain, port);
      const configPath = `${this.nginxSitesAvailable}/${projectName}`;
      
      // Create the configuration file
      const createConfigCommand = `sudo tee ${configPath} > /dev/null << 'EOF'
${configContent}
EOF`;
      
      const result = await this.sshClient.executeCommand(createConfigCommand);
      
      if (result.code !== 0) {
        throw new Error(`Failed to create Nginx config: ${result.stderr}`);
      }
      
      console.log(`✅ Nginx configuration created: ${configPath}`);
      return configPath;
    } catch (error) {
      throw new Error(`Failed to create Nginx configuration: ${error.message}`);
    }
  }

  /**
   * Enable Nginx site
   * @param {string} projectName - Project name
   */
  async enableSite(projectName) {
    try {
      console.log(`🔗 Enabling Nginx site for ${projectName}...`);
      
      const availablePath = `${this.nginxSitesAvailable}/${projectName}`;
      const enabledPath = `${this.nginxSitesEnabled}/${projectName}`;
      
      // Create symbolic link
      const linkCommand = `sudo ln -sf ${availablePath} ${enabledPath}`;
      const result = await this.sshClient.executeCommand(linkCommand);
      
      if (result.code !== 0) {
        throw new Error(`Failed to enable site: ${result.stderr}`);
      }
      
      console.log(`✅ Nginx site enabled: ${projectName}`);
    } catch (error) {
      throw new Error(`Failed to enable Nginx site: ${error.message}`);
    }
  }

  /**
   * Test Nginx configuration
   */
  async testNginxConfig() {
    try {
      console.log('🧪 Testing Nginx configuration...');
      
      const result = await this.sshClient.executeCommand('sudo nginx -t');
      
      if (result.code !== 0) {
        throw new Error(`Nginx configuration test failed: ${result.stderr}`);
      }
      
      console.log('✅ Nginx configuration test passed');
    } catch (error) {
      throw new Error(`Nginx configuration test failed: ${error.message}`);
    }
  }

  /**
   * Reload Nginx
   */
  async reloadNginx() {
    try {
      console.log('🔄 Reloading Nginx...');
      
      const result = await this.sshClient.executeCommand('sudo systemctl reload nginx');
      
      if (result.code !== 0) {
        throw new Error(`Failed to reload Nginx: ${result.stderr}`);
      }
      
      console.log('✅ Nginx reloaded successfully');
    } catch (error) {
      throw new Error(`Failed to reload Nginx: ${error.message}`);
    }
  }

  /**
   * Generate SSL certificate using Certbot
   * @param {string} projectName - Project name
   */
  async generateSSLCertificate(projectName) {
    try {
      console.log(`🔒 Generating SSL certificate for ${projectName}...`);
      
      const subdomain = `${projectName}.${this.domain}`;
      const certbotCommand = `sudo certbot --nginx -d ${subdomain} --non-interactive --agree-tos -m ${this.certbotEmail}`;
      
      const result = await this.sshClient.executeCommand(certbotCommand);
      
      if (result.code !== 0) {
        console.warn(`⚠️ SSL certificate generation failed: ${result.stderr}`);
        console.warn('Continuing without SSL - site will be available over HTTP');
        return false;
      }
      
      console.log(`✅ SSL certificate generated for ${subdomain}`);
      return true;
    } catch (error) {
      console.warn(`⚠️ SSL certificate generation failed: ${error.message}`);
      console.warn('Continuing without SSL - site will be available over HTTP');
      return false;
    }
  }

  /**
   * Remove SSL certificate using Certbot
   * @param {string} projectName - Project name
   */
  async removeSSLCertificate(projectName) {
    try {
      console.log(`🔒 Removing SSL certificate for ${projectName}...`);
      
      const subdomain = `${projectName}.${this.domain}`;
      const certbotCommand = `sudo certbot delete --cert-name ${subdomain} --non-interactive`;
      
      const result = await this.sshClient.executeCommand(certbotCommand);
      
      if (result.code !== 0) {
        console.warn(`⚠️ SSL certificate removal failed or certificate not found: ${result.stderr}`);
        console.warn('Continuing with deletion...');
        return false;
      }
      
      console.log(`✅ SSL certificate removed for ${subdomain}`);
      return true;
    } catch (error) {
      console.warn(`⚠️ SSL certificate removal failed: ${error.message}`);
      console.warn('Continuing with deletion...');
      return false;
    }
  }

  /**
   * Remove Nginx configuration for a project (alias for backward compatibility)
   * @param {string} projectName - Project name
   */
  async removeConfig(projectName) {
    return this.removeNginxConfig(projectName);
  }

  /**
   * Remove Nginx configuration for a project
   * @param {string} projectName - Project name
   */
  async removeNginxConfig(projectName) {
    try {
      console.log(`🗑️ Removing Nginx configuration for ${projectName}...`);
      
      const availablePath = `${this.nginxSitesAvailable}/${projectName}`;
      const enabledPath = `${this.nginxSitesEnabled}/${projectName}`;
      
      // Remove symbolic link and configuration file
      const removeCommands = [
        `sudo rm -f ${enabledPath}`,
        `sudo rm -f ${availablePath}`
      ];
      
      for (const command of removeCommands) {
        await this.sshClient.executeCommand(command);
      }
      
      // Reload Nginx
      await this.reloadNginx();
      
      console.log(`✅ Nginx configuration removed for ${projectName}`);
    } catch (error) {
      throw new Error(`Failed to remove Nginx configuration: ${error.message}`);
    }
  }

  /**
   * Complete cleanup of Nginx configuration and SSL certificate
   * @param {string} projectName - Project name
   */
  async cleanupNginx(projectName) {
    try {
      console.log(`🧹 Starting complete Nginx cleanup for ${projectName}...`);
      
      // Remove SSL certificate first
      await this.removeSSLCertificate(projectName);
      
      // Remove Nginx configuration
      await this.removeNginxConfig(projectName);
      
      console.log(`✅ Complete Nginx cleanup finished for ${projectName}`);
    } catch (error) {
      console.error(`⚠️ Nginx cleanup encountered errors: ${error.message}`);
      // Don't throw - we want to continue with other cleanup steps
    }
  }

  /**
   * Generate Nginx configuration content
   * @param {string} subdomain - Subdomain
   * @param {number} port - Port number
   * @returns {string} Nginx configuration content
   */
  generateNginxConfig(subdomain, port) {
    return `server {
    listen 80;
    server_name ${subdomain};

    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Essential proxy headers for apps behind reverse proxy
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings (increased for long-running operations)
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
    
    # Increase max body size for uploads
    client_max_body_size 100M;
}`;
  }

  /**
   * Complete Nginx setup for a project
   * @param {string} projectName - Project name
   * @param {number} port - Port number
   * @returns {Promise<{projectName: string, fullDomain: string, sslEnabled: boolean}>}
   */
  async setupNginx(projectName, port) {
    try {
      // Create configuration
      await this.createNginxConfig(projectName, port);
      
      // Enable site
      await this.enableSite(projectName);
      
      // Test configuration
      await this.testNginxConfig();
      
      // Reload Nginx
      await this.reloadNginx();
      
      // Generate SSL certificate
      const sslEnabled = await this.generateSSLCertificate(projectName);
      
      const fullDomain = `${projectName}.${this.domain}`;
      
      return {
        projectName,
        fullDomain,
        sslEnabled
      };
    } catch (error) {
      throw new Error(`Failed to setup Nginx: ${error.message}`);
    }
  }
}

module.exports = NginxService;