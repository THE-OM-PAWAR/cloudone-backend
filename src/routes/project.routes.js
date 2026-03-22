const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Deploy a new project
router.post('/deploy', projectController.deployProject);

// Get all user projects
router.get('/', projectController.getProjects);

// Get specific project
router.get('/:id', projectController.getProject);

// Get deployment logs
router.get('/:id/logs', projectController.getDeploymentLogs);

// Stop project
router.post('/:id/stop', projectController.stopProject);

// Restart project
router.post('/:id/restart', projectController.restartProject);

// Delete project
router.delete('/:id', projectController.deleteProject);

module.exports = router;
