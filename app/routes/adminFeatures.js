const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminFeatureController');

// مسیر برای گرفتن لیست تمام قابلیت‌ها
router.get('/', ctrl.getFeatureFlags);

// مسیر برای به‌روزرسانی وضعیت قابلیت‌ها
router.put('/', ctrl.updateFeatureFlags);

module.exports = router;