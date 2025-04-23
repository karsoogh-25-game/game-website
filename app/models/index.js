const { Sequelize } = require('sequelize');
const path         = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false
});

const db = { sequelize };

db.User  = require('./user')(sequelize);
db.Admin = require('./admin')(sequelize);

module.exports = db;
