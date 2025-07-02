const express = require('express');
const router = express.Router();
const questionBankUserCtrl = require('../controllers/questionBankUserController');
// const { isUser } = require('../middleware/authMiddleware'); // Assuming a general user auth middleware

// Middleware to check if user is authenticated (example)
const isUserAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) { // Check if user is logged in
        return next();
    }
    return res.status(403).json({ message: 'دسترسی غیرمجاز. لطفا وارد شوید.' });
};

// Prefix: /api/question-bank (defined in app.js)

// Question Purchase and Viewing
router.get('/questions/available', isUserAuthenticated, questionBankUserCtrl.getAvailableQuestions);
router.post('/questions/purchase', isUserAuthenticated, questionBankUserCtrl.purchaseQuestion);
router.get('/questions/purchased', isUserAuthenticated, questionBankUserCtrl.getPurchasedQuestions);
router.get('/questions/purchased/:purchasedQuestionId', isUserAuthenticated, questionBankUserCtrl.getQuestionDetails);

// Answer Management
router.post('/answers/:purchasedQuestionId/upload', isUserAuthenticated, questionBankUserCtrl.uploadAnswer);
router.delete('/answers/:purchasedQuestionId/delete', isUserAuthenticated, questionBankUserCtrl.deleteAnswer);

// Combo Submission
router.get('/combos/answered-questions', isUserAuthenticated, questionBankUserCtrl.getAnsweredQuestions);
router.post('/combos/submit', isUserAuthenticated, questionBankUserCtrl.submitCombo);
router.get('/combos/history', isUserAuthenticated, questionBankUserCtrl.getSubmittedCombos);

module.exports = router;
