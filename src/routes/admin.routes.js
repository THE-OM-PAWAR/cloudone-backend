const express = require('express');
const AppController = require('../controllers/app.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const appController = new AppController();

// All admin routes require authentication
router.use(authMiddleware);

// TODO: Add admin role check middleware here
// For now, all authenticated users can access admin routes
// In production, add: router.use(adminMiddleware);

// App management
router.post('/apps', (req, res) => appController.createApp(req, res));
router.get('/apps', (req, res) => appController.getAllAppsAdmin(req, res));
router.put('/apps/:slug', (req, res) => appController.updateApp(req, res));
router.delete('/apps/:slug', (req, res) => appController.deleteApp(req, res));

module.exports = router;
