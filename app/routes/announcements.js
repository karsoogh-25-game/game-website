// app/routes/announcements.js

const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const multer    = require('multer');
const { Announcement, AnnouncementAttachment } = require('../models');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'public', 'uploads'),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = (io) => {
  const router = express.Router();
  const ctrl = require('../controllers/announcementController');

  router.use((req, _, next) => {
    req.io = io;
    next();
  });

  router.get('/latest', ctrl.getLatestAnnouncement);
  router.get('/', ctrl.listAnnouncements);
  router.post(
    '/',
    upload.array('attachments', 5),
    ctrl.createAnnouncement
  );

  router.put(
    '/:id',
    upload.array('attachments', 5),
    ctrl.updateAnnouncement
  );

  router.delete('/:id', ctrl.deleteAnnouncement);

  return router;
};