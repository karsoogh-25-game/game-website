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
  const fields = ['firstName','lastName','phoneNumber','nationalId','email','isActive'];
  const data = {};
  fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'کاربر یافت نشد' });
  await user.update(data);
  req.io.emit('userUpdated', user);
  res.json(user);
};
