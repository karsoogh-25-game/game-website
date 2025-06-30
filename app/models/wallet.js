// app/models/wallet.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Wallet = sequelize.define('Wallet', {
    groupId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    currencyId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    comment: 'جدول نگهداری موجودی ارزهای هر گروه',
    timestamps: false
  });

  Wallet.associate = function(models) {
    Wallet.belongsTo(models.Group, { foreignKey: 'groupId' });
    Wallet.belongsTo(models.Currency, { foreignKey: 'currencyId' });
  };

  return Wallet;
};