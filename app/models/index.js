// app/models/index.js

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// --- کد قبلی مربوط به SQLite حذف یا کامنت می‌شود ---
/*
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false
});
*/

// --- کد جدید برای اتصال به دیتابیس از طریق URL ---
// این کد آدرس دیتابیس را از متغیر محیطی که در docker-compose.yml تعریف کردیم می‌خواند.
// این روش بسیار امن‌تر و انعطاف‌پذیرتر است.
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql', // به سادگی به Sequelize می‌گوییم که با MySQL کار کند
  logging: false,   // لاگ‌های SQL را برای تمیز بودن خروجی در محیط پروداکشن غیرفعال می‌کنیم
  dialectOptions: {
    // این گزینه برای اطمینان از سازگاری با نسخه‌های مختلف MySQL مفید است
    connectTimeout: 60000
  }
});
// ------------------------------------------------

const db = {
  sequelize,
  Sequelize
};

// load each model, passing both sequelize instance and DataTypes
// این بخش بدون هیچ تغییری باقی می‌ماند، چون Sequelize کار ترجمه را انجام می‌دهد
db.User                    = require('./user')(sequelize, DataTypes);
db.Admin                   = require('./admin')(sequelize, DataTypes);
db.Group                   = require('./group')(sequelize, DataTypes);
db.GroupMember             = require('./GroupMember')(sequelize, DataTypes);
db.Announcement            = require('./announcement')(sequelize, DataTypes);
db.AnnouncementAttachment  = require('./announcementAttachment')(sequelize, DataTypes);
db.Content                 = require('./content')(sequelize, DataTypes);
db.ContentAttachment       = require('./contentAttachment')(sequelize, DataTypes);

// set up associations
// این بخش هم بدون تغییر باقی می‌ماند
Object.values(db).forEach(model => {
  if (typeof model.associate === 'function') {
    model.associate(db);
  }
});

module.exports = db;