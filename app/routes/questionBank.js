const express = require('express');
const router = express.Router();
const questionBankUserCtrl = require('../controllers/questionBankUserController');

// Note: The 'isUser' middleware is applied globally in app.js
// to the '/api/question-bank' route.
// So, no need to apply it individually here.

// Prefix: /api/question-bank (defined in app.js)

// Question Purchase and Viewing
router.get('/questions/available', questionBankUserCtrl.getAvailableQuestions);
router.post('/questions/purchase', questionBankUserCtrl.purchaseQuestion);
router.get('/questions/purchased', questionBankUserCtrl.getPurchasedQuestions);
router.get('/questions/purchased/:purchasedQuestionId', questionBankUserCtrl.getQuestionDetails);

// Answer Management
router.post('/answers/:purchasedQuestionId/upload', questionBankUserCtrl.uploadAnswer);
router.delete('/answers/:purchasedQuestionId/delete', questionBankUserCtrl.deleteAnswer);

// Combo Submission
router.get('/combos/answered-questions', questionBankUserCtrl.getAnsweredQuestions);
router.post('/combos/submit', questionBankUserCtrl.submitCombo);
router.get('/combos/history', questionBankUserCtrl.getSubmittedCombos);

module.exports = router;
