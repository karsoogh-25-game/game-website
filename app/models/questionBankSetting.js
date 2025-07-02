'use strict';
module.exports = (sequelize, DataTypes) => {
  const QuestionBankSetting = sequelize.define('QuestionBankSetting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    comboMultiplier: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2,
      comment: 'ضریب امتیاز برای کمبوی معمولی (سه کارت همرنگ)'
    },
    sequentialComboMultiplier: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 4,
      comment: 'ضریب امتیاز برای کمبوی همرنگ با اعداد پشت سر هم'
    }
  }, {
    tableName: 'QuestionBankSettings',
    timestamps: true 
  });

  QuestionBankSetting.afterSync(async () => {
    const count = await QuestionBankSetting.count();
    if (count === 0) {
      await QuestionBankSetting.create({
        comboMultiplier: 2,
        sequentialComboMultiplier: 4
      });
      console.log('Default QuestionBankSettings seeded.');
    }
  });

  return QuestionBankSetting;
};
