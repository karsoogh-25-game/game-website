const express = require('express');

module.exports = (io) => {
  const router = express.Router();
  const ctrl   = require('../controllers/adminController');

  // پاس دادن io به همه ریکوئست‌ها
  router.use((req, res, next) => { req.io = io; next(); });

  // صفحات و APIها
  router.get('/', ctrl.renderAdminPage);

  // Announcement routes
  router.use('/api/announcements', require('./announcements')(io));

  // کاربران
  router.get('/api/users', ctrl.listUsers);
  router.put('/api/users/:id', ctrl.updateUser);
  router.delete('/api/users/:id', ctrl.deleteUser);

  // آیتم‌ها و فروشگاه
  router.use('/api/shop', require('./adminShop'));
  router.use('/api/unique-items', require('./adminUniqueItems'));
  
  // گروه‌ها
  router.use('/api/groups', require('./adminGroups')(io));

  // محتواها
  router.use('/api/training', require('./training')(io));

  // --- START OF FIX: این خط روت‌های جدید را به پنل ادمین متصل می‌کند ---
  // این خط به روتر ادمین می‌گوید که هر درخواستی به /api/features را
  // به فایل adminFeatures.js که قبلا ساختیم، ارسال کند.
  router.use('/api/features', require('./adminFeatures'));
  // --- END OF FIX ---

  return router;
};
