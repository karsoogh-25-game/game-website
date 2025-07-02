const { Question, PurchasedQuestion, SubmittedCombo, Group, GroupMember, sequelize } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const answerFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'public', 'uploads', 'answer_files');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadAnswerFile = multer({
  storage: answerFileStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('فقط فایل‌های تصویری (jpeg, jpg, png) و PDF برای جواب مجاز هستند.'));
  },
  limits: { fileSize: 15 * 1024 * 1024 }
}).single('answerFile');


async function getGroupForUser(userId, transaction = null) {
  const groupMember = await GroupMember.findOne({ where: { userId }, transaction });
  if (!groupMember) {
    throw new Error('شما عضو هیچ گروهی نیستید.');
  }
  const group = await Group.findByPk(groupMember.groupId, { transaction, lock: transaction ? transaction.LOCK.UPDATE : null });
  if (!group) {
    throw new Error('گروه شما یافت نشد.');
  }
  return group;
}


exports.getAvailableQuestions = async (req, res) => {
  try {
    const group = await getGroupForUser(req.session.userId);
    const purchasedQuestionIds = (await PurchasedQuestion.findAll({
        where: { groupId: group.id },
        attributes: ['questionId']
    })).map(pq => pq.questionId);

    const availableQuestions = await Question.findAll({
      where: {
        isActive: true,
        id: { [Op.notIn]: purchasedQuestionIds }
      },
      attributes: ['id', 'name', 'points', 'color', 'price'],
      order: [['color', 'ASC'], ['price', 'ASC']]
    });
    res.json(availableQuestions);
  } catch (error) {
    console.error('Error fetching available questions:', error);
    res.status(500).json({ message: 'خطا در دریافت لیست سوالات قابل خرید: ' + error.message });
  }
};

exports.purchaseQuestion = async (req, res) => {
  const { questionId } = req.body;
  const userId = req.session.userId;
  const io = req.app.get('io');

  if (!questionId) {
    return res.status(400).json({ message: 'شناسه سوال الزامی است.' });
  }

  const t = await sequelize.transaction();
  try {
    const group = await getGroupForUser(userId, t);
    const question = await Question.findOne({ where: { id: questionId, isActive: true }, transaction: t });

    if (!question) {
      await t.rollback();
      return res.status(404).json({ message: 'سوال مورد نظر یافت نشد یا دیگر فعال نیست.' });
    }

    if (group.score < question.price) {
      await t.rollback();
      return res.status(400).json({ message: 'امتیاز گروه شما برای خرید این سوال کافی نیست.' });
    }

    const existingPurchase = await PurchasedQuestion.findOne({
        where: { groupId: group.id, questionId: question.id },
        transaction: t
    });
    if (existingPurchase) {
        await t.rollback();
        return res.status(400).json({ message: 'شما قبلاً این سوال را خریداری کرده‌اید.' });
    }

    group.score -= question.price;
    await group.save({ transaction: t });

    const purchasedQuestion = await PurchasedQuestion.create({
      groupId: group.id,
      questionId: question.id,
      status: 'purchased'
    }, { transaction: t });

    await t.commit();

    io.to(`group-${group.id}`).emit('questionPurchased', { questionId: question.id, newScore: group.score, purchasedQuestion });
    io.to('admins').emit('questionPurchasedAdminNotif', { groupId: group.id, groupName: group.name, questionName: question.name });
    io.emit('leaderboardUpdate');

    res.json({ success: true, message: 'سوال با موفقیت خریداری شد.', newScore: group.score, purchasedQuestion });

  } catch (error) {
    await t.rollback();
    console.error('Error purchasing question:', error);
    res.status(500).json({ message: 'خطا در خرید سوال: ' + error.message });
  }
};

exports.getPurchasedQuestions = async (req, res) => {
  try {
    const group = await getGroupForUser(req.session.userId);
    const purchasedQuestions = await PurchasedQuestion.findAll({
      where: {
        groupId: group.id,
        status: { [Op.in]: ['purchased', 'answered'] }
      },
      include: [{ model: Question, as: 'question', attributes: ['id', 'name', 'points', 'color'] }],
      order: [['purchaseDate', 'DESC']]
    });
    res.json(purchasedQuestions);
  } catch (error) {
    console.error('Error fetching purchased questions:', error);
    res.status(500).json({ message: 'خطا در دریافت سوالات خریداری شده: ' + error.message });
  }
};

