const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is properly set
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('🔄 Connecting to MongoDB Atlas...');
    
    // MongoDB Atlas connection options - optimized for connection issues
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increased timeout for slow networks
      socketTimeoutMS: 75000, // Increased socket timeout
      connectTimeoutMS: 30000, // Increased connection timeout
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain a minimum of 2 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true, // Enable retryable writes
      w: 'majority' // Write concern
    };

    // Try to connect with retry logic
    let retries = 3;
    let conn;
    
    while (retries > 0) {
      try {
        conn = await mongoose.connect(process.env.MONGODB_URI, options);
        break; // Connection successful, exit retry loop
      } catch (error) {
        retries--;
        console.log(`⚠️  Connection attempt failed. Retries left: ${retries}`);
        
        if (retries === 0) {
          throw error; // Re-throw the error if no retries left
        }
        
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    mongoose.connection.on('connecting', () => {
      console.log('🔄 MongoDB connecting...');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    
    // More specific error handling for common MongoDB Atlas issues
    if (error.message.includes('querySrv ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('🌐 DNS Resolution Error - Possible solutions:');
      console.error('   1. Check your internet connection');
      console.error('   2. Try using a different DNS server (8.8.8.8, 1.1.1.1)');
      console.error('   3. Check if your firewall is blocking MongoDB connections');
      console.error('   4. Verify the cluster URL is correct');
      console.error('   5. Try connecting from a different network');
    } else if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication failed. Please check your username and password.');
    } else if (error.message.includes('network timeout')) {
      console.error('🌐 Network timeout. Please check your internet connection and MongoDB Atlas network access.');
    }
    
    // Don't exit the process immediately, allow for manual retry
    console.error('🔄 Server will continue running. Fix the connection and restart.');
    return null;
  }
};

module.exports = connectDB;
