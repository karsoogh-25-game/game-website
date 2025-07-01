// app/routes/training.js
const express = require('express');
const router  = express.Router();
const path    = require('path');
const multer  = require('multer');
const { list, createOrUpdate, delete: del } = require('../controllers/contentController');

const storage = multer.diskStorage({
  destination: path.join(__dirname,'..','public','uploads'),
  filename: (req,file,cb)=>{
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString().slice(2)}${ext}`;
    cb(null,name);
  }
});
const upload = multer({ storage });

// API عمومی
router.get('/', list);

// API ادمین
module.exports = (io) => {
  router.post('/', upload.array('files'), createOrUpdate);
  router.post('/:id', upload.array('files'), createOrUpdate);
  router.delete('/:id', del);
  return router;
};
