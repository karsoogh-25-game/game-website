const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');

router.post('/api/register/step1',        ctrl.registerStep1);
router.post('/api/register/step2',        ctrl.registerStep2);
router.post('/api/register/verify-code',  ctrl.verifyCode);
router.post('/api/register/set-password', ctrl.registerSetPassword);

// ورود
router.post('/api/login', ctrl.login);

// خروج
router.get('/logout', ctrl.logout);

module.exports = router;
