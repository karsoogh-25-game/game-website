require('dotenv').config();
const { User, Admin } = require('../models');
const nodemailer       = require('nodemailer');

// پیک SMTP با Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// مرحله ۱
exports.registerStep1 = (req, res) => {
  const { firstName, lastName } = req.body;
  req.session.regData = { firstName, lastName };
  res.json({ success: true });
};

// مرحله ۲
exports.registerStep2 = async (req, res) => {
  const { phoneNumber, nationalId, email } = req.body;
  req.session.regData = { ...req.session.regData, phoneNumber, nationalId, email };
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  req.session.verify = { code, expires: Date.now() + 10*60*1000 };
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'کد تأیید ثبت‌نام',
    text: `کد تأیید شما: ${code}`
  });
  res.json({ success: true });
};

// مرحله ۳
exports.verifyCode = (req, res) => {
  const { code } = req.body;
  const v = req.session.verify || {};
  if (v.code === code && Date.now() < v.expires) return res.json({ success: true });
  return res.status(400).json({ success: false, message: 'کد نادرست یا منقضی‌شده' });
};

// مرحله ۴
exports.registerSetPassword = async (req, res) => {
  const { password } = req.body;
  if (!/^(?=.*\d)[A-Za-z\d]{6,}$/.test(password))
    return res.status(400).json({ success: false, message: 'رمز باید حداقل ۶ کاراکتر و شامل عدد باشد' });
  try {
    await User.create({ ...req.session.regData, password });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'خطا در ایجاد کاربر' });
  }
};

// ورود
exports.login = async (req, res) => {
  const { phoneNumber, password } = req.body;
  const admin = await Admin.findOne({ where: { phoneNumber } });
  if (admin && await admin.validPassword(password)) {
    req.session.adminId = admin.id;
    return res.json({ success: true, isAdmin: true });
  }
  const user = await User.findOne({ where: { phoneNumber } });
  if (!user) return res.status(400).json({ success: false, message: 'کاربر یافت نشد' });
  if (!await user.validPassword(password))
    return res.status(400).json({ success: false, message: 'رمز اشتباه است' });
  if (!user.isActive) return res.json({ success: false, isActive: false });
  req.session.userId = user.id;
  res.json({ success: true, isActive: true });
};

// خروج
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};
