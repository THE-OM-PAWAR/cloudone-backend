const cliAuthService = require('../services/cliAuth.service');

class CliAuthController {
  /**
   * Initialize CLI authentication
   * POST /api/cli/auth/init
   */
  async initAuth(req, res) {
    try {
      const result = await cliAuthService.initializeAuth();

      res.json({
        success: true,
        sessionId: result.sessionId,
        loginUrl: result.loginUrl,
        expiresAt: result.expiresAt,
        message: 'Open the login URL in your browser to authenticate'
      });
    } catch (error) {
      console.error('Error initializing CLI auth:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize authentication',
        error: error.message
      });
    }
  }

  /**
   * Complete CLI authentication (called from browser)
   * POST /api/cli/auth/complete
   * Requires Clerk authentication
   */
  async completeAuth(req, res) {
    try {
      const { sessionId } = req.body;
      const userId = req.user.id; // From Clerk auth middleware

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const result = await cliAuthService.completeAuth(sessionId, userId);

      res.json({
        success: true,
        message: 'CLI authentication successful',
        expiresAt: result.expiresAt
      });
    } catch (error) {
      console.error('Error completing CLI auth:', error);
      
      if (error.message === 'Session not found') {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (error.message === 'Session expired') {
        return res.status(400).json({
          success: false,
          message: 'Session expired. Please try again.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to complete authentication',
        error: error.message
      });
    }
  }

  /**
   * Check authentication status (polled by CLI)
   * GET /api/cli/auth/status?sessionId=xxx
   */
  async checkStatus(req, res) {
    try {
      const { sessionId } = req.query;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const result = await cliAuthService.checkAuthStatus(sessionId);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error checking auth status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check authentication status',
        error: error.message
      });
    }
  }

  /**
   * List user's CLI tokens
   * GET /api/cli/auth/tokens
   * Requires Clerk authentication
   */
  async listTokens(req, res) {
    try {
      const userId = req.user.id;
      const tokens = await cliAuthService.listUserTokens(userId);

      res.json({
        success: true,
        tokens
      });
    } catch (error) {
      console.error('Error listing tokens:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list tokens',
        error: error.message
      });
    }
  }

  /**
   * Revoke a CLI token
   * DELETE /api/cli/auth/tokens/:tokenId
   * Requires Clerk authentication
   */
  async revokeToken(req, res) {
    try {
      const { tokenId } = req.params;
      const userId = req.user.id;

      await cliAuthService.revokeToken(tokenId, userId);

      res.json({
        success: true,
        message: 'Token revoked successfully'
      });
    } catch (error) {
      console.error('Error revoking token:', error);
      
      if (error.message === 'Token not found') {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to revoke token',
        error: error.message
      });
    }
  }

  /**
   * Revoke all CLI tokens
   * DELETE /api/cli/auth/tokens
   * Requires Clerk authentication
   */
  async revokeAllTokens(req, res) {
    try {
      const userId = req.user.id;
      await cliAuthService.revokeAllTokens(userId);

      res.json({
        success: true,
        message: 'All tokens revoked successfully'
      });
    } catch (error) {
      console.error('Error revoking all tokens:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke tokens',
        error: error.message
      });
    }
  }
}

module.exports = new CliAuthController();
