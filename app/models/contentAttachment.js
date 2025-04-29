// app/models/contentAttachment.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const ContentAttachment = sequelize.define('ContentAttachment', {
    contentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    originalName: DataTypes.STRING,
    filename:     DataTypes.STRING,
    path:         DataTypes.STRING
  }, {});
  ContentAttachment.associate = models => {
    ContentAttachment.belongsTo(models.Content, {
      foreignKey: 'contentId',
      onDelete: 'CASCADE'
    });
  };
  return ContentAttachment;
};
