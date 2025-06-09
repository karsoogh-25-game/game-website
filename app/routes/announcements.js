// app/routes/announcements.js

const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const multer    = require('multer');
const { Announcement, AnnouncementAttachment } = require('../models');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'public', 'uploads'),
  filename: (req, file, cb) => {
    // Generate a unique filename while preserving the original extension
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }  // حداکثر 10 مگابایت
});

module.exports = (io) => {
  const router = express.Router();
  // START of EDIT: ایمپورت کردن کنترلر برای دسترسی به توابع آن
  const ctrl = require('../controllers/announcementController');
  // END of EDIT

  // make socket.io available in all handlers
  router.use((req, _, next) => {
    req.io = io;
    next();
  });

  // START of EDIT: اضافه کردن مسیر جدید برای واکشی آخرین اطلاعیه
  /**
   * ▪ GET /api/announcements/latest
   * فقط آخرین اطلاعیه را برای داشبورد برمی‌گرداند (بهینه)
   */
  router.get('/latest', ctrl.getLatestAnnouncement);
  // END of EDIT

  /**
   * ▪ GET /api/announcements
   * لیست عمومی اطلاعیه‌ها به همراه ضمائم
   */
  router.get('/', ctrl.listAnnouncements);

  /**
   * ▪ POST /admin/api/announcements
   * ایجاد اطلاعیه جدید با چند فایل ضمیمه
   */
  router.post(
    '/',
    upload.array('attachments', 5),            // حداکثر ۵ فایل
    ctrl.createAnnouncement
  );

  /**
   * ▪ PUT /admin/api/announcements/:id
   * ویرایش اطلاعیه (حذف/اضافه ضمائم)
   */
  router.put(
    '/:id',
    upload.array('attachments', 5),
    ctrl.updateAnnouncement
  );

  /**
   * ▪ DELETE /admin/api/announcements/:id
   * حذف اطلاعیه و همه ضمائم آن
   */
  router.delete('/:id', ctrl.deleteAnnouncement);

  return router;
};