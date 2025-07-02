const express = require('express');
const router = express.Router();
const questionBankAdminCtrl = require('../controllers/questionBankAdminController');
const { isAdminOrMentor } = require('../middleware/authMiddleware'); // Assuming a middleware for admin/mentor access

// Middleware to check if user is Admin or Mentor (needs to be created)
// For now, we'll assume direct access or rely on a general isAdmin middleware for some routes.
// A more granular isAdminOrMentor middleware would be better.

// Example: A simple isAdmin middleware (if not already present and used globally for /admin)
const isAdmin = (req, res, next) => {
    if (req.session && req.session.adminId) { // Check if admin is logged in
        return next();
    }
    // Add mentor check if mentors have separate login or role identification
    // else if (req.session && req.session.userId && req.user && req.user.role === 'mentor') {
    //     return next();
    // }
    return res.status(403).json({ message: 'دسترسی غیرمجاز. لطفا وارد شوید.' });
};

// Question Management (Admin and Mentor)
router.post('/questions', isAdmin, questionBankAdminCtrl.createQuestion); // `isAdmin` should ideally be `isAdminOrMentor`
router.get('/questions', isAdmin, questionBankAdminCtrl.getQuestions);
router.put('/questions/:id', isAdmin, questionBankAdminCtrl.updateQuestion);
router.delete('/questions/:id', isAdmin, questionBankAdminCtrl.deleteQuestion);

// Settings Management (Admin only)
router.get('/settings', isAdmin, questionBankAdminCtrl.getQuestionBankSettings); // Strictly Admin
router.put('/settings', isAdmin, questionBankAdminCtrl.updateQuestionBankSettings); // Strictly Admin

// Combo Correction (Admin and Mentor)
router.get('/submissions', isAdmin, questionBankAdminCtrl.getSubmissionsForCorrection); // `isAdminOrMentor`
router.get('/submissions/:comboId', isAdmin, questionBankAdminCtrl.getSubmissionDetails); // `isAdminOrMentor`
router.post('/submissions/:comboId/correct', isAdmin, questionBankAdminCtrl.submitCorrection); // `isAdminOrMentor`

module.exports = router;
