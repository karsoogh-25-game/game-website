// app/controllers/adminShopController.js
const { Currency, UniqueItem, Group, Wallet, sequelize } = require('../models');
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

// اتصال به Redis برای حذف کلید کش هنگام حذف ارز
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});
if (!redisClient.isOpen) {
    redisClient.connect().catch(console.error);
}


// --- مدیریت ارزها (Currencies) ---
exports.createCurrency = async (req, res) => {
  try {
    const { name, description, basePrice, priceCoefficient } = req.body;
    if (name === undefined || basePrice === undefined) {
      return res.status(400).json({ message: 'نام و قیمت پایه ارز الزامی است.' });
    }

    let imagePath = null;
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
    }

    const currency = await Currency.create({ 
        name, 
        description, 
        image: imagePath, // ذخیره مسیر در دیتابیس
        basePrice, 
        priceCoefficient 
    });
    res.status(201).json(currency);
  } catch (err) {
    console.error('Error creating currency:', err);
    res.status(500).json({ message: 'خطا در سرور هنگام ایجاد ارز' });
  }
};

exports.listCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.findAll({ order: [['createdAt', 'DESC']] });
    res.json(currencies);
  } catch (err) {
    console.error('Error listing currencies:', err);
    res.status(500).json({ message: 'خطا در دریافت لیست ارزها' });
  }
};

exports.updateCurrency = async (req, res) => {
  try {
    const currency = await Currency.findByPk(req.params.id);
    if (!currency) {
      return res.status(404).json({ message: 'ارز مورد نظر یافت نشد.' });
    }

    const { name, description, basePrice, priceCoefficient } = req.body;
    const updateData = { name, description, basePrice, priceCoefficient };

    if (req.file) {
        if (currency.image) {
            const oldImagePath = path.join(__dirname, '..', 'public', currency.image);
            fs.unlink(oldImagePath, (err) => {
                if (err) console.warn(`Could not delete old image: ${oldImagePath}`);
            });
        }
        updateData.image = `/uploads/${req.file.filename}`;
    }
    
    await currency.update(updateData);
    
    const { updateAndBroadcastPrice } = require('./shopController');
    await updateAndBroadcastPrice(req.app.get('io'), currency);

    res.json(currency);
  } catch (err) {
    console.error('Error updating currency:', err);
    res.status(500).json({ message: 'خطا در ویرایش ارز' });
  }
};

exports.updateModifier = async (req, res) => {
  try {
    const io = req.app.get('io');
    const currency = await Currency.findByPk(req.params.id);
    if (!currency) {
      return res.status(404).json({ message: 'ارز مورد نظر یافت نشد.' });
    }
    const { modifier } = req.body;
    if (modifier === undefined || isNaN(parseFloat(modifier)) || modifier < 0) {
      return res.status(400).json({ message: 'ضریب باید یک عدد مثبت باشد.' });
    }
    currency.adminModifier = parseFloat(modifier);
    await currency.save();

    const { updateAndBroadcastPrice } = require('./shopController');
    await updateAndBroadcastPrice(io, currency);

    res.json(currency);
  } catch (err) {
    console.error('Error updating modifier:', err);
    res.status(500).json({ message: 'خطا در تنظیم ضریب' });
  }
};

exports.deleteCurrency = async (req, res) => {
    const currencyId = req.params.id;
    const io = req.app.get('io');
    const t = await sequelize.transaction();

    try {
        const currency = await Currency.findByPk(currencyId, { transaction: t });
        if (!currency) throw new Error('ارز یافت نشد.');

        const { updateAndBroadcastPrice } = require('./shopController');
        const finalPrice = await updateAndBroadcastPrice(io, currency, t);

        const wallets = await Wallet.findAll({ where: { currencyId }, transaction: t });

        if (wallets.length > 0) {
            for (const wallet of wallets) {
                const group = await Group.findByPk(wallet.groupId, { transaction: t, lock: t.LOCK.UPDATE });
                if (group) {
                    const reimbursement = finalPrice * wallet.quantity;
                    group.score += reimbursement;
                    await group.save({ transaction: t });
                }
            }
        }
        
        await Wallet.destroy({ where: { currencyId }, transaction: t });
        
        if (currency.image) {
            const imagePath = path.join(__dirname, '..', 'public', currency.image);
            fs.unlink(imagePath, (err) => {
                if (err) console.warn(`Could not delete image on currency delete: ${imagePath}`);
            });
        }

        await currency.destroy({ transaction: t });
        await redisClient.del(`price:currency:${currencyId}`);

        await t.commit();

        io.emit('currencyDeleted', { currencyId: parseInt(currencyId, 10) });
        io.emit('leaderboardUpdate');

        res.json({ success: true, message: 'ارز و دارایی‌های مرتبط با آن با موفقیت حذف شد.' });

    } catch (err) {
        await t.rollback();
        console.error('Delete currency error:', err);
        res.status(500).json({ message: err.message || 'خطا در حذف ارز' });
    }
};


exports.createUniqueItem = async (req, res) => { /* ... in next steps ... */ };
exports.listUniqueItems = async (req, res) => { /* ... in next steps ... */ };
exports.updateUniqueItem = async (req, res) => { /* ... in next steps ... */ };
exports.deleteUniqueItem = async (req, res) => { /* ... in next steps ... */ };