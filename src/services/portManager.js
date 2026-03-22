const fs = require('fs-extra');
const path = require('path');

class PortManager {
  constructor() {
    this.portsFilePath = path.join(__dirname, '../../data/ports.json');
    this.startPort = 3001;
    this.maxPort = 9999;
  }

  /**
   * Initialize ports data file
   */
  async initialize() {
    try {
      // Ensure data directory exists
      await fs.ensureDir(path.dirname(this.portsFilePath));
      
      // Create ports file if it doesn't exist
      if (!await fs.pathExists(this.portsFilePath)) {
        const initialData = {
          usedPorts: [],
          projectPorts: {},
          lastAssignedPort: this.startPort - 1
        };
        await fs.writeJson(this.portsFilePath, initialData, { spaces: 2 });
      }
    } catch (error) {
      throw new Error(`Failed to initialize port manager: ${error.message}`);
    }
  }

  /**
   * Get next available port
   * @returns {Promise<number>} Available port number
   */
  async getNextAvailablePort() {
    try {
      await this.initialize();
      const data = await fs.readJson(this.portsFilePath);
      
      let nextPort = Math.max(data.lastAssignedPort + 1, this.startPort);
      
      // Find next available port
      while (data.usedPorts.includes(nextPort) && nextPort <= this.maxPort) {
        nextPort++;
      }
      
      if (nextPort > this.maxPort) {
        throw new Error('No available ports in range');
      }
      
      return nextPort;
    } catch (error) {
      throw new Error(`Failed to get next available port: ${error.message}`);
    }
  }

  /**
   * Reserve a port for a project
   * @param {string} projectName - Project name
   * @param {number} port - Port to reserve
   */
  async reservePort(projectName, port) {
    try {
      await this.initialize();
      const data = await fs.readJson(this.portsFilePath);
      
      // Check if port is already in use
      if (data.usedPorts.includes(port)) {
        throw new Error(`Port ${port} is already in use`);
      }
      
      // Reserve the port
      data.usedPorts.push(port);
      data.projectPorts[projectName] = port;
      data.lastAssignedPort = Math.max(data.lastAssignedPort, port);
      
      await fs.writeJson(this.portsFilePath, data, { spaces: 2 });
      
      console.log(`✅ Port ${port} reserved for project: ${projectName}`);
    } catch (error) {
      throw new Error(`Failed to reserve port: ${error.message}`);
    }
  }

  /**
   * Release a port from a project
   * @param {string} projectName - Project name
   */
  async releasePort(projectName) {
    try {
      await this.initialize();
      const data = await fs.readJson(this.portsFilePath);
      
      const port = data.projectPorts[projectName];
      if (!port) {
        console.log(`⚠️ No port found for project: ${projectName}`);
        return;
      }
      
      // Remove port from used ports
      data.usedPorts = data.usedPorts.filter(p => p !== port);
      delete data.projectPorts[projectName];
      
      await fs.writeJson(this.portsFilePath, data, { spaces: 2 });
      
      console.log(`✅ Port ${port} released from project: ${projectName}`);
    } catch (error) {
      throw new Error(`Failed to release port: ${error.message}`);
    }
  }

  /**
   * Get port for a specific project
   * @param {string} projectName - Project name
   * @returns {Promise<number|null>} Port number or null if not found
   */
  async getProjectPort(projectName) {
    try {
      await this.initialize();
      const data = await fs.readJson(this.portsFilePath);
      return data.projectPorts[projectName] || null;
    } catch (error) {
      throw new Error(`Failed to get project port: ${error.message}`);
    }
  }

  /**
   * Get all used ports
   * @returns {Promise<number[]>} Array of used ports
   */
  async getUsedPorts() {
    try {
      await this.initialize();
      const data = await fs.readJson(this.portsFilePath);
      return data.usedPorts;
    } catch (error) {
      throw new Error(`Failed to get used ports: ${error.message}`);
    }
  }

  /**
   * Get all project-port mappings
   * @returns {Promise<Object>} Object with project names as keys and ports as values
   */
  async getAllProjectPorts() {
    try {
      await this.initialize();
      const data = await fs.readJson(this.portsFilePath);
      return data.projectPorts;
    } catch (error) {
      throw new Error(`Failed to get all project ports: ${error.message}`);
    }
  }
}

module.exports = PortManager;