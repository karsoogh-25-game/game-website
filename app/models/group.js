'use strict';
module.exports = (sequelize, DataTypes) => {
  const Group = sequelize.define('Group', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {                           // کد ۸ رقمی یکتا
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true
    },
    walletCode: {                     // کد کیف پول ۴ رقمی
      type: DataTypes.STRING(4),
      allowNull: false,
      unique: true
    },
    score: {                          // امتیاز گروه
      type: DataTypes.INTEGER,
      defaultValue: 250,
      validate: { min: 0 }
    }
  }, {
    hooks: {
      beforeValidate: async (group) => {
        // تولید کد گروه یکتا
        if (!group.code) {
          const rnd = () => Math.random().toString(36).substr(2,8).toUpperCase();
          let c; do { c = rnd(); }
          while (await Group.findOne({ where:{ code:c } }));
          group.code = c;
        }
        // تولید کد کیف پول یکتا
        if (!group.walletCode) {
          let w;
          do { w = String(Math.floor(1000 + Math.random()*9000)); }
          while (await Group.findOne({ where:{ walletCode:w } }));
          group.walletCode = w;
        }
      }
    }
  });

  Group.associate = models => {
    // هر گروه یک سرگروه (User) دارد
    Group.belongsTo(models.User, { as:'leader', foreignKey:'leaderId' });
    // اعضای گروه (User) از طریق جدول میانی
    Group.belongsToMany(models.User, {
      through: models.GroupMember,
      as: 'members',
      foreignKey: 'groupId',
      otherKey: 'userId'
    });
  };

  return Group;
};
