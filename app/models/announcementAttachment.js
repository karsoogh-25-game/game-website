'use strict';
module.exports = (sequelize, DataTypes) => {
  const AnnouncementAttachment = sequelize.define('AnnouncementAttachment', {
    announcementId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    originalName: DataTypes.STRING,
    filename: DataTypes.STRING,
    path: DataTypes.STRING
  }, {});
  AnnouncementAttachment.associate = models => {
    AnnouncementAttachment.belongsTo(models.Announcement, {
      foreignKey: 'announcementId',
      onDelete: 'CASCADE'
    });
    models.Announcement.hasMany(AnnouncementAttachment, {
      foreignKey: 'announcementId',
      as: 'attachments',
      onDelete: 'CASCADE'
    });
  };
  return AnnouncementAttachment;
};
