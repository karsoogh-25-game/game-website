'use strict';

module.exports = (sequelize, DataTypes) => {
  const Group = sequelize.define('Group', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {                           // کد ۸ رقمی یکتا برای شناسایی گروه
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true
    },
    walletCode: {                     // کد کیف پول ۴ رقمی یکتا
      type: DataTypes.STRING(4),
      allowNull: false,
      unique: true
    },
    score: {                          // موجودی کیف‌پول (امتیاز گروه)
      type: DataTypes.INTEGER,
      defaultValue: 250,
      validate: {
        min: 0
      }
    }
  }, {
    hooks: {
      // قبل از اعتبارسنجی، اگر کدها تنظیم نشده‌اند، تولید و یکتا شوند
      beforeValidate: async (group) => {
        // تولید کد گروه یکتا (۸ حرف/عدد)
        if (!group.code) {
          const rndCode = () => Math.random().toString(36).substr(2, 8).toUpperCase();
          let newCode;
          do {
            newCode = rndCode();
          } while (await Group.findOne({ where: { code: newCode } }));
          group.code = newCode;
        }

        // تولید کد کیف‌پول یکتا (۴ رقم)
        if (!group.walletCode) {
          let newWallet;
          do {
            // از 1000 تا 9999
            newWallet = String(Math.floor(1000 + Math.random() * 9000));
          } while (await Group.findOne({ where: { walletCode: newWallet } }));
          group.walletCode = newWallet;
        }
      }
    }
  });

  // تعریف ارتباطات
  Group.associate = models => {
    // هر گروه یک سرگروه از نوع User دارد
    Group.belongsTo(models.User, { as: 'leader', foreignKey: 'leaderId' });

    // اعضای گروه از طریق جدول میانی GroupMember
    Group.belongsToMany(models.User, {
      through: models.GroupMember,
      as: 'members',
      foreignKey: 'groupId',
      otherKey: 'userId'
    });

    // --- ارتباطات جدید برای فروشگاه ---
    // هر گروه می‌تواند چندین کیف پول ارزی داشته باشد (ارتباط با جدول واسط)
    Group.hasMany(models.Wallet, { foreignKey: 'groupId' });
    
    // هر گروه می‌تواند چندین آیتم خاص را در مالکیت داشته باشد
    Group.hasMany(models.UniqueItem, { as: 'ownedItems', foreignKey: 'ownerGroupId' });
    // --- پایان بخش جدید ---
  };

  return Group;
};