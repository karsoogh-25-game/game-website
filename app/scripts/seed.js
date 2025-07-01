// app/seed.js
const { User, sequelize } = require('../models');

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < length; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

function randomDigits(length) {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += Math.floor(Math.random() * 10);
  }
  return s;
}

(async () => {
  try {
    const NUM = 50;
    const users = [];

    for (let i = 0; i < NUM; i++) {
      const firstName   = randomString(5);
      const lastName    = randomString(7);
      const phoneNumber = '09' + randomDigits(9);
      const nationalId  = randomDigits(10);
      const email       = `${firstName}.${lastName}${Math.floor(Math.random()*1000)}@example.com`;
      const password    = 'Password123!';
      const isActive    = Math.random() < 0.5;
      const role        = Math.random() < 0.2 ? 'mentor' : 'user'; // 20% منتور، 80% کاربر

      users.push({
        firstName,
        lastName,
        phoneNumber,
        nationalId,
        email,
        password,
        isActive,
        role
      });
    }
    await User.bulkCreate(users);
    console.log(`✅ ${NUM} کاربر رندوم با موفقیت ایجاد شد.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ خطا در seed کردن کاربران:', err);
    process.exit(1);
  }
})();