exports.getQuestionDetails = async (req, res) => {
  const { purchasedQuestionId } = req.params;
  try {
    const group = await getGroupForUser(req.session.userId);
    const purchasedQuestion = await PurchasedQuestion.findOne({
      where: { id: purchasedQuestionId, groupId: group.id },
      include: [{ model: Question, as: 'question' }]
    });

    if (!purchasedQuestion) {
      return res.status(404).json({ message: 'سوال خریداری شده یافت نشد.' });
    }
    if (purchasedQuestion.status === 'submitted_for_correction' || purchasedQuestion.status === 'corrected') {
        return res.status(403).json({ message: 'این سوال قبلا برای تصحیح ارسال شده است.' });
    }

    res.json(purchasedQuestion);
  } catch (error) {
    console.error('Error fetching question details:', error);
    res.status(500).json({ message: 'خطا در دریافت جزئیات سوال: ' + error.message });
  }
};


exports.uploadAnswer = (req, res) => {
  uploadAnswerFile(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'فایل جواب الزامی است.' });
    }

    const { purchasedQuestionId } = req.params;
    const userId = req.session.userId;
    const io = req.app.get('io');

    const t = await sequelize.transaction();
    try {
      const group = await getGroupForUser(userId, t);
      const purchasedQuestion = await PurchasedQuestion.findOne({
        where: { id: purchasedQuestionId, groupId: group.id },
        transaction: t
      });

      if (!purchasedQuestion) {
        fs.unlinkSync(req.file.path);
        await t.rollback();
        return res.status(404).json({ message: 'سوال خریداری شده یافت نشد.' });
      }
      if (purchasedQuestion.status === 'submitted_for_correction' || purchasedQuestion.status === 'corrected') {
        fs.unlinkSync(req.file.path);
        await t.rollback();
        return res.status(400).json({ message: 'نمی‌توانید برای سوالی که ارسال یا تصحیح شده، جواب آپلود کنید.' });
      }

      if (purchasedQuestion.answerImagePath && fs.existsSync(path.join(__dirname, '..', 'public', purchasedQuestion.answerImagePath))) {
        fs.unlinkSync(path.join(__dirname, '..', 'public', purchasedQuestion.answerImagePath));
      }

      purchasedQuestion.answerImagePath = `/uploads/answer_files/${req.file.filename}`;
      purchasedQuestion.status = 'answered';
      await purchasedQuestion.save({ transaction: t });

      await t.commit();
      io.to(`group-${group.id}`).emit('answerUploaded', purchasedQuestion);
      res.json({ success: true, message: 'جواب با موفقیت آپلود شد.', purchasedQuestion });

    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      await t.rollback();
      console.error('Error uploading answer:', error);
      res.status(500).json({ message: 'خطا در آپلود جواب: ' + error.message });
    }
  });
};

exports.deleteAnswer = async (req, res) => {
  const { purchasedQuestionId } = req.params;
  const userId = req.session.userId;
  const io = req.app.get('io');

  const t = await sequelize.transaction();
  try {
    const group = await getGroupForUser(userId, t);
    const purchasedQuestion = await PurchasedQuestion.findOne({
      where: { id: purchasedQuestionId, groupId: group.id },
      transaction: t
    });

    if (!purchasedQuestion) {
      await t.rollback();
      return res.status(404).json({ message: 'سوال خریداری شده یافت نشد.' });
    }
    if (purchasedQuestion.status === 'submitted_for_correction' || purchasedQuestion.status === 'corrected') {
      await t.rollback();
      return res.status(400).json({ message: 'نمی‌توانید جواب سوالی که ارسال یا تصحیح شده را حذف کنید.' });
    }
    if (!purchasedQuestion.answerImagePath) {
      await t.rollback();
      return res.status(400).json({ message: 'هیچ جوابی برای این سوال آپلود نشده است.' });
    }

    if (fs.existsSync(path.join(__dirname, '..', 'public', purchasedQuestion.answerImagePath))) {
      fs.unlinkSync(path.join(__dirname, '..', 'public', purchasedQuestion.answerImagePath));
    }

    purchasedQuestion.answerImagePath = null;
    purchasedQuestion.status = 'purchased';
    await purchasedQuestion.save({ transaction: t });

    await t.commit();
    io.to(`group-${group.id}`).emit('answerDeleted', { purchasedQuestionId: purchasedQuestion.id, status: purchasedQuestion.status });
    res.json({ success: true, message: 'جواب با موفقیت حذف شد.' });

  } catch (error) {
    await t.rollback();
    console.error('Error deleting answer:', error);
    res.status(500).json({ message: 'خطا در حذف جواب: ' + error.message });
  }
};


