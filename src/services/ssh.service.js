const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

class SSHService {
  constructor() {
    this.config = {
      host: process.env.VPS_HOST,
      port: parseInt(process.env.VPS_PORT) || 22,
      username: process.env.VPS_USER || 'root',
      privateKey: this.loadPrivateKey()
    };
  }

  loadPrivateKey() {
    try {
      const keyPath = process.env.VPS_KEY_PATH || './keys/vps_key2026.pem';
      const fullPath = path.resolve(keyPath);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`SSH key not found at: ${fullPath}`);
      }
      
      return fs.readFileSync(fullPath, 'utf8');
    } catch (error) {
      console.error('Error loading SSH private key:', error.message);
      throw error;
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      
      conn.on('ready', () => {
        resolve(conn);
      });

      conn.on('error', (err) => {
        reject(new Error(`SSH connection error: ${err.message}`));
      });

      try {
        conn.connect(this.config);
      } catch (error) {
        reject(error);
      }
    });
  }

  async executeCommand(conn, command, onData = null) {
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      conn.exec(command, (err, stream) => {
        if (err) {
          return reject(new Error(`Command execution error: ${err.message}`));
        }

        stream.on('close', (code, signal) => {
          // Allow commands with "|| true" to succeed even with non-zero exit codes
          if (code !== 0 && !command.includes('|| true') && !command.includes('2>/dev/null')) {
            reject(new Error(`Command failed with code ${code}: ${errorOutput || output}`));
          } else {
            resolve(output);
          }
        });

        stream.on('data', (data) => {
          const text = data.toString();
          output += text;
          if (onData) {
            onData({ type: 'stdout', data: text });
          }
        });

        stream.stderr.on('data', (data) => {
          const text = data.toString();
          errorOutput += text;
          if (onData) {
            onData({ type: 'stderr', data: text });
          }
        });
      });
    });
  }

  async executeCommands(commands, onProgress = null) {
    let conn;
    const results = [];

    try {
      conn = await this.connect();
      
      if (onProgress) {
        onProgress({ type: 'info', message: 'SSH connection established' });
      }

      for (const command of commands) {
        if (onProgress) {
          onProgress({ type: 'info', message: `Executing: ${command}` });
        }

        const output = await this.executeCommand(conn, command, (data) => {
          if (onProgress) {
            onProgress({ type: data.type, message: data.data });
          }
        });

        results.push({ command, output, success: true });
      }

      return results;
    } catch (error) {
      if (onProgress) {
        onProgress({ type: 'error', message: error.message });
      }
      throw error;
    } finally {
      if (conn) {
        conn.end();
      }
    }
  }

  async checkConnection() {
    let conn;
    try {
      conn = await this.connect();
      await this.executeCommand(conn, 'echo "Connection successful"');
      return { success: true, message: 'SSH connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      if (conn) {
        conn.end();
      }
    }
  }
}

module.exports = new SSHService();
