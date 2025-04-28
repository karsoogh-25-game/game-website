// app/models/index.js

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false
});

const db = {
  sequelize,
  Sequelize
};

// load each model, passing both sequelize instance and DataTypes
db.User                    = require('./user')(sequelize, DataTypes);
db.Admin                   = require('./admin')(sequelize, DataTypes);
db.Group                   = require('./group')(sequelize, DataTypes);
db.GroupMember             = require('./GroupMember')(sequelize, DataTypes);
db.Announcement            = require('./announcement')(sequelize, DataTypes);
db.AnnouncementAttachment  = require('./announcementAttachment')(sequelize, DataTypes);

// set up associations
Object.values(db).forEach(model => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});

module.exports = db;
