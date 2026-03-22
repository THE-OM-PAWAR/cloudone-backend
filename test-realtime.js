const { Server } = require('socket.io');
const DeploymentProgress = require('./src/services/deploymentProgress');

// Create a test Socket.IO server
const io = new Server(3001, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

console.log('Test Socket.IO server running on port 3001');

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Test deployment progress
  setTimeout(() => {
    const deploymentId = 'test_deployment_123';
    const progress = new DeploymentProgress(io, deploymentId);
    
    console.log('Starting test deployment...');
    progress.start();
    
    setTimeout(() => progress.step('Test Step', 'Testing real-time updates'), 1000);
    setTimeout(() => progress.info('This is a test info message'), 2000);
    setTimeout(() => progress.success('Test step completed'), 3000);
    setTimeout(() => progress.complete({ message: 'Test deployment complete!' }), 4000);
    
  }, 1000);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('Shutting down test server...');
  process.exit(0);
});