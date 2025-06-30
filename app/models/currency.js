// app/models/currency.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Currency = sequelize.define('Currency', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    basePrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
      comment: 'قیمت پایه و اولیه ارز'
    },
    priceCoefficient: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.01,
      comment: 'ضریب تاثیر تعداد کل ارز بر قیمت نهایی'
    },
    adminModifier: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
      comment: 'ضریب باف/نرف که توسط ادمین تنظیم می‌شود'
    }
  }, {
    comment: 'جدول تعریف انواع ارزهای قابل معامله در فروشگاه'
  });

  Currency.associate = function(models) {
    Currency.hasMany(models.Wallet, { foreignKey: 'currencyId' });
  };

  return Currency;
};