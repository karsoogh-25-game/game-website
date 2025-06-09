// app/controllers/announcementController.js

const { Announcement, AnnouncementAttachment } = require('../models');
const path = require('path');
const fs   = require('fs');

/**
 * GET /api/announcements
 * → لیست همه اطلاعیه‌ها به همراه ضمائم
 */
exports.listAnnouncements = async (req, res) => {
  try {
    const all = await Announcement.findAll({
      order: [['createdAt', 'DESC']],
      include: {
        model: AnnouncementAttachment,
        as: 'attachments',
        attributes: ['id', 'originalName', 'path']
      }
    });
    return res.json(all);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    return res.status(500).json({ message: 'خطا در بارگذاری اطلاعیه‌ها' });
  }
};

/**
 * POST /admin/api/announcements
 * → ایجاد اطلاعیه جدید با چند فایل ضمیمه
 */
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, shortDescription, longDescription } = req.body;
    // ۱) ایجاد رکورد اطلاعیه
    const ann = await Announcement.create({
      title,
      shortDescription: shortDescription || null,
      longDescription:  longDescription  || null
    });

    // ۲) اگر فایل‌های ضمیمه وجود داشتند، ایجاد رکوردهای Attachment
    if (req.files && req.files.length) {
      await Promise.all(req.files.map(file =>
        AnnouncementAttachment.create({
          announcementId: ann.id,
          originalName:  file.originalname,
          filename:      file.filename,
          path:          `/uploads/${file.filename}`
        })
      ));
    }

    // ۳) واکشی مجدد اطلاعیه با ضمائمش
    const result = await Announcement.findByPk(ann.id, {
      include: {
        model: AnnouncementAttachment,
        as: 'attachments',
        attributes: ['id', 'originalName', 'path']
      }
    });

    // به همه کاربران اطلاع بده
    req.io.emit('announcementCreated', result);
    return res.status(201).json(result);
  } catch (e) {
    console.error('Error creating announcement:', e);
    return res.status(400).json({ message: e.message });
  }
};

/**
 * PUT /admin/api/announcements/:id
 * → ویرایش اطلاعیه؛ حذف/اضافهٔ فایل‌های ضمیمه
 */
exports.updateAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id, {
      include: { model: AnnouncementAttachment, as: 'attachments' }
    });
    if (!ann) {
      return res.status(404).json({ message: 'اطلاعیه یافت نشد' });
    }

    // ۱) حذف فیزیکی و رکوردی ضمائم انتخاب‌شده برای حذف
    if (Array.isArray(req.body.deletedAttachments)) {
      await Promise.all(req.body.deletedAttachments.map(attId => {
        const att = ann.attachments.find(a => a.id === Number(attId));
        if (att) {
          // حذف فایل از دیسک
          const filePath = path.join(__dirname, '..', 'public', att.path);
          fs.unlink(filePath, err => err && console.warn('unlink failed:', err));
          // حذف رکورد از دیتابیس
          return AnnouncementAttachment.destroy({ where: { id: attId } });
        }
      }));
    }

    // ۲) آپلود و ذخیرهٔ فایل‌های جدید
    if (req.files && req.files.length) {
      await Promise.all(req.files.map(file =>
        AnnouncementAttachment.create({
          announcementId: ann.id,
          originalName:  file.originalname,
          filename:      file.filename,
          path:          `/uploads/${file.filename}`
        })
      ));
    }

    // ۳) به‌روزرسانی فیلدهای متنی
    ann.title            = req.body.title;
    ann.shortDescription = req.body.shortDescription || null;
    ann.longDescription  = req.body.longDescription  || null;
    await ann.save();

    // ۴) واکشی مجدد با ضمائم به‌روز
    const result = await Announcement.findByPk(ann.id, {
      include: {
        model: AnnouncementAttachment,
        as: 'attachments',
        attributes: ['id', 'originalName', 'path']
      }
    });

    // به همه کاربران اطلاع بده
    req.io.emit('announcementUpdated', result);
    return res.json(result);
  } catch (e) {
    console.error('Error updating announcement:', e);
    return res.status(400).json({ message: e.message });
  }
};

/**
 * DELETE /admin/api/announcements/:id
 * → حذف اطلاعیه و تمامی ضمائمش
 */
exports.deleteAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id, {
      include: { model: AnnouncementAttachment, as: 'attachments' }
    });
    if (!ann) {
      return res.status(404).json({ message: 'اطلاعیه یافت نشد' });
    }

    // حذف فایل‌های ضمیمه از دیسک
    await Promise.all(ann.attachments.map(att => {
      const filePath = path.join(__dirname, '..', 'public', att.path);
      fs.unlink(filePath, err => err && console.warn('unlink failed:', err));
    }));

    // حذف اطلاعیه (ضمائم با قانون CASCADE پاک می‌شوند)
    await ann.destroy();

    // به همه کاربران اطلاع بده
    req.io.emit('announcementDeleted', { id: ann.id });
    return res.status(204).end();
  } catch (e) {
    console.error('Error deleting announcement:', e);
    return res.status(400).json({ message: e.message });
  }
};

// START of EDIT: اضافه کردن تابع جدید برای واکشی بهینه آخرین اطلاعیه
/**
 * GET /api/announcements/latest
 * → فقط آخرین اطلاعیه را برمی‌گرداند (برای بهینه‌سازی داشبورد)
 */
exports.getLatestAnnouncement = async (req, res) => {
  try {
    const latest = await Announcement.findOne({
      order: [['createdAt', 'DESC']],
      attributes: ['title'] // فقط فیلد عنوان مورد نیاز است
    });
    return res.json(latest || null); // اگر هیچ اطلاعیه‌ای نبود، null برگردان
  } catch (err) {
    console.error('Error fetching latest announcement:', err);
    return res.status(500).json({ message: 'خطا در بارگذاری آخرین اطلاعیه' });
  }
};