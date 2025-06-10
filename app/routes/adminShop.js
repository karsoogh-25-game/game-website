// app/routes/adminShop.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminShopController');

// --- روت‌های مدیریت ارزها ---
router.post('/currencies', ctrl.createCurrency);
router.get('/currencies', ctrl.listCurrencies);
router.put('/currencies/:id', ctrl.updateCurrency);
router.put('/currencies/:id/modifier', ctrl.updateModifier);

// --- روت‌های مدیریت آیتم‌های خاص (در آینده تکمیل می‌شود) ---
// router.post('/unique-items', ctrl.createUniqueItem);
// router.get('/unique-items', ctrl.listUniqueItems);
// router.put('/unique-items/:id', ctrl.updateUniqueItem);
// router.delete('/unique-items/:id', ctrl.deleteUniqueItem);

module.exports = router;