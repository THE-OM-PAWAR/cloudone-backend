const express = require('express');
const router = express.Router();
const githubController = require('../controllers/github.controller');
const authMiddleware = require('../middlewares/authMiddleware');

// GitHub OAuth callback (NO auth required - GitHub redirects here)
router.get('/callback', githubController.handleCallback);

// All other routes require authentication
router.use(authMiddleware);

// Initiate GitHub OAuth flow
router.get('/auth', githubController.initiateOAuth);

// Get user's repositories
router.get('/repos', githubController.getRepositories);

// Get repository branches
router.get('/repos/:owner/:repo/branches', githubController.getBranches);

// Disconnect GitHub account
router.post('/disconnect', githubController.disconnectGitHub);

// Check GitHub connection status
router.get('/status', githubController.getConnectionStatus);

module.exports = router;
