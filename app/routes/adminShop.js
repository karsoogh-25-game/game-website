// app/routes/adminShop.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminShopController');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `item-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('فقط فایل‌های تصویری مجاز هستند!'));
  }
});


// --- روت‌های مدیریت ارزها ---
router.post('/currencies', upload.single('image'), ctrl.createCurrency);
router.get('/currencies', ctrl.listCurrencies);
router.put('/currencies/:id', upload.single('image'), ctrl.updateCurrency);
router.put('/currencies/:id/modifier', ctrl.updateModifier);
router.delete('/currencies/:id', ctrl.deleteCurrency);


// --- روت‌های مدیریت آیتم‌های خاص (در آینده تکمیل می‌شود) ---
// router.post('/unique-items', upload.single('image'), ctrl.createUniqueItem);
// router.get('/unique-items', ctrl.listUniqueItems);
// router.put('/unique-items/:id', upload.single('image'), ctrl.updateUniqueItem);
// router.delete('/unique-items/:id', ctrl.deleteUniqueItem);

module.exports = router;