'use strict';
module.exports = (sequelize, DataTypes) => {
  const GroupMember = sequelize.define('GroupMember', {
    role: {
      type: DataTypes.ENUM('leader','member'),
      allowNull: false
    }
  }, {});
  GroupMember.associate = models => {
    // این جدول میانی به Group و User وصل می‌شود
    models.Group.belongsToMany(models.User, { through: GroupMember, foreignKey:'groupId', otherKey:'userId' });
    models.User.belongsToMany(models.Group, { through: GroupMember, foreignKey:'userId', otherKey:'groupId' });
  };
  return GroupMember;
};
