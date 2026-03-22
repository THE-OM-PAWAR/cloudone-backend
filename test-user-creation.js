require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

console.log('Testing User Creation in MongoDB...\n');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-deploy')
.then(async () => {
  console.log('✅ MongoDB connected successfully!\n');
  
  // Create a test user
  const testUser = {
    clerkId: 'test_clerk_id_' + Date.now(),
    email: 'test@example.com',
    name: 'Test User'
  };
  
  console.log('Creating test user:', testUser);
  
  try {
    const user = await User.create(testUser);
    console.log('\n✅ User created successfully!');
    console.log('User ID:', user._id);
    console.log('Clerk ID:', user.clerkId);
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Created At:', user.createdAt);
    
    // Find all users
    const allUsers = await User.find();
    console.log('\n📊 Total users in database:', allUsers.length);
    
    // Clean up test user
    await User.deleteOne({ _id: user._id });
    console.log('\n🧹 Test user cleaned up');
    
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
  }
  
  mongoose.connection.close();
  process.exit(0);
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});
