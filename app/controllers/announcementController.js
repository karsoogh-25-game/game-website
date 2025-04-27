// app/controllers/announcementController.js
const { Announcement } = require('../models');
const path = require('path');
const fs = require('fs');

exports.listAnnouncements = async (req, res) => {
  const all = await Announcement.findAll({ order: [['createdAt','DESC']] });
  res.json(all);
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, shortDescription, longDescription } = req.body;
    let attachment = null;
    if (req.file) {
      attachment = `/uploads/${req.file.filename}`;
    }
    const ann = await Announcement.create({ title, shortDescription, longDescription, attachment });
    req.io.emit('announcementCreated', ann);
    res.status(201).json(ann);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Not found' });

    const { title, shortDescription, longDescription } = req.body;
    if (req.file) {
      // حذف فایل قبلی
      if (ann.attachment) {
        const old = path.join(__dirname, '..', 'public', ann.attachment);
        fs.unlink(old, () => {});
      }
      ann.attachment = `/uploads/${req.file.filename}`;
    }
    ann.title = title;
    ann.shortDescription = shortDescription;
    ann.longDescription = longDescription;
    await ann.save();

    req.io.emit('announcementUpdated', ann);
    res.json(ann);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByPk(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Not found' });

    if (ann.attachment) {
      const old = path.join(__dirname, '..', 'public', ann.attachment);
      fs.unlink(old, () => {});
    }
    await ann.destroy();

    req.io.emit('announcementDeleted', { id: ann.id });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
