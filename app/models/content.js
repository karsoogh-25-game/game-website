// app/models/content.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Content = sequelize.define('Content', {
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    shortDescription: {
      type: DataTypes.STRING,
      allowNull: true
    },
    longDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  Content.associate = models => {
    // یک به چند با ضمائم
    Content.hasMany(models.ContentAttachment, {
      foreignKey: 'contentId',
      as: 'attachments',
      onDelete: 'CASCADE'
    });
  };

  return Content;
};
