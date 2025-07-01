// app/routes/shop.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shopController');

router.get('/data', ctrl.getShopData);

router.get('/my-assets', ctrl.getMyAssets);

router.post('/currencies/buy', ctrl.buyCurrency);
router.post('/currencies/sell', ctrl.sellCurrency);

module.exports = router;