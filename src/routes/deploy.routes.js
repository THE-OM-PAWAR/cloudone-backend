const express = require('express');
const DeployController = require('../controllers/deploy.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const createDeployRoutes = (io) => {
  const router = express.Router();
  const deployController = new DeployController(io);

  // Protect all deploy routes with authentication
  router.use(authMiddleware);

  /**
   * Deploy a new application
   * POST /api/deploy
   * Body: { repoUrl: "https://github.com/user/project" }
   */
  router.post('/', (req, res) => deployController.deployApplication(req, res));

  /**
   * Get all deployments
   * GET /api/deploy
   */
  router.get('/', (req, res) => deployController.getAllDeployments(req, res));

  /**
   * Get specific deployment info
   * GET /api/deploy/:projectName
   */
  router.get('/:projectName', (req, res) => deployController.getDeploymentInfo(req, res));

  /**
   * Delete a deployment
   * DELETE /api/deploy/:projectName
   */
  router.delete('/:projectName', (req, res) => deployController.deleteDeployment(req, res));

  /**
   * Redeploy an existing application
   * POST /api/deploy/:projectName/redeploy
   */
  router.post('/:projectName/redeploy', (req, res) => deployController.redeployApplication(req, res));

  /**
   * Get deployment status
   * GET /api/deploy/:projectName/status
   */
  router.get('/:projectName/status', (req, res) => deployController.getDeploymentStatus(req, res));

  return router;
};

module.exports = createDeployRoutes;