const createApp = require('./app');
const config = require('./config');
const { Server } = require('socket.io');
const http = require('http');
const mongoose = require('mongoose');

// MongoDB connection with proper async/await
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-deploy');
    console.log('✅ MongoDB connected successfully');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}:${mongoose.connection.port}`);

    const io = new Server({
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    const app = createApp(io);
    const server = http.createServer(app);
    io.attach(server);

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    server.listen(config.port, () => {
      console.log(`\n🚀 Server running on port ${config.port} in ${config.env} mode`);
      console.log(`   API: http://localhost:${config.port}/api`);
      console.log(`   Health: http://localhost:${config.port}/api/health`);
      console.log('   Socket.IO ready for real-time updates\n');
    });

    const gracefulShutdown = () => {
      console.log('\nReceived shutdown signal, closing server gracefully...');
      mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed');
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();
