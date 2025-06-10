// app/controllers/shopController.js
const { Currency, Wallet, UniqueItem, Group, sequelize } = require('../models');
const { Op } = require('sequelize');

// تابع برای محاسبه قیمت لحظه‌ای (برای استفاده مجدد)
async function calculateCurrencyPrice(currency, transaction) {
  const totalOwnedResult = await Wallet.findOne({
    where: { currencyId: currency.id },
    attributes: [[sequelize.fn('SUM', sequelize.col('quantity')), 'total']],
    raw: true,
    transaction
  });
  const totalOwned = parseFloat(totalOwnedResult.total) || 0;
  const price = currency.basePrice * (1 + (totalOwned * currency.priceCoefficient)) * currency.adminModifier;
  // --- START of EDIT: گرد کردن به دو رقم اعشار ---
  return parseFloat(price.toFixed(2));
  // --- END of EDIT ---
}


/**
 * GET /api/shop/data
 * → اطلاعات کلی فروشگاه برای نمایش به کاربر
 */
exports.getShopData = async (req, res) => {
  try {
    const currencies = await Currency.findAll({ order: [['name', 'ASC']] });

    const currencyData = await Promise.all(currencies.map(async (c) => {
      const currentPrice = await calculateCurrencyPrice(c);
      return {
        id: c.id, name: c.name, description: c.description,
        image: c.image, currentPrice
      };
    }));

    const uniqueItems = await UniqueItem.findAll({
      where: { status: 'in_shop' },
      order: [['createdAt', 'DESC']]
    });

    res.json({ currencies: currencyData, uniqueItems });

  } catch (err) {
    console.error('Error fetching shop data:', err);
    res.status(500).json({ message: 'خطا در بارگذاری اطلاعات فروشگاه' });
  }
};


/**
 * GET /api/shop/my-assets
 * → دارایی‌های گروه کاربر فعلی
 */
exports.getMyAssets = async (req, res) => {
    try {
      const groupMember = await sequelize.models.GroupMember.findOne({ where: { userId: req.session.userId } });
      if (!groupMember) {
        return res.status(404).json({ message: 'شما عضو گروهی نیستید.' });
      }
      const group = await Group.findByPk(groupMember.groupId);
  
      const currencyAssets = await Wallet.findAll({
        where: { groupId: group.id, quantity: { [Op.gt]: 0 } },
        include: { model: Currency, attributes: ['name', 'image'] }
      });
  
      const uniqueItemAssets = await UniqueItem.findAll({
        where: { ownerGroupId: group.id }
      });
  
      res.json({
        score: group.score,
        currencies: currencyAssets,
        uniqueItems: uniqueItemAssets
      });
  
    } catch (err) {
      console.error('Error fetching user assets:', err);
      res.status(500).json({ message: 'خطا در بارگذاری دارایی‌ها' });
    }
  };


/**
 * POST /api/shop/currencies/buy
 * → منطق خرید ارز
 */
exports.buyCurrency = async (req, res) => {
    const { currencyId, amount } = req.body;
    const userId = req.session.userId;
  
    if (!currencyId || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'شناسه ارز و مقدار معتبر الزامی است.' });
    }
  
    const t = await sequelize.transaction();
    try {
      const groupMember = await sequelize.models.GroupMember.findOne({ where: { userId }, transaction: t });
      if (!groupMember) throw new Error('کاربر عضو گروهی نیست.');
  
      const group = await Group.findByPk(groupMember.groupId, { transaction: t, lock: t.LOCK.UPDATE });
      const currency = await Currency.findByPk(currencyId, { transaction: t });
      if (!currency) throw new Error('ارز مورد نظر یافت نشد.');
  
      const price = await calculateCurrencyPrice(currency, t);
      // --- START of EDIT: گرد کردن هزینه کل ---
      const totalCost = parseFloat((price * parseFloat(amount)).toFixed(2));
      // --- END of EDIT ---
  
      if (group.score < totalCost) {
        throw new Error('امتیاز گروه شما برای این خرید کافی نیست.');
      }
  
      const [wallet, created] = await Wallet.findOrCreate({
        where: { groupId: group.id, currencyId: currency.id },
        defaults: { quantity: 0 },
        transaction: t
      });
  
      group.score -= totalCost;
      wallet.quantity += parseFloat(amount);
  
      await group.save({ transaction: t });
      await wallet.save({ transaction: t });
  
      await t.commit();
  
      req.app.get('io').emit('shopUpdate');
      req.app.get('io').emit('leaderboardUpdate');
  
      res.json({ success: true, message: 'خرید با موفقیت انجام شد.' });
  
    } catch (err) {
      await t.rollback();
      console.error('Buy currency error:', err);
      res.status(500).json({ message: err.message || 'خطا در پردازش خرید' });
    }
  };
  

/**
 * POST /api/shop/currencies/sell
 * → منطق فروش ارز
 */
exports.sellCurrency = async (req, res) => {
    const { currencyId, amount } = req.body;
    const userId = req.session.userId;

    if (!currencyId || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: 'شناسه ارز و مقدار معتبر الزامی است.' });
    }

    const t = await sequelize.transaction();
    try {
        const groupMember = await sequelize.models.GroupMember.findOne({ where: { userId }, transaction: t });
        if (!groupMember) throw new Error('کاربر عضو گروهی نیست.');

        const group = await Group.findByPk(groupMember.groupId, { transaction: t, lock: t.LOCK.UPDATE });
        const currency = await Currency.findByPk(currencyId, { transaction: t });
        if (!currency) throw new Error('ارز مورد نظر یافت نشد.');

        const wallet = await Wallet.findOne({
            where: { groupId: group.id, currencyId: currency.id },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!wallet || wallet.quantity < parseFloat(amount)) {
            throw new Error('موجودی شما از این ارز کافی نیست.');
        }
        
        const price = await calculateCurrencyPrice(currency, t);
        // --- START of EDIT: گرد کردن سود فروش ---
        const payout = parseFloat((price * parseFloat(amount)).toFixed(2));
        // --- END of EDIT ---

        wallet.quantity -= parseFloat(amount);
        group.score += payout;

        await wallet.save({ transaction: t });
        await group.save({ transaction: t });

        await t.commit();

        req.app.get('io').emit('shopUpdate');
        req.app.get('io').emit('leaderboardUpdate');

        res.json({ success: true, message: 'فروش با موفقیت انجام شد.' });

    } catch (err) {
        await t.rollback();
        console.error('Sell currency error:', err);
        res.status(500).json({ message: err.message || 'خطا در پردازش فروش' });
    }
};