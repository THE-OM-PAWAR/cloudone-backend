const crypto = require('crypto');

class ProjectNameGenerator {
  /**
   * Generate a unique project name from repository URL
   * @param {string} repoUrl - GitHub repository URL
   * @returns {string} Unique project name
   */
  static generateProjectName(repoUrl) {
    try {
      // Extract repository name from URL
      const repoName = this.extractRepoName(repoUrl);
      
      // Generate random suffix
      const randomSuffix = this.generateRandomSuffix();
      
      // Combine and sanitize
      const projectName = `${repoName}-${randomSuffix}`;
      return this.sanitizeProjectName(projectName);
    } catch (error) {
      throw new Error(`Failed to generate project name: ${error.message}`);
    }
  }

  /**
   * Extract repository name from GitHub URL
   * @param {string} repoUrl - GitHub repository URL
   * @returns {string} Repository name
   */
  static extractRepoName(repoUrl) {
    // Handle different GitHub URL formats
    const patterns = [
      /github\.com\/[^\/]+\/([^\/]+)\.git$/,  // https://github.com/user/repo.git
      /github\.com\/[^\/]+\/([^\/]+)\/?$/,    // https://github.com/user/repo or https://github.com/user/repo/
      /github\.com\/[^\/]+\/([^\/]+)\/.*$/    // https://github.com/user/repo/anything
    ];

    for (const pattern of patterns) {
      const match = repoUrl.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    throw new Error('Invalid GitHub repository URL format');
  }

  /**
   * Generate random suffix for uniqueness
   * @returns {string} Random suffix
   */
  static generateRandomSuffix() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Sanitize project name for use in URLs and file systems
   * @param {string} name - Project name to sanitize
   * @returns {string} Sanitized project name
   */
  static sanitizeProjectName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')  // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
      .substring(0, 50);            // Limit length
  }

  /**
   * Validate GitHub repository URL
   * @param {string} repoUrl - Repository URL to validate
   * @returns {boolean} True if valid
   */
  static isValidGitHubUrl(repoUrl) {
    const githubPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+/;
    return githubPattern.test(repoUrl);
  }
}

module.exports = ProjectNameGenerator;