exports.getAnsweredQuestions = async (req, res) => {
  try {
    const group = await getGroupForUser(req.session.userId);
    const answeredQuestions = await PurchasedQuestion.findAll({
      where: {
        groupId: group.id,
        status: 'answered',
        answerImagePath: { [Op.ne]: null }
      },
      include: [{ model: Question, as: 'question', attributes: ['id', 'name', 'points', 'color'] }],
      order: [['updatedAt', 'DESC']]
    });
    res.json(answeredQuestions);
  } catch (error) {
    console.error('Error fetching answered questions:', error);
    res.status(500).json({ message: 'خطا در دریافت لیست سوالات پاسخ داده شده: ' + error.message });
  }
};

exports.submitCombo = async (req, res) => {
  const { purchasedQuestionIds } = req.body;
  const userId = req.session.userId;
  const io = req.app.get('io');

  if (!purchasedQuestionIds || !Array.isArray(purchasedQuestionIds) || purchasedQuestionIds.length === 0 || purchasedQuestionIds.length > 3) {
    return res.status(400).json({ message: 'باید 1 تا 3 سوال برای ارسال کمبو انتخاب کنید.' });
  }

  const t = await sequelize.transaction();
  try {
    const group = await getGroupForUser(userId, t);

    const questionsToSubmit = await PurchasedQuestion.findAll({
      where: {
        id: { [Op.in]: purchasedQuestionIds },
        groupId: group.id,
        status: 'answered',
        answerImagePath: { [Op.ne]: null }
      },
      transaction: t
    });

    if (questionsToSubmit.length !== purchasedQuestionIds.length) {
      await t.rollback();
      return res.status(400).json({ message: 'یک یا چند سوال از سوالات انتخابی معتبر نیستند یا قبلا ارسال شده‌اند یا جوابی برای آنها ثبت نشده.' });
    }
    const newCombo = await SubmittedCombo.create({
      groupId: group.id,
      status: 'pending_correction'
    }, { transaction: t });

    for (const pq of questionsToSubmit) {
      pq.status = 'submitted_for_correction';
      pq.submittedInComboId = newCombo.id;
      await pq.save({ transaction: t });
    }

    await t.commit();

    const fullComboData = await SubmittedCombo.findByPk(newCombo.id, {
        include: [
            { model: PurchasedQuestion, as: 'submittedQuestions', include: [{model: Question, as: 'question'}] },
            { model: Group, as: 'group', attributes:['name']}
        ]
    });


    io.to(`group-${group.id}`).emit('comboSubmitted', fullComboData);
    io.to('admins').emit('newComboForCorrection', fullComboData);

    res.status(201).json({ success: true, message: 'کمبو با موفقیت برای تصحیح ارسال شد.', combo: fullComboData });

  } catch (error) {
    await t.rollback();
    console.error('Error submitting combo:', error);
    res.status(500).json({ message: 'خطا در ارسال کمبو: ' + error.message });
  }
};

exports.getSubmittedCombos = async (req, res) => {
  try {
    const group = await getGroupForUser(req.session.userId);
    const submittedCombos = await SubmittedCombo.findAll({
      where: { groupId: group.id },
      include: [{
        model: PurchasedQuestion,
        as: 'submittedQuestions',
        attributes: ['id', 'answerImagePath', 'correctionStatus'],
        include: [{ model: Question, as: 'question', attributes: ['name', 'points', 'color'] }]
      }],
      order: [['submissionDate', 'DESC']]
    });
    res.json(submittedCombos);
  } catch (error) {
    console.error('Error fetching submitted combos:', error);
    res.status(500).json({ message: 'خطا در دریافت تاریخچه کمبوهای ارسالی: ' + error.message });
  }
};
