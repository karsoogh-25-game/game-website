// app/models/user.js

const { DataTypes } = require('sequelize');
const bcrypt        = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    firstName:   { type: DataTypes.STRING,  allowNull: false },
    lastName:    { type: DataTypes.STRING,  allowNull: false },
    phoneNumber: { type: DataTypes.STRING,  allowNull: false, unique: true },
    nationalId:  { type: DataTypes.STRING,  allowNull: false, unique: true },
    email:       { type: DataTypes.STRING,  allowNull: false, unique: true, validate: { isEmail: true } },
    password:    { type: DataTypes.STRING,  allowNull: false },
    isActive:    { type: DataTypes.BOOLEAN, defaultValue: false },
    role:        {
      type: DataTypes.ENUM('user', 'mentor'),
      allowNull: false,
      defaultValue: 'user',
      comment: 'نقش کاربر: user یا mentor'
    },
    // ---- فیلد جنسیت (اصلاح شده نهایی) ----
    gender: {
      type: DataTypes.ENUM('male', 'female'), // فقط این دو مقدار مجاز است
      allowNull: false, // این فیلد نمی‌تواند خالی باشد
      comment: 'جنسیت کاربر'
    }
    // ---- پایان فیلد جدید ----
  }, {
    hooks: {
      beforeCreate: async (user) => {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  });

  User.prototype.validPassword = function(pass) {
    return bcrypt.compare(pass, this.password);
  };

  return User;
};