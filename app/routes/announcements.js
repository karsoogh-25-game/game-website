// app/routes/announcements.js
const express = require('express');
const path    = require('path');
const multer  = require('multer');
const ctrl    = require('../controllers/announcementController');

// تنظیم multer برای آپلود فایل‌ها در public/uploads
const upload = multer({
  dest: path.join(__dirname, '..', 'public', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 } // حداکثر 10MB
});

module.exports = (io) => {
  const router = express.Router();

  // middleware برای دسترسی به socket.io در ctrl
  router.use((req, _, next) => {
    req.io = io;
    next();
  });

  // GET /announcements/      → لیست اطلاعیه‌ها (JSON، مرتب‌شده نزولی)
  router.get('/', ctrl.listAnnouncements);

  // POST /announcements/     → ساخت اطلاعیه جدید (با فایل)
  router.post('/', upload.single('attachment'), ctrl.createAnnouncement);

  // PUT /announcements/:id   → ویرایش اطلاعیه (اختیاری فایل جدید)
  router.put('/:id', upload.single('attachment'), ctrl.updateAnnouncement);

  // DELETE /announcements/:id → حذف اطلاعیه
  router.delete('/:id', ctrl.deleteAnnouncement);

  return router;
};
