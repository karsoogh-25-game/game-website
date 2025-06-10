// app/routes/adminShop.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminShopController');
const path = require('path');
const multer = require('multer');

// --- START of EDIT: تنظیمات Multer برای آپلود عکس آیتم‌ها ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // فایل‌ها در پوشه public/uploads ذخیره می‌شوند
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    // یک نام منحصر به فرد برای فایل ایجاد می‌شود تا از تداخل جلوگیری شود
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `item-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // محدودیت حجم فایل: 5 مگابایت
  fileFilter: (req, file, cb) => {
    // فقط فایل‌های تصویری مجاز هستند
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('فقط فایل‌های تصویری مجاز هستند!'));
  }
});
// --- END of EDIT ---


// --- روت‌های مدیریت ارزها ---
// میان‌افزار آپلود به روت‌های ایجاد و ویرایش اضافه شد
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