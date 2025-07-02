'use strict';
module.exports = (sequelize, DataTypes) => {
  const PurchasedQuestion = sequelize.define('PurchasedQuestion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Groups',
        key: 'id'
      }
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Questions',
        key: 'id'
      }
    },
    purchaseDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('purchased', 'answered', 'submitted_for_correction', 'corrected'),
      allowNull: false,
      defaultValue: 'purchased',
      comment: 'وضعیت سوال خریداری شده: خریداری شده، جواب داده شده، برای تصحیح ارسال شده، تصحیح شده'
    },
    correctionStatus: {
      type: DataTypes.ENUM('pending', 'correct', 'incorrect'),
      allowNull: true,
      defaultValue: 'pending',
      comment: 'وضعیت تصحیح این سوال خاص در یک کمبو'
    },
    answerImagePath: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'مسیر فایل عکس یا PDF جواب آپلود شده توسط کاربر'
    },
    submittedInComboId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'SubmittedCombos',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    }
  }, {
    tableName: 'PurchasedQuestions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['groupId', 'questionId'],
        name: 'unique_group_question'
      }
    ]
  });

  PurchasedQuestion.associate = function(models) {
    PurchasedQuestion.belongsTo(models.Group, { foreignKey: 'groupId', as: 'group' });
    PurchasedQuestion.belongsTo(models.Question, { foreignKey: 'questionId', as: 'question' });
    PurchasedQuestion.belongsTo(models.SubmittedCombo, { foreignKey: 'submittedInComboId', as: 'combo' });
  };

  return PurchasedQuestion;
};
