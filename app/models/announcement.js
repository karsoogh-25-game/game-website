// app/models/announcement.js
module.exports = (sequelize, DataTypes) => {
    const Announcement = sequelize.define('Announcement', {
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
      },
      attachment: {
        type: DataTypes.STRING, 
        allowNull: true
      }
    });
  
    Announcement.associate = models => {
      // بیشتر
    };
  
    return Announcement;
  };
  