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
        model: 'Groups', // Name of the table
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
      type: DataTypes.JSON, // [{ purchasedQuestionId: X, status: 'correct'/'incorrect', points: Y }, ...]
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
      allowNull: true, // Null until corrected
      comment: 'امتیاز نهایی کسب شده از این کمبو'
    },
    correctorId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Null until corrected
      comment: 'شناسه کاربر (ادمین یا منتور) تصحیح کننده'
    },
    correctorType: {
      type: DataTypes.ENUM('admin', 'mentor'),
      allowNull: true, // Null until corrected
      comment: 'نوع کاربر تصحیح کننده'
    },
    correctionDate: {
      type: DataTypes.DATE,
      allowNull: true // Null until corrected
    },
    correctionNotes: { // Optional notes from the corrector
        type: DataTypes.TEXT,
        allowNull: true
    }
  }, {
    tableName: 'SubmittedCombos',
    timestamps: true
  });

  SubmittedCombo.associate = function(models) {
    SubmittedCombo.belongsTo(models.Group, { foreignKey: 'groupId', as: 'group' });
    // A combo has many purchased questions that were submitted as part of it
    SubmittedCombo.hasMany(models.PurchasedQuestion, { foreignKey: 'submittedInComboId', as: 'submittedQuestions' });
    // SubmittedCombo.belongsTo(models.User, { foreignKey: 'correctorId', constraints: false, as: 'correctorDetails' });
  };

  return SubmittedCombo;
};
