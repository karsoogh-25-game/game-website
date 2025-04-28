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

  // make socket.io available in all handlers
  router.use((req, _, next) => {
    req.io = io;
    next();
  });

  /**
   * ▪ GET /api/announcements
   *   لیست عمومی اطلاعیه‌ها به همراه ضمائم
   */
  router.get('/', async (req, res) => {
    try {
      const rows = await Announcement.findAll({
        order: [['createdAt', 'DESC']],
        include: {
          model: AnnouncementAttachment,
          as: 'attachments',
          attributes: ['id', 'originalName', 'path']
        }
      });
      return res.json(rows);
    } catch (err) {
      console.error('Error in GET /api/announcements:', err);
      return res.status(500).json({ message: 'خطا در خواندن اطلاعیه‌ها' });
    }
  });

  /**
   * ▪ POST /admin/api/announcements
   *   ایجاد اطلاعیه جدید با چند فایل ضمیمه
   */
  router.post(
    '/',
    upload.array('attachments', 5),            // حداکثر ۵ فایل
    require('../controllers/announcementController').createAnnouncement
  );

  /**
   * ▪ PUT /admin/api/announcements/:id
   *   ویرایش اطلاعیه (حذف/اضافه ضمائم)
   */
  router.put(
    '/:id',
    upload.array('attachments', 5),
    require('../controllers/announcementController').updateAnnouncement
  );

  /**
   * ▪ DELETE /admin/api/announcements/:id
   *   حذف اطلاعیه و همه ضمائم آن
   */
  router.delete('/:id', async (req, res) => {
    try {
      const ann = await Announcement.findByPk(req.params.id, {
        include: { model: AnnouncementAttachment, as: 'attachments' }
      });
      if (!ann) {
        return res.status(404).json({ message: 'اطلاعیه یافت نشد' });
      }

      // پاک‌کردن فایل‌های فیزیکی
      await Promise.all(ann.attachments.map(att => {
        const fullPath = path.join(__dirname, '..', 'public', att.path);
        fs.unlink(fullPath, err => err && console.warn('unlink failed:', err));
      }));

      // حذف رکورد اطلاعیه (ضمائم با CASCADE پاک می‌شوند)
      await ann.destroy();

      req.io.emit('announcementDeleted', { id: ann.id });
      return res.status(204).end();
    } catch (err) {
      console.error('Error in DELETE /admin/api/announcements/:id:', err);
      return res.status(400).json({ message: 'خطا در حذف اطلاعیه' });
    }
  });

  return router;
};
