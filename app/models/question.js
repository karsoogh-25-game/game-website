'use strict';
module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define('Question', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'نام سوال برای نمایش در پنل طرح سوال و سوالات خریداری شده'
    },
    imagePath: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'مسیر فایل عکس سوال'
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      },
      comment: 'امتیاز سوال'
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'رنگ کارت سوال'
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'قیمت خرید سوال (به امتیاز)'
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'شناسه کاربر طراح سوال'
    },
    creatorType: {
      type: DataTypes.ENUM('admin', 'mentor'),
      allowNull: false,
      comment: 'نوع کاربر طراح سوال'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'وضعیت فعال بودن سوال برای نمایش در ویترین'
    }
  }, {
    tableName: 'Questions',
    timestamps: true
  });

  Question.associate = function(models) {
    // If using User and Admin models separately for creators
    // Question.belongsTo(models.User, { foreignKey: 'creatorId', constraints: false, as: 'mentorCreator' });
    // Question.belongsTo(models.Admin, { foreignKey: 'creatorId', constraints: false, as: 'adminCreator' });
    // For simplicity if creatorId refers to a common user table that has a role:
    // Question.belongsTo(models.User, { foreignKey: 'creatorId', as: 'creator' });
  };

  return Question;
};
