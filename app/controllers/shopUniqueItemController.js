// app/controllers/shopUniqueItemController.js

const { UniqueItem, Group, GroupMember, sequelize } = require('../models');
exports.buyUniqueItem = async (req, res) => {
  const uniqueItemId = req.params.id;
  const userId = req.session.userId;
  const io = req.app.get('io');

  const t = await sequelize.transaction();
  try {
    const groupMember = await GroupMember.findOne({ where: { userId }, transaction: t });
    if (!groupMember) {
      throw new Error('شما عضو هیچ گروهی نیستید.');
    }
    const groupId = groupMember.groupId;

    const group = await Group.findByPk(groupId, { transaction: t, lock: t.LOCK.UPDATE });
    const item = await UniqueItem.findByPk(uniqueItemId, { transaction: t, lock: t.LOCK.UPDATE });

    if (!item) {
      throw new Error('این آیتم وجود ندارد.');
    }
    if (item.status !== 'in_shop') {
      throw new Error('این آیتم قبلاً فروخته شده و دیگر در فروشگاه موجود نیست.');
    }
    if (group.score < item.purchasePrice) {
      throw new Error('امتیاز گروه شما برای خرید این آیتم کافی نیست.');
    }

    group.score -= item.purchasePrice;
    item.status = 'owned';
    item.ownerGroupId = groupId;

    await group.save({ transaction: t });
    await item.save({ transaction: t });

    await t.commit();

    const updatedItem = await UniqueItem.findByPk(item.id, {
        include: { model: Group, as: 'owner', attributes: ['id', 'name'] }
    });

    io.emit('uniqueItemUpdated', updatedItem.toJSON());
    
    io.emit('shopUpdate');
    io.emit('leaderboardUpdate');

    res.json({ success: true, message: `آیتم "${item.name}" با موفقیت خریداری شد.` });

  } catch (err) {
    await t.rollback();
    console.error('Buy Unique Item Error:', err);
    res.status(500).json({ message: err.message || 'خطا در پردازش خرید آیتم خاص' });
  }
};


exports.sellUniqueItem = async (req, res) => {
    const uniqueItemId = req.params.id;
    const userId = req.session.userId;
    const io = req.app.get('io');
  
    const t = await sequelize.transaction();
    try {
      const groupMember = await GroupMember.findOne({ where: { userId }, transaction: t });
      if (!groupMember) {
        throw new Error('شما عضو هیچ گروهی نیستید.');
      }
      const groupId = groupMember.groupId;
      
      const group = await Group.findByPk(groupId, { transaction: t, lock: t.LOCK.UPDATE });
      const item = await UniqueItem.findByPk(uniqueItemId, { transaction: t, lock: t.LOCK.UPDATE });
  
      if (!item) {
        throw new Error('این آیتم وجود ندارد.');
      }
      if (item.ownerGroupId !== groupId) {
        throw new Error('شما مالک این آیتم نیستید و نمی‌توانید آن را بفروشید.');
      }
  
      const payout = Math.floor(item.purchasePrice * 0.85);
  
      group.score += payout;
      item.status = 'in_shop';
      item.ownerGroupId = null;
  
      await group.save({ transaction: t });
      await item.save({ transaction: t });
  
      await t.commit();

      const updatedItem = await UniqueItem.findByPk(item.id);
      
      io.emit('uniqueItemUpdated', updatedItem.toJSON());
      
      io.emit('shopUpdate');
      io.emit('leaderboardUpdate');
  
      res.json({ success: true, message: `آیتم "${item.name}" با موفقیت فروخته شد و ${payout} امتیاز به گروه شما اضافه شد.` });
  
    } catch (err) {
      await t.rollback();
      console.error('Sell Unique Item Error:', err);
      res.status(500).json({ message: err.message || 'خطا در پردازش فروش آیتم خاص' });
    }
};
