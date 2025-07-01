// app/routes/adminUniqueItems.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminUniqueItemController');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `item-unique-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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

router.post('/', upload.single('image'), ctrl.createUniqueItem);
router.get('/', ctrl.listUniqueItems);
router.put('/:id', upload.single('image'), ctrl.updateUniqueItem);
router.delete('/:id', ctrl.deleteUniqueItem);

module.exports = router;