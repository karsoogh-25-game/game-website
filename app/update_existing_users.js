// app/update_existing_users.js

// این اسکریپت برای آپدیت کردن کاربرانی است که قبل از افزودن فیلد جنسیت ساخته شده‌اند.
// جنسیت تمام کاربرانی که جنسیت ندارند (NULL) را به 'male' تغییر می‌دهد.

require('dotenv').config();
const { sequelize, User } = require('./models');
const { Op } = require('sequelize');

async function updateUsers() {
  console.log('Connecting to the database...');
  try {
    // اتصال به دیتابیس
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // ------------------------------------------------------------------
    // مرحله ۱: همگام‌سازی دیتابیس با مدل‌ها (این خط اضافه شده است)
    // این دستور جدول Users را بررسی کرده و اگر ستون gender وجود نداشت، آن را اضافه می‌کند.
    console.log('Syncing database schema...');
    await sequelize.sync({ alter: true });
    console.log('Schema synced successfully.');
    // ------------------------------------------------------------------


    // مرحله ۲: پیدا کردن و آپدیت کردن کاربران
    console.log("Updating users with NULL gender to 'male'...");
    
    const [results, metadata] = await User.update(
      { gender: 'male' }, // مقداری که می‌خواهیم ست شود
      {
        where: {
          gender: {
            [Op.is]: null // پیدا کردن تمام کاربرانی که فیلد جنسیت آن‌ها NULL است
          }
        }
      }
    );

    if (results > 0) {
        console.log(`Update complete. ${results} users were updated successfully.`);
    } else {
        console.log('No users needed an update. All users already have a gender set.');
    }
    
  } catch (error) {
    console.error('Unable to connect to the database or update users:', error);
  } finally {
    // بستن اتصال دیتابیس
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// اجرای اسکریپت
updateUsers();