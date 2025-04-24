const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/userController');

router.get('/', ctrl.renderDashboard);

module.exports = router;
