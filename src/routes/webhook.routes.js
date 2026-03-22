const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// GitHub webhook endpoint (no auth required - verified by signature)
router.post('/github', webhookController.handleGitHubWebhook);

// Test endpoint
router.get('/test', webhookController.testWebhook);

module.exports = router;
