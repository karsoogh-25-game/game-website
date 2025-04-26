const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/groupController');

router.post('/create', ctrl.createGroup);
router.post('/add-member', ctrl.addMember);
router.post('/leave', ctrl.leaveGroup);

module.exports = router;
