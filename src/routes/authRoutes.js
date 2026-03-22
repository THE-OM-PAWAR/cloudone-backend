const express = require('express');
const { syncUser } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/sync-user', syncUser);

module.exports = router;
