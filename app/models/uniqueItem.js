// app/models/uniqueItem.js
'use strict';
const { randomBytes } = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const UniqueItem = sequelize.define('UniqueItem', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    uniqueIdentifier: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    purchasePrice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    status: {
      type: DataTypes.ENUM('in_shop', 'owned'),
      defaultValue: 'in_shop',
      allowNull: false
    }
  }, {
    comment: 'جدول آیتم‌های خاص و یکتا',
    hooks: {
      beforeValidate: (item) => {
        if (!item.uniqueIdentifier) {
          item.uniqueIdentifier = `LIG-${randomBytes(6).toString('hex').toUpperCase()}`;
        }
      }
    }
  });

  UniqueItem.associate = function(models) {
    UniqueItem.belongsTo(models.Group, {
      as: 'owner',
      foreignKey: 'ownerGroupId',
      allowNull: true
    });
  };

  return UniqueItem;
};