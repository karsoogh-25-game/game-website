const express = require('express');
const ctrl    = require('../controllers/announcementController');
const multer  = require('multer');
const path    = require('path');

const upload = multer({
  dest: path.join(__dirname, '..', 'public', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = (io) => {
  const router = express.Router();
  router.use((req, _, next) => { req.io = io; next(); });

  router.get('/',    ctrl.listAnnouncements);
  router.post('/',   upload.single('attachment'), ctrl.createAnnouncement);
  router.put('/:id', upload.single('attachment'), ctrl.updateAnnouncement);
  router.delete('/:id', ctrl.deleteAnnouncement);

  return router;
};
