// app/models/GroupMember.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const GroupMember = sequelize.define('GroupMember', {
    role: {
      type: DataTypes.ENUM('leader','member'),
      allowNull: false
    }
  }, {});

  return GroupMember;
};
