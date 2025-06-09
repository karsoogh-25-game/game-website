// app/models/index.js

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// --- کد جدید برای اتصال به دیتابیس از طریق URL ---
// این کد آدرس دیتابیس را از متغیر محیطی که در docker-compose.yml تعریف کردیم می‌خواند.
// این روش بسیار امن‌تر و انعطاف‌پذیرتر است.
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql', // به سادگی به Sequelize می‌گوییم که با MySQL کار کند
  logging: false,   // لاگ‌های SQL را برای تمیز بودن خروجی در محیط پروداکشن غیرفعال می‌کنیم
  dialectOptions: {
    // این گزینه برای اطمینان از سازگاری با نسخه‌های مختلف MySQL مفید است
    connectTimeout: 60000
  },
  // START of EDIT: اضافه کردن تنظیمات استخر اتصالات برای بهینه‌سازی
  pool: {
    max: 15,      // حداکثر تعداد اتصالات همزمان در استخر
    min: 5,       // حداقل تعداد اتصالات باز در استخر
    acquire: 30000, // حداکثر زمان (میلی‌ثانیه) برای گرفتن یک اتصال قبل از بروز خطا
    idle: 10000     // حداکثر زمان (میلی‌ثانیه) که یک اتصال می‌تواند بیکار بماند قبل از بسته شدن
  }
  // END of EDIT
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