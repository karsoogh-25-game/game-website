// app/models/wallet.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Wallet = sequelize.define('Wallet', {
    // ما به یک کلید اصلی برای این جدول نیاز داریم
    // بهترین گزینه، کلید ترکیبی از شناسه گروه و شناسه ارز است
    groupId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    currencyId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    comment: 'جدول نگهداری موجودی ارزهای هر گروه',
    // از آنجایی که کلید اصلی را خودمان تعریف کردیم، دیگر نیازی به ستون پیش‌فرض id نداریم
    // و timestamps را هم برای این جدول واسط خاموش می‌کنیم
    timestamps: false
  });

  Wallet.associate = function(models) {
    // این خطوط ارتباط را به صورت صریح تعریف می‌کنند
    Wallet.belongsTo(models.Group, { foreignKey: 'groupId' });
    Wallet.belongsTo(models.Currency, { foreignKey: 'currencyId' });
  };

  return Wallet;
};