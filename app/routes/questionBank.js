const express = require('express');
const router = express.Router();
const questionBankUserCtrl = require('../controllers/questionBankUserController');

router.get('/questions/available', questionBankUserCtrl.getAvailableQuestions);
router.post('/questions/purchase', questionBankUserCtrl.purchaseQuestion);
router.get('/questions/purchased', questionBankUserCtrl.getPurchasedQuestions);
router.get('/questions/purchased/:purchasedQuestionId', questionBankUserCtrl.getQuestionDetails);

router.post('/answers/:purchasedQuestionId/upload', questionBankUserCtrl.uploadAnswer);
router.delete('/answers/:purchasedQuestionId/delete', questionBankUserCtrl.deleteAnswer);

router.get('/combos/answered-questions', questionBankUserCtrl.getAnsweredQuestions);
router.post('/combos/submit', questionBankUserCtrl.submitCombo);
router.get('/combos/history', questionBankUserCtrl.getSubmittedCombos);

module.exports = router;
