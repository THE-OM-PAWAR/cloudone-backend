require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Verifying Authentication Setup...\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   ✅ MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : '❌ Missing');
console.log('   ✅ CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 'Set' : '❌ Missing');
console.log('   ✅ CLERK_PUBLISHABLE_KEY:', process.env.CLERK_PUBLISHABLE_KEY ? 'Set' : '❌ Missing');
console.log('   ✅ PORT:', process.env.PORT || '3000 (default)');

// Test MongoDB connection
console.log('\n2. Testing MongoDB Connection...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-deploy')
  .then(async () => {
    console.log('   ✅ MongoDB connected successfully');
    console.log(`   ✅ Database: ${mongoose.connection.name}`);
    console.log(`   ✅ Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n3. Database Collections:');
    if (collections.length === 0) {
      console.log('   ℹ️  No collections yet (will be created on first use)');
    } else {
      collections.forEach(col => {
        console.log(`   ✅ ${col.name}`);
      });
    }
    
    // Check if User model works
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log('\n4. Users in Database:');
    console.log(`   📊 Total users: ${userCount}`);
    
    if (userCount > 0) {
      const users = await User.find().select('email name createdAt').limit(5);
      console.log('   Recent users:');
      users.forEach(user => {
        console.log(`     - ${user.email} (${user.name})`);
      });
    }
    
    console.log('\n✅ All checks passed! Your setup is ready.');
    console.log('\n📝 Next steps:');
    console.log('   1. Start backend: npm run dev');
    console.log('   2. Start frontend: cd ../frontend && npm run dev');
    console.log('   3. Visit: http://localhost:5173');
    console.log('   4. Sign up and test!\n');
    
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('   ❌ MongoDB connection failed:', err.message);
    console.log('\n💡 Make sure MongoDB is running:');
    console.log('   Windows: net start MongoDB');
    console.log('   Or: mongod --dbpath C:\\data\\db\n');
    process.exit(1);
  });
