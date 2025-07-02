const express = require('express');
const router = express.Router();
const questionBankAdminCtrl = require('../controllers/questionBankAdminController');

// Note: The 'isAdmin' or 'isAdminOrMentor' middleware is applied globally in app.js
// to the '/admin/api/question-bank' route.
// So, no need to apply it individually here unless more specific checks per route are needed later.

// Question Management (Admin and Mentor)
router.post('/questions', questionBankAdminCtrl.createQuestion);
router.get('/questions', questionBankAdminCtrl.getQuestions);
router.put('/questions/:id', questionBankAdminCtrl.updateQuestion);
router.delete('/questions/:id', questionBankAdminCtrl.deleteQuestion);

// Settings Management (Admin only - This specific route might need an additional check if the global middleware is too broad for mentors)
// However, the controller itself also checks for admin role for these functions.
router.get('/settings', questionBankAdminCtrl.getQuestionBankSettings);
router.put('/settings', questionBankAdminCtrl.updateQuestionBankSettings);

// Combo Correction (Admin and Mentor)
router.get('/submissions', questionBankAdminCtrl.getSubmissionsForCorrection);
router.get('/submissions/:comboId', questionBankAdminCtrl.getSubmissionDetails);
router.post('/submissions/:comboId/correct', questionBankAdminCtrl.submitCorrection);

module.exports = router;
