const express = require('express');
const { getCurrentUser, getUserProjects } = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/me', getCurrentUser);
router.get('/projects', getUserProjects);

module.exports = router;
