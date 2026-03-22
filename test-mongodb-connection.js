require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔄 Testing MongoDB Atlas Connection...');
console.log('📍 MongoDB URI:', process.env.MONGODB_URI ? 'Configured ✅' : 'Missing ❌');

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

// MongoDB Atlas connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferMaxEntries: 0, // Disable mongoose buffering
  bufferCommands: false, // Disable mongoose buffering
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 5, // Maintain a minimum of 5 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

console.log('⏳ Attempting connection...');

mongoose.connect(process.env.MONGODB_URI, options)
.then(() => {
  console.log('✅ MongoDB Atlas connected successfully!');
  console.log('📊 Database:', mongoose.connection.name);
  console.log('🌐 Host:', mongoose.connection.host);
  console.log('🔌 Ready State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');
  
  // Test basic operations
  console.log('\n🔍 Testing database operations...');
  
  // List collections
  mongoose.connection.db.listCollections().toArray((err, collections) => {
    if (err) {
      console.error('❌ Error listing collections:', err);
    } else {
      console.log('\n📁 Existing collections:');
      if (collections.length === 0) {
        console.log('  📝 No collections found (this is normal for a new database)');
      } else {
        collections.forEach(col => console.log(`  📄 ${col.name}`));
      }
    }
    
    // Test write operation
    const testCollection = mongoose.connection.db.collection('connection_test');
    testCollection.insertOne({ 
      test: true, 
      timestamp: new Date(),
      message: 'Connection test successful' 
    })
    .then(() => {
      console.log('✅ Write operation successful');
      
      // Clean up test document
      return testCollection.deleteOne({ test: true });
    })
    .then(() => {
      console.log('✅ Delete operation successful');
      console.log('\n🎉 All tests passed! MongoDB Atlas is properly configured.');
    })
    .catch((writeErr) => {
      console.error('❌ Write/Delete operation failed:', writeErr);
    })
    .finally(() => {
      mongoose.connection.close();
      process.exit(0);
    });
  });
})
.catch((err) => {
  console.error('❌ MongoDB Atlas connection error:', err.message);
  
  // Provide specific troubleshooting advice
  console.log('\n🔧 Troubleshooting tips:');
  
  if (err.message.includes('authentication failed')) {
    console.log('  🔐 Check your username and password in the connection string');
    console.log('  👤 Ensure the database user has proper permissions');
  } else if (err.message.includes('network timeout') || err.message.includes('ETIMEDOUT')) {
    console.log('  🌐 Check your internet connection');
    console.log('  🔒 Verify MongoDB Atlas network access settings (IP whitelist)');
    console.log('  🏠 Add your current IP address to the allowed list');
  } else if (err.message.includes('ENOTFOUND')) {
    console.log('  🔍 Check the cluster URL in your connection string');
    console.log('  ⚡ Ensure your MongoDB Atlas cluster is running');
  } else if (err.message.includes('bad auth')) {
    console.log('  🔑 Verify your database credentials');
    console.log('  📝 Check if the database name in the URI is correct');
  }
  
  console.log('\n📖 For more help, visit: https://docs.atlas.mongodb.com/troubleshoot-connection/');
  process.exit(1);
});
