// app/controllers/contentController.js
const { Content, ContentAttachment } = require('../models');
const path = require('path');
const fs   = require('fs');

exports.list = async (req, res) => {
  try {
    const rows = await Content.findAll({
      order: [['createdAt', 'DESC']],
      include: {
        model: ContentAttachment,
        as: 'attachments',
        attributes: ['id','originalName','path']
      }
    });
    return res.json(rows);
  } catch (err) {
    console.error('Error in GET /api/training:', err);
    return res.status(500).json({ message: 'خطا در خواندن محتواها' });
  }
};

exports.createOrUpdate = async (req, res) => {
  const { title, shortDescription, longDescription, deleteIds } = req.body;
  const id = req.params.id;
  try {
    let content;
    if (id) {
      content = await Content.findByPk(id, { include: 'attachments' });
      await content.update({ title, shortDescription, longDescription });
    } else {
      content = await Content.create({ title, shortDescription, longDescription });
    }
    if (deleteIds && deleteIds.length) {
      for (let aid of deleteIds) {
        const att = await ContentAttachment.findByPk(aid);
        if (att) {
          fs.unlink(path.join(__dirname,'..','public',att.path), ()=>{});
          await att.destroy();
        }
      }
    }
    if (req.files) {
      for (let file of req.files) {
        await ContentAttachment.create({
          contentId: content.id,
          originalName: file.originalname,
          filename: file.filename,
          path: `/uploads/${file.filename}`
        });
      }
    }
    req.io.emit(id ? 'contentUpdated' : 'contentCreated', content);
    return res.json(content);
  } catch (err) {
    console.error('Error in POST /admin/api/training:', err);
    return res.status(400).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const content = await Content.findByPk(req.params.id, { include:'attachments' });
    if (!content) return res.status(404).json({ message:'نیافت' });
    // فایل‌ها را از دیسک حذف کن
    for (let att of content.attachments) {
      fs.unlink(path.join(__dirname,'..','public',att.path), ()=>{});
    }
    await content.destroy();
    req.io.emit('contentDeleted', { id: parseInt(req.params.id,10) });
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting content:', err);
    return res.status(400).json({ message: 'خطا در حذف محتوا' });
  }
};
