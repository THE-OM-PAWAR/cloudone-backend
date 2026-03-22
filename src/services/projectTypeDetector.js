const fs = require('fs-extra');
const path = require('path');

class ProjectTypeDetector {
  /**
   * Detect project type based on files and package.json
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<Object>} Project type information
   */
  async detectProjectType(projectPath) {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      
      // Check if package.json exists
      if (!await fs.pathExists(packageJsonPath)) {
        return {
          type: 'static',
          buildCommand: null,
          startCommand: null,
          buildDir: '.',
          description: 'Static files (no package.json)'
        };
      }

      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const scripts = packageJson.scripts || {};

      // Detect Next.js
      if (dependencies.next || await fs.pathExists(path.join(projectPath, 'next.config.js'))) {
        return await this.detectNextJsType(projectPath, scripts);
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
      if (dependencies.vite || await fs.pathExists(path.join(projectPath, 'vite.config.js')) || await fs.pathExists(path.join(projectPath, 'vite.config.ts'))) {
        return {
          type: 'vite',
          buildCommand: 'npm run build',
          startCommand: 'npx serve -s dist',
          buildDir: 'dist',
          description: 'Vite project'
        };
      }

      // Detect Node.js API/Server
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
        const buildDir = await this.detectBuildDirectory(projectPath);
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
      console.error('Error detecting project type:', error);
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
   * Detect Next.js deployment type (static export vs SSR)
   */
  async detectNextJsType(projectPath, scripts) {
    // Check if it's configured for static export
    const nextConfigPath = path.join(projectPath, 'next.config.js');
    let isStaticExport = false;

    if (await fs.pathExists(nextConfigPath)) {
      try {
        const configContent = await fs.readFile(nextConfigPath, 'utf8');
        isStaticExport = configContent.includes('output: \'export\'') || 
                        configContent.includes('trailingSlash: true');
      } catch (error) {
        console.log('Could not read next.config.js, assuming SSR');
      }
    }

    // Check for export script
    if (scripts.export || isStaticExport) {
      return {
        type: 'nextjs-static',
        buildCommand: 'npm run build && npm run export',
        startCommand: 'npx serve -s out',
        buildDir: 'out',
        description: 'Next.js (Static Export)'
      };
    }

    // Default to SSR Next.js
    return {
      type: 'nextjs-ssr',
      buildCommand: 'npm run build',
      startCommand: 'npm start',
      buildDir: '.next',
      description: 'Next.js (SSR)'
    };
  }

  /**
   * Detect build directory by checking common locations
   */
  async detectBuildDirectory(projectPath) {
    const commonBuildDirs = ['dist', 'build', 'public', 'www', 'out'];
    
    for (const dir of commonBuildDirs) {
      if (await fs.pathExists(path.join(projectPath, dir))) {
        return dir;
      }
    }
    
    return 'dist'; // Default fallback
  }
}

module.exports = ProjectTypeDetector;