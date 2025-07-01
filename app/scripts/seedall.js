// app/seedAll.js

const { User, Group, GroupMember, sequelize } = require('../models');

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
    const NUM_USERS = 100;
    const usersData = [];
    for (let i = 0; i < NUM_USERS; i++) {
      const firstName   = randomString(5);
      const lastName    = randomString(7);
      const phoneNumber = '09' + randomDigits(9);
      const nationalId  = randomDigits(10);
      const email       = `${firstName}.${lastName}${Math.floor(Math.random()*1000)}@example.com`;
      const password    = 'Password123!';
      const isActive    = Math.random() < 0.8;
      const role        = Math.random() < 0.2 ? 'mentor' : 'user';

      usersData.push({
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
    await User.bulkCreate(usersData);
    console.log(`✅ ${NUM_USERS} کاربر رندوم ایجاد شد.`);

    const allUsers = await User.findAll({ attributes: ['id'] });
    const userIds  = allUsers.map(u => u.id);

    const NUM_GROUPS = 30;
    const groupsData = [];
    for (let i = 0; i < NUM_GROUPS; i++) {
      const name       = 'grp_' + randomString(4);
      const code       = randomString(8);
      const walletCode = randomDigits(4);
      const leaderId   = userIds[Math.floor(Math.random() * userIds.length)];
      groupsData.push({ name, code, walletCode, leaderId });
    }
    const groups = await Group.bulkCreate(groupsData);
    console.log(`✅ ${NUM_GROUPS} گروه رندوم ایجاد شد.`);

    const freeUserIds = new Set(userIds);

    for (const grp of groups) {
      // سرگروه را عضو کنید
      await GroupMember.create({ groupId: grp.id, userId: grp.leaderId, role: 'leader' });
      freeUserIds.delete(grp.leaderId);

      const membersToAdd = 2;
      const freeArray = Array.from(freeUserIds);
      for (let j = 0; j < membersToAdd && freeArray.length > 0; j++) {
        const idx = Math.floor(Math.random() * freeArray.length);
        const uid = freeArray.splice(idx, 1)[0];
        await GroupMember.create({ groupId: grp.id, userId: uid, role: 'member' });
        freeUserIds.delete(uid);
      }
    }
    console.log(`✅ اعضا به گروه‌ها اختصاص یافت.`);

    process.exit(0);
  } catch (err) {
    console.error('❌ خطا در سید کردن کامل:', err);
    process.exit(1);
  }
})();
