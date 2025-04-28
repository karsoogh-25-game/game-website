// app/routes/announcements.js

const express   = require('express');
const path      = require('path');
const multer    = require('multer');
const { Announcement } = require('../models'); // خروجی مدل‌های Sequelize در index.js

// Multer برای آپلود فایل‌های پیوست
const upload = multer({
  dest: path.join(__dirname, '..', 'public', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = (io) => {
  const router = express.Router();

  // در دسترس بودن socket.io در req.io
  router.use((req, _, next) => {
    req.io = io;
    next();
  });

  /**
   * ▪ مسیر عمومی:
   * GET /api/announcements
   * → برگرداندن آرایه اطلاعیه‌ها با متد Sequelize.findAll
   */
  router.get('/', async (req, res) => {
    try {
      const rows = await Announcement.findAll({
        order: [['createdAt', 'DESC']],  // جدیدترین اول
        attributes: [
          'id',
          'title',
          'shortDescription',
          'longDescription',
          'attachment',
          'createdAt'
        ]
      });
      return res.json(rows);
    } catch (err) {
      console.error('Error in GET /api/announcements:', err);
      return res.status(500).json({ message: 'خطا در خواندن اطلاعیه‌ها' });
    }
  });

  /**
   * ▪ مسیرهای ادمین (CRUD اطلاعیه‌ها زیر /admin/api/announcements)
   */
  router.post('/', upload.single('attachment'), async (req, res) => {
    try {
      const { title, shortDescription, longDescription } = req.body;
      const attachment = req.file ? `/uploads/${req.file.filename}` : null;
      const doc = await Announcement.create({
        title, shortDescription, longDescription, attachment
      });
      req.io.emit('announcementCreated', doc);
      return res.status(201).json(doc);
    } catch (err) {
      console.error('Error in POST /admin/api/announcements:', err);
      return res.status(400).json({ message: 'خطا در ایجاد اطلاعیه' });
    }
  });

  router.put('/:id', upload.single('attachment'), async (req, res) => {
    try {
      const updates = { ...req.body };
      if (req.file) updates.attachment = `/uploads/${req.file.filename}`;
      const [count, [doc]] = await Announcement.update(
        updates,
        { where: { id: req.params.id }, returning: true }
      );
      req.io.emit('announcementUpdated', doc);
      return res.json(doc);
    } catch (err) {
      console.error('Error in PUT /admin/api/announcements/:id:', err);
      return res.status(400).json({ message: 'خطا در به‌روزرسانی اطلاعیه' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await Announcement.destroy({ where: { id: req.params.id } });
      req.io.emit('announcementDeleted', { id: req.params.id });
      return res.status(204).end();
    } catch (err) {
      console.error('Error in DELETE /admin/api/announcements/:id:', err);
      return res.status(400).json({ message: 'خطا در حذف اطلاعیه' });
    }
  });

  return router;
};
