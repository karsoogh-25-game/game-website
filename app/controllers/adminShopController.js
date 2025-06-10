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

/**
 * ایجاد ارز جدید
 * POST /admin/api/shop/currencies
 */
exports.createCurrency = async (req, res) => {
  try {
    const { name, description, basePrice, priceCoefficient } = req.body;
    if (name === undefined || basePrice === undefined) {
      return res.status(400).json({ message: 'نام و قیمت پایه ارز الزامی است.' });
    }

    // --- START of EDIT: ذخیره مسیر عکس ---
    let imagePath = null;
    if (req.file) {
        // مسیر ذخیره شده توسط multer را به فرمت /uploads/filename.ext تبدیل می‌کنیم
        imagePath = `/uploads/${req.file.filename}`;
    }
    // --- END of EDIT ---

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

/**
 * مشاهده لیست همه ارزها
 * GET /admin/api/shop/currencies
 */
exports.listCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.findAll({ order: [['createdAt', 'DESC']] });
    res.json(currencies);
  } catch (err) {
    console.error('Error listing currencies:', err);
    res.status(500).json({ message: 'خطا در دریافت لیست ارزها' });
  }
};

/**
 * ویرایش اطلاعات پایه ارز
 * PUT /admin/api/shop/currencies/:id
 */
exports.updateCurrency = async (req, res) => {
  try {
    const currency = await Currency.findByPk(req.params.id);
    if (!currency) {
      return res.status(404).json({ message: 'ارز مورد نظر یافت نشد.' });
    }

    const { name, description, basePrice, priceCoefficient } = req.body;
    const updateData = { name, description, basePrice, priceCoefficient };

    // --- START of EDIT: مدیریت آپلود عکس جدید و حذف عکس قدیمی ---
    if (req.file) {
        // اگر عکس قدیمی وجود داشت، آن را از سرور حذف کن
        if (currency.image) {
            const oldImagePath = path.join(__dirname, '..', 'public', currency.image);
            // fs.unlink برای حذف فایل است. در صورت خطا، فقط یک هشدار در لاگ ثبت می‌کنیم.
            fs.unlink(oldImagePath, (err) => {
                if (err) console.warn(`Could not delete old image: ${oldImagePath}`);
            });
        }
        // مسیر عکس جدید را برای ذخیره در دیتابیس تنظیم کن
        updateData.image = `/uploads/${req.file.filename}`;
    }
    // --- END of EDIT ---
    
    await currency.update(updateData);
    
    // بعد از ویرایش، قیمت کش شده را آپدیت می‌کنیم
    const { updateAndBroadcastPrice } = require('./shopController');
    await updateAndBroadcastPrice(req.app.get('io'), currency);

    res.json(currency);
  } catch (err) {
    console.error('Error updating currency:', err);
    res.status(500).json({ message: 'خطا در ویرایش ارز' });
  }
};

/**
 * تنظیم ضریب ادمین (Buff/Nerf)
 * PUT /admin/api/shop/currencies/:id/modifier
 */
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

/**
 * DELETE /admin/api/shop/currencies/:id
 * → حذف ارز و بازگرداندن امتیاز به کاربران
 */
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
        
        // --- START of EDIT: حذف عکس ارز از سرور ---
        if (currency.image) {
            const imagePath = path.join(__dirname, '..', 'public', currency.image);
            fs.unlink(imagePath, (err) => {
                if (err) console.warn(`Could not delete image on currency delete: ${imagePath}`);
            });
        }
        // --- END of EDIT ---

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


// --- مدیریت آیتم‌های خاص (Unique Items) ---
// (این توابع در مراحل بعدی تکمیل خواهند شد)
exports.createUniqueItem = async (req, res) => { /* ... in next steps ... */ };
exports.listUniqueItems = async (req, res) => { /* ... in next steps ... */ };
exports.updateUniqueItem = async (req, res) => { /* ... in next steps ... */ };
exports.deleteUniqueItem = async (req, res) => { /* ... in next steps ... */ };