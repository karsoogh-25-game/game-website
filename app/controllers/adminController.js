const { User } = require('../models');
const { Op }   = require('sequelize');

// نمایش صفحه‌ی ادمین
exports.renderAdminPage = (req, res) => {
  res.render('admin');
};

// لیست کاربران با قابلیت جستجو
exports.listUsers = async (req, res) => {
  const { search } = req.query;
  const where = search ? {
    [Op.or]: [
      { firstName:   { [Op.like]: `%${search}%` } },
      { lastName:    { [Op.like]: `%${search}%` } },
      { phoneNumber: { [Op.like]: `%${search}%` } },
      { email:       { [Op.like]: `%${search}%` } }
    ]
  } : {};
  const users = await User.findAll({ where, order: [['id','ASC']] });
  res.json(users);
};

// به‌روزرسانی کاربر + انتشار real-time
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  // اضافه کردن 'role' به فیلدهای قابل به‌روزرسانی
  const fields = ['firstName', 'lastName', 'phoneNumber', 'nationalId', 'email', 'isActive', 'role'];
  const data = {};
  
  // بررسی و اضافه کردن فیلدها به داده‌های ارسالی
  fields.forEach(f => { 
    if (req.body[f] !== undefined) data[f] = req.body[f]; 
  });

  // پیدا کردن کاربر بر اساس id
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' });

  // به‌روزرسانی کاربر
  await user.update(data);

  // START of EDIT: ارسال تغییرات فقط به اتاق ادمین‌ها
  req.io.to('admins').emit('userUpdated', user);
  // END of EDIT

  // پاسخ به کلاینت
  res.json(user);
};

// حذف کاربر
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'کاربر پیدا نشد' });
  await user.destroy();
  
  // START of EDIT: ارسال تغییرات فقط به اتاق ادمین‌ها
  req.io.to('admins').emit('userDeleted', { id: user.id });
  // END of EDIT

  res.json({ message: 'کاربر حذف شد' });
};