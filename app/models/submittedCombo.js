'use strict';
module.exports = (sequelize, DataTypes) => {
  const SubmittedCombo = sequelize.define('SubmittedCombo', {
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
    // purchasedQuestionIds: { // We will use the association through PurchasedQuestion's submittedInComboId
    //   type: DataTypes.JSON, // Example: [1, 2, 3] - IDs of PurchasedQuestions
    //   allowNull: false,
    // },
    submissionDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    correctionDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'جزئیات تصحیح هر سوال در کمبو'
    },
    status: {
      type: DataTypes.ENUM('pending_correction', 'corrected', 'partially_correct', 'fully_correct', 'incorrect'),
      allowNull: false,
      defaultValue: 'pending_correction',
      comment: 'وضعیت کمبوی ارسالی'
    },
    awardedPoints: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'امتیاز نهایی کسب شده از این کمبو'
    },
    correctorId: {
      type: DataTypes.INTEGER,
      allowNull: true,  
      comment: 'شناسه کاربر (ادمین یا منتور) تصحیح کننده'
    },
    correctorType: {
      type: DataTypes.ENUM('admin', 'mentor'),
      allowNull: true,  
      comment: 'نوع کاربر تصحیح کننده'
    },
    correctionDate: {
      type: DataTypes.DATE,
      allowNull: true  
    },
    correctionNotes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
  }, {
    tableName: 'SubmittedCombos',
    timestamps: true
  });

  SubmittedCombo.associate = function(models) {
    SubmittedCombo.belongsTo(models.Group, { foreignKey: 'groupId', as: 'group' });
    SubmittedCombo.hasMany(models.PurchasedQuestion, { foreignKey: 'submittedInComboId', as: 'submittedQuestions' });
    // SubmittedCombo.belongsTo(models.User, { foreignKey: 'correctorId', constraints: false, as: 'correctorDetails' });
  };

  return SubmittedCombo;
};
