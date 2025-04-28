// app/controllers/announcementController.js
const { Announcement } = require('../models');
const path = require('path');
const fs   = require('fs');

exports.listAnnouncements = async (req, res) => {
  try {
    const all = await Announcement.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(all);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ message: 'خطا در بارگذاری اطلاعیه‌ها' });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, shortDescription, longDescription } = req.body;
    let attachment = null;
    if (req.file) {
      // ذخیره آدرس فایل برای لینک دانلود
      attachment = `/uploads/${req.file.filename}`;
    }
    const ann = await Announcement.create({
      title,
      shortDescription: shortDescription || null,
      longDescription:  longDescription  || null,
      attachment
    });
    // انتشار رویداد بلادرنگ
    req.io.emit('announcementCreated', ann);
    res.status(201).json(ann);
  } catch (e) {
    console.error('Error creating announcement:', e);
    res.status(400).json({ message: e.message });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id);
    if (!ann) {
      return res.status(404).json({ message: 'اطلاعیه یافت نشد' });
    }

    // اگر فایل جدید آپلود شده، فایل قبلی را حذف کن
    if (req.file) {
      if (ann.attachment) {
        const oldPath = path.join(__dirname, '..', 'public', ann.attachment);
        fs.unlink(oldPath, err => {
          if (err) console.warn('Failed to delete old attachment:', err);
        });
      }
      ann.attachment = `/uploads/${req.file.filename}`;
    }

    // بقیه فیلدها
    ann.title            = req.body.title;
    ann.shortDescription = req.body.shortDescription || null;
    ann.longDescription  = req.body.longDescription  || null;

    await ann.save();
    req.io.emit('announcementUpdated', ann);
    res.json(ann);
  } catch (e) {
    console.error('Error updating announcement:', e);
    res.status(400).json({ message: e.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id);
    if (!ann) {
      return res.status(404).json({ message: 'اطلاعیه یافت نشد' });
    }

    // حذف فایل پیوست اگر وجود دارد
    if (ann.attachment) {
      const oldPath = path.join(__dirname, '..', 'public', ann.attachment);
      fs.unlink(oldPath, err => {
        if (err) console.warn('Failed to delete attachment on delete:', err);
      });
    }
    await ann.destroy();
    req.io.emit('announcementDeleted', { id: ann.id });
    res.json({ message: 'حذف شد' });
  } catch (e) {
    console.error('Error deleting announcement:', e);
    res.status(400).json({ message: e.message });
  }
};
