// routes/adminGroups.js
const express = require('express');
const router = express.Router();
const { Group, User } = require('../models'); // مسیرت بسته به ساختار پروژه تغییر میکنه

module.exports = (io) => {

  // گرفتن لیست گروه‌ها
  router.get('/', async (req, res) => {
    try {
      const groups = await Group.findAll({
        include: [
          { model: User, as: 'leader', attributes: ['id', 'firstName', 'lastName'] },
          { model: User, as: 'members', attributes: ['id'] }
        ]
      });
      res.json(groups);
    } catch (err) {
      console.error(err);
      res.status(500).send('خطا در دریافت گروه‌ها');
    }
  });

  // ویرایش گروه
  router.put('/:id', async (req, res) => {
    try {
      const group = await Group.findByPk(req.params.id);
      if (!group) return res.status(404).send('گروه پیدا نشد');
      await group.update(req.body);
      io.emit('groupUpdated', group);
      res.json(group);
    } catch (err) {
      console.error(err);
      res.status(500).send('خطا در ویرایش گروه');
    }
  });

  // حذف گروه
  router.delete('/:id', async (req, res) => {
    try {
      const group = await Group.findByPk(req.params.id);
      if (!group) return res.status(404).send('گروه پیدا نشد');
      await group.setMembers([]); // اعضا رو از گروه حذف کن
      await group.destroy();
      io.emit('groupDeleted', { id: parseInt(req.params.id) });
      res.sendStatus(204);
    } catch (err) {
      console.error(err);
      res.status(500).send('خطا در حذف گروه');
    }
  });

  return router;
};
