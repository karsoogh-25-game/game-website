// app/controllers/groupController.js

const { Group, GroupMember, User, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.createGroup = async (req, res) => {
  const { name } = req.body;
  const userId = req.session.userId;
  if (!name) return res.status(400).json({ success:false, message:'نام گروه لازم است' });

  const t = await sequelize.transaction();
  try {
    const group = await Group.create({ name, leaderId:userId }, { transaction:t });
    await GroupMember.create({ groupId:group.id, userId, role:'leader' }, { transaction:t });
    await t.commit();
    res.json({ success:true, group });
  } catch(err) {
    await t.rollback();
    console.error('createGroup error:', err);
    res.status(500).json({ success:false, message:'خطا در ایجاد گروه' });
  }
};

exports.addMember = async (req, res) => {
  const userId = req.session.userId;
  const { code } = req.body;
  try {
    const already = await GroupMember.findOne({ where:{ userId } });
    if (already) {
      return res.status(400).json({ success:false, message:'شما در گروه دیگری هستید.' });
    }
    const group = await Group.findOne({ where:{ code } });
    if (!group) {
      return res.status(404).json({ success:false, message:'کد گروه نادرست است.' });
    }
    const count = await GroupMember.count({ where:{ groupId: group.id } });
    if (count >= 3) {
      return res.status(400).json({ success:false, message:'گروه پر است.' });
    }
    await GroupMember.create({ groupId: group.id, userId, role:'member' });
    res.json({ success:true });
  } catch(err) {
    console.error('addMember error:', err);
    res.status(500).json({ success:false, message:'خطای سرور در پیوستن به گروه' });
  }
};

exports.leaveGroup = async (req, res) => {
  const userId = req.session.userId;
  const { groupId } = req.body;
  const t = await sequelize.transaction();
  try {
    await GroupMember.destroy({ where:{ groupId, userId } }, { transaction:t });
    const group = await Group.findByPk(groupId, { transaction:t });
    if (group.leaderId === userId) {
      const others = await GroupMember.findAll({ where:{ groupId }, transaction:t });
      if (others.length > 0) {
        const nxt = others[Math.floor(Math.random()*others.length)];
        await Group.update({ leaderId:nxt.userId }, { where:{ id:groupId }, transaction:t });
        await GroupMember.update({ role:'leader' }, { where:{ groupId, userId:nxt.userId }, transaction:t });
      } else {
        await group.destroy({ transaction:t });
      }
    }
    await t.commit();
    res.json({ success:true });
  } catch(err) {
    await t.rollback();
    console.error('leaveGroup error:', err);
    res.status(500).json({ success:false, message:'خطا در خروج از گروه' });
  }
};

exports.getMyGroup = async (req, res) => {
  const userId = req.session.userId;
  try {
    // بررسی نقش
    const me = await User.findByPk(userId);
    if (me.role === 'mentor') {
      return res.json({ member:false, role:'mentor' });
    }

    // بررسی عضویت
    const membership = await GroupMember.findOne({ where:{ userId } });
    if (!membership) return res.json({ member:false, role:'user' });

    // واکشی اطلاعات گروه با سرگروه
    const group = await Group.findByPk(membership.groupId, {
      include: [
        { model: User, as:'leader', attributes:['id','firstName','lastName'] }
      ]
    });
    if (!group) return res.status(404).json({ member:false, message:'گروه یافت نشد' });

    // واکشی اعضا
    const members = await group.getMembers({
      joinTableAttributes: ['role'],
      attributes: ['id','firstName','lastName']
    });

    // محاسبه رتبه (dense)
    const allGroups = await Group.findAll({ order:[['score','DESC']] });
    const distinctScores = [...new Set(allGroups.map(g => g.score))];
    const rank = distinctScores.indexOf(group.score) + 1;

    res.json({
      member: true,
      role: membership.role,
      group: {
        id: group.id,
        name: group.name,
        code: group.code,
        walletCode: group.walletCode,
        score: group.score,
        rank,
        members: members.map(u => ({ id:u.id, name:`${u.firstName} ${u.lastName}`, role:u.GroupMember.role }))
      }
    });
  } catch(err) {
    console.error('getMyGroup error:', err);
    res.status(500).json({ member:false, message:'خطای سرور در بارگذاری گروه' });
  }
};

exports.getRanking = async (req, res) => {
  try {
    const groups = await Group.findAll({
      order:[['score','DESC']],
      include:[{ model: User, as:'leader', attributes:['firstName','lastName'] }]
    });
    const distinctScores = [...new Set(groups.map(g => g.score))];
    const result = groups.map(g => ({
      id: g.id,
      name: g.name,
      score: g.score,
      rank: distinctScores.indexOf(g.score) + 1,
      leader: `${g.leader.firstName} ${g.leader.lastName}`
    }));
    res.json(result);
  } catch(err) {
    console.error('getRanking error:', err);
    res.status(500).json({ message:'خطای سرور در بارگذاری رتبه‌بندی' });
  }
};

exports.removeMember = async (req, res) => {
  const leaderId = req.session.userId;
  const { memberId } = req.body;
  try {
    const group = await Group.findByPk(req.params.id);
    if (group.leaderId !== leaderId) {
      return res.status(403).json({ success:false, message:'فقط سرگروه مجاز است.' });
    }
    await GroupMember.destroy({ where:{ groupId:group.id, userId:memberId }});
    res.json({ success:true });
  } catch(err) {
    console.error('removeMember error:', err);
    res.status(500).json({ success:false, message:'خطای سرور' });
  }
};

exports.deleteGroup = async (req, res) => {
  const leaderId = req.session.userId;
  try {
    const group = await Group.findByPk(req.params.id);
    if (group.leaderId !== leaderId) {
      return res.status(403).json({ success:false, message:'فقط سرگروه مجاز است.' });
    }
    await GroupMember.destroy({ where:{ groupId:group.id }});
    await group.destroy();
    res.json({ success:true });
  } catch(err) {
    console.error('deleteGroup error:', err);
    res.status(500).json({ success:false, message:'خطای سرور' });
  }
};

/**
 * متد انتقال امتیاز
 */
exports.transfer = async (req, res) => {
  const io = req.app.get('io');
  const userId = req.session.userId;
  const { targetCode, amount } = req.body;
  const amt = parseInt(amount, 10);
  if (!targetCode || !amt || amt <= 0) {
    return res.status(400).json({ success:false, message:'کد و مبلغ معتبر لازم است' });
  }

  const t = await sequelize.transaction();
  try {
    // پیدا کردن گروه مقصد بر اساس walletCode
    const target = await Group.findOne({ where:{ walletCode: targetCode }}, { transaction:t });
    if (!target) {
      await t.rollback();
      return res.status(404).json({ success:false, message:'گروه مقصد یافت نشد' });
    }

    // شناسایی نقش کاربر
    const me = await User.findByPk(userId, { transaction:t });

    if (me.role === 'mentor') {
      // منتور: اعتبار نامحدود، فقط افزایش می‌دهد
    } else {
      // سرگروه: باید عضو و نقش leader باشد
      const membership = await GroupMember.findOne({ where:{ userId }}, { transaction:t });
      if (!membership || membership.role !== 'leader') {
        await t.rollback();
        return res.status(403).json({ success:false, message:'فقط سرگروه می‌تواند انتقال دهد' });
      }
      const fromGroup = await Group.findByPk(membership.groupId, { transaction:t });
      if (fromGroup.score < amt) {
        await t.rollback();
        return res.status(400).json({ success:false, message:'موجودی کافی نیست' });
      }
      // کسر امتیاز
      fromGroup.score -= amt;
      await fromGroup.save({ transaction:t });
      io.emit('bankUpdate', { code: fromGroup.walletCode });
    }

    // افزایش امتیاز گروه مقصد
    target.score += amt;
    await target.save({ transaction:t });

    await t.commit();

    // اطلاع‌رسانی ریل‌تایم
    io.emit('bankUpdate', { code: target.walletCode });

    res.json({ success:true });
  } catch(err) {
    await t.rollback();
    console.error('transfer error:', err);
    res.status(500).json({ success:false, message:'خطای سرور در انتقال' });
  }
};

/**
 * GET /api/groups/name/:code
 * برمی‌گرداند { name } گروه بر اساس walletCode
 */
exports.getGroupNameByCode = async (req, res) => {
  try {
    const code = req.params.code;
    const target = await Group.findOne({ where: { walletCode: code } });
    if (!target) {
      return res.status(404).json({ message: 'گروه مقصد یافت نشد' });
    }
    return res.json({ name: target.name });
  } catch (err) {
    console.error('getGroupName error:', err);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};

