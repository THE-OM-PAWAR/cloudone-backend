const express = require('express');
const AppController = require('../controllers/app.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const appController = new AppController();

// Public routes - Marketplace
router.get('/marketplace', (req, res) => appController.getMarketplaceApps(req, res));
router.get('/marketplace/:slug', (req, res) => appController.getAppBySlug(req, res));

// Protected routes - User deployments
router.use(authMiddleware);

router.post('/:slug/deploy', (req, res) => appController.deployApp(req, res));
router.get('/deployments', (req, res) => appController.getUserDeployments(req, res));
router.get('/deployments/:projectName', (req, res) => appController.getDeploymentDetails(req, res));
router.post('/deployments/:projectName/stop', (req, res) => appController.stopDeployment(req, res));
router.post('/deployments/:projectName/start', (req, res) => appController.startDeployment(req, res));
router.delete('/deployments/:projectName', (req, res) => appController.deleteDeployment(req, res));
router.get('/deployments/:projectName/logs', (req, res) => appController.getDeploymentLogs(req, res));

module.exports = router;
