// app/routes/shopUniqueItems.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shopUniqueItemController');

// روت برای خرید یک آیتم خاص
router.post('/:id/buy', ctrl.buyUniqueItem);

// روت برای فروش یک آیتم خاص به فروشگاه
router.post('/:id/sell', ctrl.sellUniqueItem);

module.exports = router;