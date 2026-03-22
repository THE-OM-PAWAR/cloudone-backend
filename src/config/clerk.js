const { Clerk } = require('@clerk/clerk-sdk-node');

const clerkClient = Clerk({
  secretKey: process.env.CLERK_SECRET_KEY,
});

module.exports = { clerkClient };
