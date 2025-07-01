
require('dotenv').config();

const { FeatureFlag, sequelize } = require('../models');

async function clearFeatureFlagsTable() {
  console.log('در حال اتصال به دیتابیس...');
  try {
    await sequelize.authenticate();
    console.log('اتصال به دیتابیس با موفقیت برقرار شد.');

    console.log('در حال پاک کردن جدول FeatureFlags...');
    
    await FeatureFlag.destroy({
      where: {},
      truncate: true
    });

    console.log('جدول FeatureFlags با موفقیت پاک شد.');
    console.log('دفعه بعد که برنامه اصلی (app.js) اجرا شود، جدول با مقادیر صحیح دوباره پر خواهد شد.');

    process.exit(0);

  } catch (error) {
    console.error('خطا در هنگام پاک کردن جدول:', error);
    process.exit(1);
  }
}

clearFeatureFlagsTable();
