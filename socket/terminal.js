const SSHClient = require('../ssh/sshClient');

class TerminalSession {
  constructor(socket) {
    if (!socket) {
      throw new Error('Socket is required for TerminalSession');
    }
    this.socket = socket;
    this.sshClient = new SSHClient();
    this.sshStream = null;
    this.isActive = false;
  }

  async initialize() {
    try {
      console.log(`🖥️  Initializing terminal session for socket: ${this.socket.id}`);
      
      // Create SSH shell
      console.log('🔧 Creating SSH shell session...');
      this.sshStream = await this.sshClient.createShell();
      this.isActive = true;

      console.log(`✅ SSH shell session created successfully for socket: ${this.socket.id}`);
      console.log('🎮 Terminal is ready for user input');
      console.log(`🎉 TERMINAL LOGIN SUCCESSFUL! - ${new Date().toISOString()}`);
      console.log('=' .repeat(60));

      // Set up stream event handlers
      this.setupStreamHandlers();
      
      
      // Send initial connection success message
      this.socket.emit('terminal-output', '\r\n🔗 Connected to remote server\r\n');
      this.socket.emit('terminal-output', '🎉 SSH login successful! You can now execute commands.\r\n\r\n');
      
      console.log(`🎯 Terminal session fully initialized for socket: ${this.socket.id}`);
    } catch (error) {
      console.error(`❌ Failed to initialize terminal session:`, error.message);
      console.error('Error details:', error);
      
      if (this.socket && this.socket.emit) {
        this.socket.emit('terminal-error', {
          message: 'Failed to connect to remote server',
          error: error.message
        });
      } else {
        console.error('❌ Socket is not available for error emission');
      }
    }
  }

  setupStreamHandlers() {
    if (!this.sshStream) {
      console.error('❌ SSH stream is not available for setting up handlers');
      return;
    }
    
    if (!this.socket) {
      console.error('❌ Socket is not available for setting up handlers');
      return;
    }

    // Handle data from SSH stream (server output)
    this.sshStream.on('data', (data) => {
      if (this.isActive && this.socket) {
        this.socket.emit('terminal-output', data.toString());
      }
    });

    // Handle SSH stream close
    this.sshStream.on('close', () => {
      console.log(`SSH stream closed for socket: ${this.socket?.id || 'unknown'}`);
      this.isActive = false;
      if (this.socket) {
        this.socket.emit('terminal-output', '\r\n🔌 Connection to remote server closed\r\n');
        this.socket.emit('terminal-disconnected');
      }
    });

    // Handle SSH stream errors
    this.sshStream.on('error', (error) => {
      console.error(`SSH stream error for socket ${this.socket?.id || 'unknown'}:`, error);
      if (this.socket) {
        this.socket.emit('terminal-error', {
          message: 'SSH stream error',
          error: error.message
        });
      }
    });

    // Set terminal size (default)
    this.sshStream.setWindow(80, 24);
  }

  handleInput(data) {
    if (this.sshStream && this.isActive) {
      this.sshStream.write(data);
    }
  }

  handleResize(cols, rows) {
    if (this.sshStream && this.isActive) {
      try {
        this.sshStream.setWindow(rows, cols);
        console.log(`Terminal resized for socket ${this.socket.id}: ${cols}x${rows}`);
      } catch (error) {
        console.error(`Failed to resize terminal for socket ${this.socket.id}:`, error);
      }
    }
  }

  destroy() {
    console.log(`🗑️  Destroying terminal session for socket: ${this.socket.id}`);
    console.log('🔌 Closing SSH connection...');
    this.isActive = false;
    
    if (this.sshStream) {
      this.sshStream.end();
      this.sshStream = null;
      console.log('✅ SSH stream closed');
    }
    
    if (this.sshClient) {
      this.sshClient.disconnect();
      this.sshClient = null;
      console.log('✅ SSH client disconnected');
    }
    
    console.log(`🧹 Terminal session cleanup completed for socket: ${this.socket.id}`);
  }
}

/**
 * Initialize terminal socket handlers
 * @param {SocketIO.Server} io - Socket.io server instance
 */
function initializeTerminalSocket(io) {
  // Create terminal namespace
  const terminalNamespace = io.of('/terminal');
  
  // Store active sessions
  const activeSessions = new Map();

  terminalNamespace.on('connection', (socket) => {
    console.log('🌐 Terminal client connected:', socket.id);
    console.log('🚀 Starting SSH connection process...');

    // Create new terminal session
    const terminalSession = new TerminalSession(socket);
    activeSessions.set(socket.id, terminalSession);

    // Initialize the terminal session
    terminalSession.initialize();

    // Handle terminal input from client
    socket.on('terminal-input', (data) => {
      const session = activeSessions.get(socket.id);
      if (session) {
        session.handleInput(data);
      }
    });

    // Handle terminal resize
    socket.on('terminal-resize', ({ cols, rows }) => {
      const session = activeSessions.get(socket.id);
      if (session) {
        session.handleResize(cols, rows);
      }
    });

    // Handle client disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Terminal client disconnected: ${socket.id}, reason: ${reason}`);
      
      const session = activeSessions.get(socket.id);
      if (session) {
        session.destroy();
        activeSessions.delete(socket.id);
      }
    });

    // Handle manual terminal disconnect
    socket.on('terminal-disconnect', () => {
      console.log(`Manual terminal disconnect requested: ${socket.id}`);
      
      const session = activeSessions.get(socket.id);
      if (session) {
        session.destroy();
        activeSessions.delete(socket.id);
      }
      
      socket.emit('terminal-disconnected');
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
      
      const session = activeSessions.get(socket.id);
      if (session) {
        session.destroy();
        activeSessions.delete(socket.id);
      }
    });
  });

  // Cleanup function for graceful shutdown
  const cleanup = () => {
    console.log('Cleaning up terminal sessions...');
    activeSessions.forEach((session, socketId) => {
      session.destroy();
    });
    activeSessions.clear();
  };

  // Register cleanup handlers
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  return terminalNamespace;
}

module.exports = initializeTerminalSocket;