const express = require('express');
const router = express.Router();
const questionBankAdminCtrl = require('../controllers/questionBankAdminController');

router.post('/questions', questionBankAdminCtrl.createQuestion);
router.get('/questions', questionBankAdminCtrl.getQuestions);
router.put('/questions/:id', questionBankAdminCtrl.updateQuestion);
router.delete('/questions/:id', questionBankAdminCtrl.deleteQuestion);

router.get('/settings', questionBankAdminCtrl.getQuestionBankSettings);
router.put('/settings', questionBankAdminCtrl.updateQuestionBankSettings);

router.get('/submissions', questionBankAdminCtrl.getSubmissionsForCorrection);
router.get('/submissions/:comboId', questionBankAdminCtrl.getSubmissionDetails);
router.post('/submissions/:comboId/correct', questionBankAdminCtrl.submitCorrection);

module.exports = router;
