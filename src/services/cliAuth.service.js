const CliToken = require('../../models/CliToken');
const CliSession = require('../../models/CliSession');
const User = require('../../models/User');

class CliAuthService {
  /**
   * Initialize CLI authentication session
   * Returns a session ID and login URL
   */
  async initializeAuth() {
    const sessionId = CliSession.generateSessionId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await CliSession.create({
      sessionId,
      status: 'pending',
      expiresAt
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${baseUrl}/cli-auth?sessionId=${sessionId}`;

    return {
      sessionId,
      loginUrl,
      expiresAt
    };
  }

  /**
   * Complete CLI authentication
   * Called when user confirms in browser
   */
  async completeAuth(sessionId, userId) {
    const session = await CliSession.findOne({ sessionId });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.isExpired()) {
      throw new Error('Session expired');
    }

    if (session.status !== 'pending') {
      throw new Error('Session already used');
    }

    // Generate CLI token
    const token = CliToken.generateToken();
    const tokenHash = CliToken.hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create token in database
    await CliToken.create({
      userId,
      tokenHash,
      expiresAt
    });

    // Update session
    session.userId = userId;
    session.token = token;
    session.status = 'authenticated';
    await session.save();

    return {
      token,
      expiresAt
    };
  }

  /**
   * Check authentication status
   * Used by CLI to poll for completion
   */
  async checkAuthStatus(sessionId) {
    const session = await CliSession.findOne({ sessionId });

    if (!session) {
      return {
        status: 'not_found',
        message: 'Session not found'
      };
    }

    if (session.isExpired()) {
      session.status = 'expired';
      await session.save();
      
      return {
        status: 'expired',
        message: 'Session expired'
      };
    }

    if (session.status === 'authenticated') {
      return {
        status: 'authenticated',
        token: session.token
      };
    }

    return {
      status: 'pending',
      message: 'Waiting for authentication'
    };
  }

  /**
   * Verify CLI token
   * Used by CLI authentication middleware
   */
  async verifyToken(token) {
    const tokenHash = CliToken.hashToken(token);
    
    const cliToken = await CliToken.findOne({ tokenHash }).populate('userId');

    if (!cliToken) {
      throw new Error('Invalid token');
    }

    if (!cliToken.isValid()) {
      throw new Error('Token expired or revoked');
    }

    // Update last used timestamp
    cliToken.lastUsed = new Date();
    await cliToken.save();

    return cliToken.userId;
  }

  /**
   * List all CLI tokens for a user
   */
  async listUserTokens(userId) {
    const tokens = await CliToken.find({ userId, revoked: false })
      .select('-tokenHash')
      .sort({ createdAt: -1 });

    return tokens;
  }

  /**
   * Revoke a CLI token
   */
  async revokeToken(tokenId, userId) {
    const token = await CliToken.findOne({ _id: tokenId, userId });

    if (!token) {
      throw new Error('Token not found');
    }

    token.revoked = true;
    await token.save();

    return token;
  }

  /**
   * Revoke all CLI tokens for a user
   */
  async revokeAllTokens(userId) {
    await CliToken.updateMany(
      { userId, revoked: false },
      { revoked: true }
    );
  }

  /**
   * Clean up expired sessions and tokens
   */
  async cleanup() {
    const now = new Date();

    // Delete expired sessions
    await CliSession.deleteMany({ expiresAt: { $lt: now } });

    // Delete expired and revoked tokens older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    await CliToken.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },
        { revoked: true, createdAt: { $lt: thirtyDaysAgo } }
      ]
    });
  }
}

module.exports = new CliAuthService();
