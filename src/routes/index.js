const express = require('express');
const healthRoutes = require('./health.routes');
const createDeployRoutes = require('./deploy.routes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const appRoutes = require('./app.routes');
const adminRoutes = require('./admin.routes');
const githubRoutes = require('./github.routes');
const projectRoutes = require('./project.routes');
const webhookRoutes = require('./webhook.routes');

const cliRoutes = require('./cli.routes');

const createRoutes = (io) => {
  const router = express.Router();

  // Health check routes (no auth required)
  router.use('/health', healthRoutes);

  // Webhook routes (no auth required - verified by signature)
  router.use('/webhooks', webhookRoutes);

  // Auth routes (no auth required for sync)
  router.use('/auth', authRoutes);

  // User routes (auth required)
  router.use('/user', userRoutes);

  // GitHub routes (auth required)
  router.use('/github', githubRoutes);

  // Project routes (auth required)
  router.use('/projects', projectRoutes);

  // Deploy routes (auth required - will be protected)
  router.use('/deploy', createDeployRoutes(io));

  // App marketplace routes
  router.use('/apps', appRoutes);

  // Admin routes (auth required)
  router.use('/admin', adminRoutes);

  // CLI routes (mixed auth - some require CLI token, some require Clerk)
  router.use('/cli', cliRoutes);

  return router;
};

module.exports = createRoutes;
