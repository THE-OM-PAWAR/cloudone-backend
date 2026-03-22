const express = require('express');
const router = express.Router();
const cliAuthController = require('../controllers/cliAuth.controller');
const cliController = require('../controllers/cli.controller');
const authMiddleware = require('../middlewares/authMiddleware'); // Clerk auth
const cliAuthMiddleware = require('../middlewares/cliAuth.middleware'); // CLI auth

// ============================================
// CLI AUTHENTICATION ROUTES
// ============================================

// Initialize CLI authentication (no auth required)
router.post('/auth/init', cliAuthController.initAuth);

// Check authentication status (no auth required - polled by CLI)
router.get('/auth/status', cliAuthController.checkStatus);

// Complete authentication (requires Clerk auth from browser)
router.post('/auth/complete', authMiddleware, cliAuthController.completeAuth);

// Token management (requires Clerk auth from web)
router.get('/auth/tokens', authMiddleware, cliAuthController.listTokens);
router.delete('/auth/tokens/:tokenId', authMiddleware, cliAuthController.revokeToken);
router.delete('/auth/tokens', authMiddleware, cliAuthController.revokeAllTokens);

// ============================================
// CLI API ROUTES (require CLI authentication)
// ============================================

// All routes below require CLI token authentication
router.use(cliAuthMiddleware);

// GitHub routes
router.get('/github/repos', cliController.getRepositories);
router.get('/github/repos/:owner/:repo/branches', cliController.getBranches);

// Deployment routes
router.post('/deploy', cliController.deploy);
router.get('/deploy', cliController.listDeployments);
router.get('/deploy/status/:deploymentId', cliController.getDeploymentStatus);

module.exports = router;
