const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authorization token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7);

    // Verify the token with Clerk
    const sessionClaims = await clerkClient.verifyToken(token);
    
    if (!sessionClaims) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(sessionClaims.sub);
    
    // Find or create user in our database
    let user = await User.findOne({ clerkId: clerkUser.id });
    
    if (!user) {
      user = await User.create({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
      });
    }

    // Attach user info to request
    req.user = {
      id: user._id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Check if it's a token expiration error
    if (error.reason === 'token-expired') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please refresh and try again.',
        code: 'TOKEN_EXPIRED',
        error: error.message 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed',
      code: 'AUTH_FAILED',
      error: error.message 
    });
  }
};

module.exports = authMiddleware;
