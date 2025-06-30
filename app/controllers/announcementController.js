// app/controllers/announcementController.js

const { Announcement, AnnouncementAttachment } = require('../models');
const path = require('path');
const fs   = require('fs');

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

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, shortDescription, longDescription } = req.body;
    const ann = await Announcement.create({
      title,
      shortDescription: shortDescription || null,
      longDescription:  longDescription  || null
    });

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

    const result = await Announcement.findByPk(ann.id, {
      include: {
        model: AnnouncementAttachment,
        as: 'attachments',
        attributes: ['id', 'originalName', 'path']
      }
    });

    req.io.emit('announcementCreated', result);
    return res.status(201).json(result);
  } catch (e) {
    console.error('Error creating announcement:', e);
    return res.status(400).json({ message: e.message });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id, {
      include: { model: AnnouncementAttachment, as: 'attachments' }
    });
    if (!ann) {
      return res.status(404).json({ message: 'اطلاعیه یافت نشد' });
    }

    if (Array.isArray(req.body.deletedAttachments)) {
      await Promise.all(req.body.deletedAttachments.map(attId => {
        const att = ann.attachments.find(a => a.id === Number(attId));
        if (att) {
          const filePath = path.join(__dirname, '..', 'public', att.path);
          fs.unlink(filePath, err => err && console.warn('unlink failed:', err));
          return AnnouncementAttachment.destroy({ where: { id: attId } });
        }
      }));
    }

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

    ann.title            = req.body.title;
    ann.shortDescription = req.body.shortDescription || null;
    ann.longDescription  = req.body.longDescription  || null;
    await ann.save();

    const result = await Announcement.findByPk(ann.id, {
      include: {
        model: AnnouncementAttachment,
        as: 'attachments',
        attributes: ['id', 'originalName', 'path']
      }
    });

    req.io.emit('announcementUpdated', result);
    return res.json(result);
  } catch (e) {
    console.error('Error updating announcement:', e);
    return res.status(400).json({ message: e.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id, {
      include: { model: AnnouncementAttachment, as: 'attachments' }
    });
    if (!ann) {
      return res.status(404).json({ message: 'اطلاعیه یافت نشد' });
    }

    await Promise.all(ann.attachments.map(att => {
      const filePath = path.join(__dirname, '..', 'public', att.path);
      fs.unlink(filePath, err => err && console.warn('unlink failed:', err));
    }));

    await ann.destroy();

    req.io.emit('announcementDeleted', { id: ann.id });
    return res.status(204).end();
  } catch (e) {
    console.error('Error deleting announcement:', e);
    return res.status(400).json({ message: e.message });
  }
};

exports.getLatestAnnouncement = async (req, res) => {
  try {
    const latest = await Announcement.findOne({
      order: [['createdAt', 'DESC']],
      attributes: ['title']
    });
    return res.json(latest || null);
  } catch (err) {
    console.error('Error fetching latest announcement:', err);
    return res.status(500).json({ message: 'خطا در بارگذاری آخرین اطلاعیه' });
  }
};