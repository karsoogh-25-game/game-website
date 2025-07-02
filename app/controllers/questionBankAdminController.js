const { Question, QuestionBankSetting, SubmittedCombo, PurchasedQuestion, sequelize } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const questionImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'public', 'uploads', 'question_images');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadQuestionImage = multer({
  storage: questionImageStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('فقط فایل‌های تصویری (jpeg, jpg, png) و PDF مجاز هستند.'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).single('questionImage');

const getUserRole = (req) => {
  if (req.session.adminId) return 'admin';
  if (req.session.userId) {
    return req.user && req.user.role === 'mentor' ? 'mentor' : null;
  }
  return null;
};

const getUserId = (req) => {
    return req.session.adminId || req.session.userId;
};


exports.createQuestion = async (req, res) => {
  uploadQuestionImage(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'فایل عکس سوال الزامی است.' });
    }

    const { name, points, color, price } = req.body;
    const creatorType = getUserRole(req);
    const creatorId = getUserId(req);

    if (!name || !points || !color || !price) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'تمام فیلدها (نام، امتیاز، رنگ، قیمت) الزامی هستند.' });
    }
    if (isNaN(parseInt(points)) || parseInt(points) <= 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'امتیاز باید یک عدد مثبت باشد.' });
    }
    if (isNaN(parseInt(price)) || parseInt(price) < 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'قیمت باید یک عدد غیرمنفی باشد.' });
    }

    try {
      const question = await Question.create({
        name,
        imagePath: `/uploads/question_images/${req.file.filename}`,
        points: parseInt(points),
        color,
        price: parseInt(price),
        creatorId,
        creatorType,
      });
      req.app.get('io').emit('newQuestionAdded', question);
      res.status(201).json(question);
    } catch (error) {
      fs.unlinkSync(req.file.path);
      console.error('Error creating question:', error);
      res.status(500).json({ message: 'خطا در ایجاد سوال: ' + error.message });
    }
  });
};

exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.findAll({ order: [['createdAt', 'DESC']] });
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'خطا در دریافت لیست سوالات.' });
  }
};

exports.updateQuestion = async (req, res) => {
  uploadQuestionImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const { id } = req.params;
    const { name, points, color, price, isActive } = req.body;
    const updaterRole = getUserRole(req);
    const updaterId = getUserId(req);

    try {
      const question = await Question.findByPk(id);
      if (!question) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'سوال مورد نظر یافت نشد.' });
      }

      if (name) question.name = name;
      if (points) question.points = parseInt(points);
      if (color) question.color = color;
      if (price) question.price = parseInt(price);
      if (isActive !== undefined) question.isActive = (isActive === 'true' || isActive === true);

      if (req.file) {
        if (question.imagePath && fs.existsSync(path.join(__dirname, '..', 'public', question.imagePath))) {
          fs.unlinkSync(path.join(__dirname, '..', 'public', question.imagePath));
        }
        question.imagePath = `/uploads/question_images/${req.file.filename}`;
      }

      await question.save();
      req.app.get('io').emit('questionUpdated', question);
      res.json(question);
    } catch (error) {
      if (req.file) fs.unlinkSync(req.file.path);
      console.error('Error updating question:', error);
      res.status(500).json({ message: 'خطا در ویرایش سوال: ' + error.message });
    }
  });
};

exports.deleteQuestion = async (req, res) => {
  const { id } = req.params;
  const deleterRole = getUserRole(req);
  const deleterId = getUserId(req);

  try {
    const question = await Question.findByPk(id);
    if (!question) {
      return res.status(404).json({ message: 'سوال مورد نظر یافت نشد.' });
    }

    // Authorization check (similar to update)
    // if (deleterRole !== 'admin' && (question.creatorId !== deleterId || question.creatorType !== deleterRole)) {
    //   return res.status(403).json({ message: 'شما مجاز به حذف این سوال نیستید.' });
    // }

    const purchases = await PurchasedQuestion.count({ where: { questionId: id } });
    if (purchases > 0) {
      question.isActive = false;
      await question.save();
      req.app.get('io').emit('questionUpdated', question);
      return res.status(400).json({ message: 'این سوال توسط گروه‌ها خریداری شده و قابل حذف نیست. به جای آن غیرفعال شد.' });
    }

    const imagePath = question.imagePath;
    await question.destroy();

    if (imagePath && fs.existsSync(path.join(__dirname, '..', 'public', imagePath))) {
      fs.unlinkSync(path.join(__dirname, '..', 'public', imagePath));
    }
    req.app.get('io').emit('questionDeleted', { id });
    res.json({ message: 'سوال با موفقیت حذف شد.' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'خطا در حذف سوال.' });
  }
};


