require('dotenv').config();
const { User, Admin } = require('../models');
const nodemailer       = require('nodemailer');
const { Op }           = require('sequelize');

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
  if (!firstName || !lastName)
    return res.status(400).json({ success:false, message:'نام و نام‌خانوادگی الزامی است' });
  req.session.regData = { firstName, lastName };
  res.json({ success: true });
};

// مرحله ۲
exports.registerStep2 = async (req, res) => {
  const { phoneNumber, nationalId, email } = req.body;
  if (!phoneNumber || !nationalId || !email)
    return res.status(400).json({ success:false, message:'تمام فیلدها الزامی است' });
  if (!/^09\d{9}$/.test(phoneNumber))
    return res.status(400).json({ success:false, message:'شماره موبایل نامعتبر است' });
  if (!/^\d{10}$/.test(nationalId))
    return res.status(400).json({ success:false, message:'کد ملی باید ۱۰ رقم باشد' });
  if (!/^\S+@\S+\.\S+$/.test(email))
    return res.status(400).json({ success:false, message:'فرمت ایمیل صحیح نیست' });

  // تکراری نبودن
  const exists = await User.findOne({ where:{
    [Op.or]: [{ phoneNumber },{ nationalId },{ email }]
  }});
  if (exists)
    return res.status(400).json({ success:false, message:'این اطلاعات قبلاً ثبت شده' });

  req.session.regData = { ...req.session.regData, phoneNumber, nationalId, email };
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  req.session.verify = { code, expires: Date.now() + 10*60*1000 };

  // محتوا HTML ایمیل
  const htmlContent = `
    <div style="font-family:Vazir,sans-serif; font-size:15px; color:#333;">
      <p>سلام!</p>
      <p>کد تأیید شما:</p>
      <h1 style="font-size:36px; color:#2c3e50; letter-spacing:4px;">${code}</h1>
      <p>این کد تا ۱۰ دقیقه معتبر است.</p>
      <br>
      <p style="font-size:12px; color:#777;">
        اگر شما این درخواست را نفرستاده‌اید، این پیام را نادیده بگیرید.
      </p>
    </div>
  `;
  try {
    await transporter.sendMail({
      from: `"Ligauk Registration" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'کد تأیید ثبت‌نام',
      text: `کد: ${code} (۱۰ دقیقه معتبر)`,
      html: htmlContent
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ success:false, message:'ارسال ایمیل ناموفق' });
  }
};

// مرحله ۳
exports.verifyCode = (req, res) => {
  const { code } = req.body;
  const v = req.session.verify || {};
  if (v.code===code && Date.now()<v.expires) return res.json({ success:true });
  res.status(400).json({ success:false, message:'کد نادرست یا منقضی‌شده' });
};

// مرحله ۴
exports.registerSetPassword = async (req, res) => {
  const { password } = req.body;
  if (!/^(?=.*\d)[A-Za-z\d]{6,}$/.test(password))
    return res.status(400).json({ success:false, message:'رمز باید حداقل ۶ حرف و شامل عدد باشد' });
  try {
    await User.create({ ...req.session.regData, password });
    res.json({ success:true });
  } catch {
    res.status(500).json({ success:false, message:'خطا در ایجاد کاربر' });
  }
};

// ورود
exports.login = async (req, res) => {
  const { phoneNumber, password } = req.body;
  const admin = await Admin.findOne({ where:{ phoneNumber } });
  if (admin && await admin.validPassword(password)) {
    req.session.adminId = admin.id;
    return res.json({ success:true, isAdmin:true });
  }
  const user = await User.findOne({ where:{ phoneNumber } });
  if (!user) return res.status(400).json({ success:false, message:'کاربر یافت نشد' });
  if (!await user.validPassword(password))
    return res.status(400).json({ success:false, message:'رمز اشتباه است' });
  if (!user.isActive) return res.json({ success:false, isActive:false });
  req.session.userId = user.id;
  res.json({ success:true, isActive:true });
};

// خروج
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};
