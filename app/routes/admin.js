const express = require('express');

module.exports = (io) => {
  const router = express.Router();
  const ctrl   = require('../controllers/adminController');

  // پاس دادن io
  router.use((req, res, next) => { req.io = io; next(); });

  router.get('/', ctrl.renderAdminPage);
  router.get('/api/users', ctrl.listUsers);
  router.put('/api/users/:id', ctrl.updateUser);

  return router;
};
