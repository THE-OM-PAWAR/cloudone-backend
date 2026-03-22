const cliAuthService = require('../services/cliAuth.service');

/**
 * Middleware to authenticate CLI requests
 * Checks for CLI token in Authorization header
 */
const authenticateCli = async (req, res, next) => {
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

    // Verify CLI token
    const user = await cliAuthService.verifyToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
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
    console.error('CLI auth middleware error:', error);

    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid CLI token',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.message === 'Token expired or revoked') {
      return res.status(401).json({
        success: false,
        message: 'CLI token expired or revoked',
        code: 'TOKEN_EXPIRED'
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

module.exports = authenticateCli;
