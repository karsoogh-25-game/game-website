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
    res.status(500).json({ success:false, message:'خطا در ایجاد گروه' });
  }
};

exports.addMember = async (req, res) => {
  const { groupId, userIdToAdd } = req.body;
  const count = await GroupMember.count({ where:{ groupId } });
  if (count >= 3) return res.status(400).json({ success:false, message:'گروه پر شده' });
  await GroupMember.create({ groupId, userId:userIdToAdd, role:'member' });
  res.json({ success:true });
};

exports.leaveGroup = async (req, res) => {
  const userId = req.session.userId;
  const { groupId } = req.body;
  const t = await sequelize.transaction();
  try {
    await GroupMember.destroy({ where:{ groupId, userId } }, { transaction:t });
    const wasLeader = (await Group.findByPk(groupId)).leaderId === userId;
    if (wasLeader) {
      const others = await GroupMember.findAll({ where:{ groupId }, transaction:t });
      if (others.length>0) {
        const nxt = others[Math.floor(Math.random()*others.length)];
        await Group.update({ leaderId:nxt.userId }, { where:{ id:groupId }, transaction:t });
        await GroupMember.update({ role:'leader' }, { where:{ groupId, userId:nxt.userId }, transaction:t });
      } else {
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

// اصلاح‌شده: getMyGroup
exports.getMyGroup = async (req, res) => {
  const userId = req.session.userId;
  try {
    // ابتدا ببین عضو هست یا نه
    const membership = await GroupMember.findOne({ where: { userId } });
    if (!membership) {
      return res.json({ member: false });
    }

    // بعد اطلاعات گروه را جداگانه واکشی کن
    const group = await Group.findByPk(membership.groupId, {
      include: [
        { model: User, as: 'leader', attributes: ['id','firstName','lastName'] }
      ]
    });

    if (!group) {
      return res.status(404).json({ member: false, message: 'گروه یافت نشد' });
    }

    // اعضا را با متد getUsers بخوان
    const members = await group.getUsers({
      joinTableAttributes: [],           // بدون ستون‌های میانی
      attributes: ['id','firstName','lastName']
    });

    // محاسبه رتبه
    const all = await Group.findAll({ order:[['score','DESC']] });
    const rank = all.findIndex(g=>g.id===group.id)+1;

    return res.json({
      member: true,
      role: membership.role,
      group: {
        id: group.id,
        name: group.name,
        code: group.code,
        walletCode: group.walletCode,
        score: group.score,
        rank,
        members: members.map(u=>({ id:u.id, name:u.firstName+' '+u.lastName }))
      }
    });
  } catch (err) {
    console.error('getMyGroup error:', err);
    return res.status(500).json({ member: false, message: 'خطای سرور در بارگذاری گروه' });
  }
};

// اصلاح‌شده: getRanking (با لاگ امن)
exports.getRanking = async (req, res) => {
  try {
    const groups = await Group.findAll({
      order:[['score','DESC']],
      include:[{ model: User, as:'leader', attributes:['firstName','lastName'] }]
    });
    return res.json(groups.map((g,i)=>({
      id: g.id,
      name: g.name,
      score: g.score,
      rank: i+1,
      leader: g.leader.firstName+' '+g.leader.lastName
    })));
  } catch(err) {
    console.error('getRanking error:', err);
    return res.status(500).json({ message: 'خطای سرور در بارگذاری رتبه‌بندی' });
  }
};

// new: leader removes a member
exports.removeMember = async (req, res) => {
  const leaderId = req.session.userId;
  const { memberId } = req.body;
  const group = await Group.findByPk(req.params.id);
  if (group.leaderId !== leaderId) return res.status(403).json({ success:false, message:'فقط سرگروه مجاز است.' });
  await GroupMember.destroy({ where:{ groupId:group.id, userId:memberId }});
  res.json({ success:true });
};

// new: leader deletes entire group
exports.deleteGroup = async (req, res) => {
  const leaderId = req.session.userId;
  const group = await Group.findByPk(req.params.id);
  if (group.leaderId !== leaderId) return res.status(403).json({ success:false, message:'فقط سرگروه.' });
  await GroupMember.destroy({ where:{ groupId:group.id }});
  await group.destroy();
  res.json({ success:true });
};
