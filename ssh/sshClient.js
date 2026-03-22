const { Client } = require('ssh2');
const config = require('../config/env');

class SSHClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  /**
   * Create a new SSH connection
   * @returns {Promise<Client>} SSH client instance
   */
  async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      this.client = new Client();

      const connectionConfig = {
        host: config.ssh.host,
        username: config.ssh.username,
        port: config.ssh.port,
        readyTimeout: config.ssh.connectTimeout,
        keepaliveInterval: config.ssh.keepaliveInterval
      };

      // Add private key authentication
      if (config.ssh.privateKey) {
        connectionConfig.privateKey = config.ssh.privateKey;
      } else {
        reject(new Error('SSH private key not found. Please check SSH_PRIVATE_KEY_PATH environment variable.'));
        return;
      }

      this.client.on('ready', () => {
        const timestamp = new Date().toISOString();
        console.log('🔗 SSH connection established successfully');
        console.log(`✅ Connected to VPS: ${config.ssh.host}:${config.ssh.port}`);
        console.log(`👤 Authenticated as user: ${config.ssh.username}`);
        console.log(`🎉 SSH LOGIN SUCCESSFUL! - ${timestamp}`);
        console.log('=' .repeat(60));
        this.isConnected = true;
        this.connectionPromise = null;
        resolve(this.client);
      });

      this.client.on('error', (error) => {
        console.error('❌ SSH connection error:', error.message);
        console.error(`🔌 Failed to connect to VPS: ${config.ssh.host}:${config.ssh.port}`);
        this.isConnected = false;
        this.connectionPromise = null;
        reject(error);
      });

      this.client.on('close', () => {
        console.log('🔌 SSH connection closed');
        console.log(`📡 Disconnected from VPS: ${config.ssh.host}`);
        this.isConnected = false;
        this.client = null;
        this.connectionPromise = null;
      });

      this.client.on('end', () => {
        console.log('🔚 SSH connection ended gracefully');
        this.isConnected = false;
      });

      try {
        const timestamp = new Date().toISOString();
        console.log('🚀 Attempting SSH connection...');
        console.log(`🎯 Target: ${config.ssh.host}:${config.ssh.port}`);
        console.log(`👤 Username: ${config.ssh.username}`);
        console.log(`🔑 Using private key authentication`);
        console.log(`⏰ Connection attempt started at: ${timestamp}`);
        this.client.connect(connectionConfig);
      } catch (error) {
        console.error('❌ Failed to initiate SSH connection:', error.message);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Test SSH connection
   * @returns {Promise<boolean>} Connection success status
   */
  async testConnection() {
    try {
      console.log('🧪 Testing SSH connection...');
      const client = await this.connect();
      
      return new Promise((resolve, reject) => {
        client.exec('echo "SSH connection test successful"', (err, stream) => {
          if (err) {
            console.error('❌ SSH test command failed:', err.message);
            reject(err);
            return;
          }

          let output = '';
          stream.on('data', (data) => {
            output += data.toString();
          });

          stream.on('close', (code) => {
            if (code === 0 && output.includes('SSH connection test successful')) {
              console.log('✅ SSH connection test passed');
              console.log('🎯 VPS is responding to commands');
              resolve(true);
            } else {
              console.log('❌ SSH connection test failed - unexpected response');
              resolve(false);
            }
          });

          stream.on('error', (error) => {
            console.error('❌ SSH test stream error:', error.message);
            reject(error);
          });
        });
      });
    } catch (error) {
      console.error('❌ SSH test connection failed:', error.message);
      return false;
    }
  }

  /**
   * Create a shell session
   * @returns {Promise<Stream>} Shell stream
   */
  async createShell() {
    try {
      console.log('🐚 Requesting shell session from VPS...');
      const client = await this.connect();
      
      return new Promise((resolve, reject) => {
        client.shell((err, stream) => {
          if (err) {
            console.error('❌ Failed to create shell session:', err.message);
            reject(err);
            return;
          }
          console.log('✅ Shell session created successfully');
          console.log('🎮 Interactive shell is ready for commands');
          resolve(stream);
        });
      });
    } catch (error) {
      console.error('❌ Shell creation failed:', error.message);
      throw new Error(`Failed to create shell: ${error.message}`);
    }
  }

  /**
   * Execute a command
   * @param {string} command - Command to execute
   * @returns {Promise<{stdout: string, stderr: string, code: number}>}
   */
  async executeCommand(command) {
    try {
      const client = await this.connect();
      
      return new Promise((resolve, reject) => {
        client.exec(command, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          let stdout = '';
          let stderr = '';

          stream.on('data', (data) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          stream.on('close', (code) => {
            resolve({ stdout, stderr, code });
          });

          stream.on('error', (error) => {
            reject(error);
          });
        });
      });
    } catch (error) {
      throw new Error(`Failed to execute command: ${error.message}`);
    }
  }

  /**
   * Close SSH connection
   */
  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

module.exports = SSHClient;