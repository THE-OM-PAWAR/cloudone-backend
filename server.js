const createApp = require('./src/app');
const config = require('./src/config');
const connectDB = require('./src/config/database');
const { Server } = require('socket.io');
const http = require('http');
const mongoose = require('mongoose');
const terminalSocket = require('./socket/terminal');

// Start server with proper error handling
const startServer = async () => {
  try {
    console.log('🚀 Starting CloudOne Server...');
    
    // Connect to MongoDB Atlas
    const dbConnection = await connectDB();
    
    if (!dbConnection) {
      console.log('⚠️  Starting server without database connection...');
      console.log('   Some features may not work properly.');
      console.log('   Please fix the database connection and restart.');
    }

    // Create Socket.IO server
    const io = new Server({
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Create Express app
    const app = createApp(io);
    const server = http.createServer(app);
    io.attach(server);

    // Initialize terminal socket handlers
    terminalSocket(io);

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
      });
    });

    // Start HTTP server
    server.listen(config.port, () => {
      console.log(`\n✅ CloudOne Server is running!`);
      console.log(`   🌐 Port: ${config.port}`);
      console.log(`   🔧 Environment: ${config.env}`);
      console.log(`   💚 Health Check: http://localhost:${config.port}/health`);
      console.log(`   🔗 API Base: http://localhost:${config.port}/api`);
      console.log(`   ⚡ Socket.IO: Ready for real-time updates`);
      
      if (mongoose.connection.readyState === 1) {
        console.log(`   📊 Database: Connected to ${mongoose.connection.name}`);
      } else {
        console.log(`   📊 Database: ⚠️  Not connected`);
      }
      console.log('');
    });

    // Graceful shutdown handler
    const gracefulShutdown = (signal) => {
      console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        console.log('🔌 HTTP server closed');
        
        if (mongoose.connection.readyState === 1) {
          mongoose.connection.close(false, () => {
            console.log('📊 MongoDB connection closed');
            console.log('👋 Server shutdown complete');
            process.exit(0);
          });
        } else {
          console.log('👋 Server shutdown complete');
          process.exit(0);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('querySrv ECONNREFUSED')) {
      console.error('\n🔧 MongoDB Atlas Connection Issues:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify MongoDB Atlas cluster is running');
      console.error('   3. Check network access settings in MongoDB Atlas');
      console.error('   4. Ensure your IP is whitelisted');
      console.error('   5. Try using a different DNS server');
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   - Run: npm run test:db (to test database connection)');
    console.error('   - Check your .env file for correct MONGODB_URI');
    console.error('   - Verify MongoDB Atlas cluster status');
    
    process.exit(1);
  }
};

// Start the server
startServer();