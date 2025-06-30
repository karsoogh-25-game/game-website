'use strict';
module.exports = (sequelize, DataTypes) => {
  const FeatureFlag = sequelize.define('FeatureFlag', {
    name: {
      type: DataTypes.STRING,
      primaryKey: true,
      comment: 'نام انگلیسی و منحصر به فرد قابلیت (مثلاً: menu_shop)'
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'نام نمایشی برای پنل ادمین (مثلاً: منوی فروشگاه)'
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'وضعیت فعال یا غیرفعال بودن'
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'دسته‌بندی برای نمایش در پنل (menu یا action)'
    }
  }, {
    tableName: 'FeatureFlags',
    timestamps: false
  });
  return FeatureFlag;
};