exports.getQuestionBankSettings = async (req, res) => {
  if (getUserRole(req) !== 'admin') {
    return res.status(403).json({ message: 'دسترسی غیرمجاز.' });
  }
  try {
    let settings = await QuestionBankSetting.findOne();
    if (!settings) {
      settings = await QuestionBankSetting.create({ comboMultiplier: 2, sequentialComboMultiplier: 4 });
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching question bank settings:', error);
    res.status(500).json({ message: 'خطا در دریافت تنظیمات بانک سوالات.' });
  }
};

exports.updateQuestionBankSettings = async (req, res) => {
  if (getUserRole(req) !== 'admin') {
    return res.status(403).json({ message: 'دسترسی غیرمجاز.' });
  }
  const { comboMultiplier, sequentialComboMultiplier } = req.body;
  try {
    let settings = await QuestionBankSetting.findOne();
    if (!settings) {
      settings = await QuestionBankSetting.create({ comboMultiplier, sequentialComboMultiplier });
    } else {
      if (comboMultiplier !== undefined) settings.comboMultiplier = parseFloat(comboMultiplier);
      if (sequentialComboMultiplier !== undefined) settings.sequentialComboMultiplier = parseFloat(sequentialComboMultiplier);
      await settings.save();
    }
    req.app.get('io').emit('questionBankSettingsUpdated', settings); // Notify relevant clients (admin panel)
    res.json(settings);
  } catch (error) {
    console.error('Error updating question bank settings:', error);
    res.status(500).json({ message: 'خطا در به‌روزرسانی تنظیمات بانک سوالات.' });
  }
};


exports.getSubmissionsForCorrection = async (req, res) => {
  const userRole = getUserRole(req);
  try {
    let whereClause = { status: 'pending_correction' };

    const submissions = await SubmittedCombo.findAll({
      where: whereClause,
      include: [
        { model: sequelize.models.Group, as: 'group', attributes: ['id', 'name'] },
      ],
      order: [['submissionDate', 'ASC']]
    });

    if (userRole === 'mentor') {
        submissions.forEach(sub => {
            if (sub.group) {
                sub.setDataValue('group', { id: sub.group.id, name: 'پنهان شده' } );
            }
        });
    }

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions for correction:', error);
    res.status(500).json({ message: 'خطا در دریافت لیست کمبوهای ارسالی.' });
  }
};

exports.getSubmissionDetails = async (req, res) => {
  const { comboId } = req.params;
  const userRole = getUserRole(req);
  try {
    const submission = await SubmittedCombo.findByPk(comboId, {
      include: [
        {
          model: sequelize.models.Group,
          as: 'group',
          attributes: ['id', 'name']
        },
        {
          model: PurchasedQuestion,
          as: 'submittedQuestions',
          include: [{ model: Question, as: 'question', attributes: ['id', 'name', 'imagePath', 'points', 'color'] }]
        }
      ]
    });

    if (!submission) {
      return res.status(404).json({ message: 'کمبوی مورد نظر یافت نشد.' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission details:', error);
    res.status(500).json({ message: 'خطا در دریافت جزئیات کمبو.' });
  }
};

exports.submitCorrection = async (req, res) => {
  const { comboId } = req.params;
  const { corrections } = req.body;
  const correctorRole = getUserRole(req);
  const correctorId = getUserId(req);

  if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
    return res.status(400).json({ message: 'اطلاعات تصحیح ارسال نشده یا ناقص است.' });
  }

  const t = await sequelize.transaction();
  try {
    const combo = await SubmittedCombo.findByPk(comboId, {
      include: [
        { model: PurchasedQuestion, as: 'submittedQuestions', include: [{model: Question, as: 'question'}] },
        { model: sequelize.models.Group, as: 'group'}
      ],
      transaction: t
    });

    if (!combo) {
      await t.rollback();
      return res.status(404).json({ message: 'کمبوی مورد نظر یافت نشد.' });
    }
    if (combo.status !== 'pending_correction') {
      await t.rollback();
      return res.status(400).json({ message: 'این کمبو قبلاً تصحیح شده است.' });
    }

    const group = combo.group;
    if (!group) {
        await t.rollback();
        return res.status(404).json({ message: 'گروه مربوط به این کمبو یافت نشد.' });
    }

    let totalBasePoints = 0;
    let correctAnswersCount = 0;
    let isSameColor = true;
    let firstColor = null;
    const correctionDetailsForCombo = [];
    const submittedQuestionObjects = [];

    for (const pq of combo.submittedQuestions) {
      const correctionInput = corrections.find(c => c.purchasedQuestionId === pq.id);
      if (!correctionInput) {
        await t.rollback();
        return res.status(400).json({ message: `وضعیت تصحیح برای سوال با شناسه ${pq.id} ارسال نشده.` });
      }

      const currentQuestion = pq.question;

      pq.correctionStatus = correctionInput.isCorrect ? 'correct' : 'incorrect';
      pq.status = 'corrected';
      await pq.save({ transaction: t });

      correctionDetailsForCombo.push({
          purchasedQuestionId: pq.id,
          questionName: currentQuestion.name,
          status: pq.correctionStatus,
          basePoints: currentQuestion.points
      });

      if (pq.correctionStatus === 'correct') {
        totalBasePoints += currentQuestion.points;
        correctAnswersCount++;
        submittedQuestionObjects.push(currentQuestion);
      }
    }

    let awardedPoints = 0;
    let multiplier = 1;
    const settings = await QuestionBankSetting.findOne({ transaction: t });
    const comboMultiplierValue = settings ? settings.comboMultiplier : 2;
    const sequentialComboMultiplierValue = settings ? settings.sequentialComboMultiplier : 4;

    if (combo.submittedQuestions.length === 3 && correctAnswersCount === 3) {
      const firstCorrectQuestionColor = submittedQuestionObjects[0].color;
      const allSameColor = submittedQuestionObjects.every(q => q.color === firstCorrectQuestionColor);

      if (allSameColor) {
        const points = submittedQuestionObjects.map(q => q.points).sort((a, b) => a - b);
        let isSequential = true;
        if (points.length === 3) {
            for (let i = 0; i < points.length - 1; i++) {
              if (points[i+1] - points[i] !== 1) {
                isSequential = false;
                break;
              }
            }
        } else {
            isSequential = false;
        }

        if (isSequential) {
          multiplier = sequentialComboMultiplierValue;
        } else {
          multiplier = comboMultiplierValue;
        }
      }
    }
    awardedPoints = totalBasePoints * multiplier;

    combo.awardedPoints = awardedPoints;
    combo.status = correctAnswersCount > 0 ? (correctAnswersCount === combo.submittedQuestions.length ? 'fully_correct' : 'partially_correct') : 'incorrect';
    combo.correctorId = correctorId;
    combo.correctorType = correctorRole;
    combo.correctionDate = new Date();
    combo.correctionDetails = correctionDetailsForCombo;
    await combo.save({ transaction: t });

    // Update group score
    group.score += awardedPoints;
    await group.save({ transaction: t });

    await t.commit();

    req.app.get('io').to(`group-${group.id}`).emit('comboCorrected', combo);
    req.app.get('io').to('admins').emit('comboCorrectedAdmin', combo);
    req.app.get('io').emit('leaderboardUpdate');


    res.json(combo);

  } catch (error) {
    await t.rollback();
    console.error('Error submitting correction:', error);
    res.status(500).json({ message: 'خطا در ثبت تصحیح: ' + error.message });
  }
};
