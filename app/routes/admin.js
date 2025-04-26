const express = require('express');

module.exports = (io) => {
  const router = express.Router();
  const ctrl   = require('../controllers/adminController');

  // پاس دادن io به همه ریکوئست‌ها
  router.use((req, res, next) => { req.io = io; next(); });

  // صفحات و APIها
  router.get('/', ctrl.renderAdminPage);

  // کاربران
  router.get('/api/users', ctrl.listUsers);
  router.put('/api/users/:id', ctrl.updateUser);
  router.delete('/api/users/:id', ctrl.deleteUser); // ✨ اینو اضافه کردم

  return router;
};
