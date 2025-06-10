// app/controllers/adminShopController.js
const { Currency, UniqueItem } = require('../models');

// --- مدیریت ارزها (Currencies) ---

/**
 * ایجاد ارز جدید
 * POST /admin/api/shop/currencies
 */
exports.createCurrency = async (req, res) => {
  try {
    const { name, description, image, basePrice, priceCoefficient } = req.body;
    if (!name || !basePrice) {
      return res.status(400).json({ message: 'نام و قیمت پایه ارز الزامی است.' });
    }
    const currency = await Currency.create({ name, description, image, basePrice, priceCoefficient });
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
    const { name, description, image, basePrice, priceCoefficient } = req.body;
    await currency.update({ name, description, image, basePrice, priceCoefficient });
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
    res.json(currency);
  } catch (err) {
    console.error('Error updating modifier:', err);
    res.status(500).json({ message: 'خطا در تنظیم ضریب' });
  }
};


// --- مدیریت آیتم‌های خاص (Unique Items) ---
// (این توابع در مراحل بعدی تکمیل خواهند شد)

exports.createUniqueItem = async (req, res) => { /* ... in next steps ... */ };
exports.listUniqueItems = async (req, res) => { /* ... in next steps ... */ };
exports.updateUniqueItem = async (req, res) => { /* ... in next steps ... */ };
exports.deleteUniqueItem = async (req, res) => { /* ... in next steps ... */ };