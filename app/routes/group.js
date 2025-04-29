// app/routes/group.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/groupController');

// برگشت اطلاعات گروه من (member + role + group)
router.get('/my',       ctrl.getMyGroup);

// ** مسیری که برای انتقال امتیاز اضافه کردیم **
router.post('/transfer', ctrl.transfer);

// بقیه‌ی مسیرها
router.get('/ranking',     ctrl.getRanking);
router.post('/create',     ctrl.createGroup);
router.post('/add-member', ctrl.addMember);
router.post('/leave',      ctrl.leaveGroup);
router.post('/:id/remove-member', ctrl.removeMember);
router.delete('/:id',      ctrl.deleteGroup);

module.exports = router;
