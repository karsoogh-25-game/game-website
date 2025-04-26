const { Group, GroupMember, User, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.createGroup = async (req, res) => {
  const { name } = req.body;
  const userId = req.session.userId;
  if (!name) return res.status(400).json({ success:false, message:'نام گروه لازم است' });

  const t = await sequelize.transaction();
  try {
    // بساز گروه با leaderId
    const group = await Group.create({ name, leaderId:userId }, { transaction:t });
    // اضافه کن سرگروه به جدول میانی
    await GroupMember.create({ groupId:group.id, userId, role:'leader' }, { transaction:t });
    await t.commit();
    res.json({ success:true, group });
  } catch(err) {
    await t.rollback();
    res.status(500).json({ success:false, message:'خطا در ایجاد گروه' });
  }
};

exports.addMember = async (req, res) => {
  const { groupId, userIdToAdd } = req.body;
  // چک کن تعداد اعضا کمتر از 3 باشد
  const count = await GroupMember.count({ where:{ groupId } });
  if (count >= 3) return res.status(400).json({ success:false, message:'گروه پر شده' });
  // اضافه کن
  await GroupMember.create({ groupId, userId:userIdToAdd, role:'member' });
  res.json({ success:true });
};

exports.leaveGroup = async (req, res) => {
  const userId = req.session.userId;
  const { groupId } = req.body;
  const t = await sequelize.transaction();
  try {
    // حذف ردیف جدول میانی
    await GroupMember.destroy({ where:{ groupId, userId } }, { transaction:t });
    // اگر این کاربر سرگروه بود:
    const wasLeader = (await Group.findByPk(groupId)).leaderId === userId;
    if (wasLeader) {
      // ببین بقیه عضو هستند؟
      const others = await GroupMember.findAll({ where:{ groupId }, transaction:t });
      if (others.length>0) {
        // یکی رندوم انتخاب کن
        const nxt = others[Math.floor(Math.random()*others.length)];
        await Group.update({ leaderId:nxt.userId }, { where:{ id:groupId }, transaction:t });
        await GroupMember.update({ role:'leader' }, { where:{ groupId, userId:nxt.userId }, transaction:t });
      } else {
        // هیچ عضوی نیست، گروه رو حذف کن
        await Group.destroy({ where:{ id:groupId }, transaction:t });
      }
    }
    await t.commit();
    res.json({ success:true });
  } catch(err) {
    await t.rollback();
    res.status(500).json({ success:false, message:'خطا در خروج از گروه' });
  }
};
