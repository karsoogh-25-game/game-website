// app/routes/shopUniqueItems.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shopUniqueItemController');

router.post('/:id/buy', ctrl.buyUniqueItem);

router.post('/:id/sell', ctrl.sellUniqueItem);

module.exports = router;