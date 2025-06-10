// app/routes/shop.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shopController');

// روت برای دریافت اطلاعات کلی فروشگاه (ارزها و آیتم‌ها)
router.get('/data', ctrl.getShopData);

// روت برای دریافت دارایی‌های گروه کاربر
router.get('/my-assets', ctrl.getMyAssets);

// --- START of EDIT: افزودن روت‌های خرید و فروش ---
router.post('/currencies/buy', ctrl.buyCurrency);
router.post('/currencies/sell', ctrl.sellCurrency);
// --- END of EDIT ---

module.exports = router;