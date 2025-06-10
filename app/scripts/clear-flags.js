// این اسکریپت برای پاک کردن کامل جدول FeatureFlags استفاده می‌شود.

// این خط برای خواندن متغیرهای محیطی از فایل .env ضروری است
require('dotenv').config();

// مدل‌های دیتابیس را برای دسترسی به FeatureFlag و sequelize ایمپورت می‌کنیم
const { FeatureFlag, sequelize } = require('../models');

// تابع اصلی را به صورت async تعریف می‌کنیم تا از await استفاده کنیم
async function clearFeatureFlagsTable() {
  console.log('در حال اتصال به دیتابیس...');
  try {
    // منتظر می‌مانیم تا اتصال به دیتابیس برقرار شود
    await sequelize.authenticate();
    console.log('اتصال به دیتابیس با موفقیت برقرار شد.');

    console.log('در حال پاک کردن جدول FeatureFlags...');
    
    // دستور اصلی برای حذف تمام رکوردهای جدول
    // گزینه truncate: true سریع‌ترین و کارآمدترین راه برای این کار است
    await FeatureFlag.destroy({
      where: {},
      truncate: true
    });

    console.log('جدول FeatureFlags با موفقیت پاک شد.');
    console.log('دفعه بعد که برنامه اصلی (app.js) اجرا شود، جدول با مقادیر صحیح دوباره پر خواهد شد.');

    // با کد 0 از اسکریپت خارج می‌شویم که به معنای موفقیت است
    process.exit(0);

  } catch (error) {
    console.error('خطا در هنگام پاک کردن جدول:', error);
    // با کد 1 از اسکریپت خارج می‌شویم که به معنای بروز خطا است
    process.exit(1);
  }
}

// تابع اصلی را اجرا می‌کنیم
clearFeatureFlagsTable();
