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
        model: 'Groups', // Name of the table
        key: 'id'
      }
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Questions', // Name of the table
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
    correctionStatus: { // Individual correction status after combo correction
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
    submittedInComboId: { // To easily find which combo this question belongs to if submitted
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'SubmittedCombos', // Name of the table (will be created next)
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
        name: 'unique_group_question' // Ensures a group cannot buy the same question twice
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
