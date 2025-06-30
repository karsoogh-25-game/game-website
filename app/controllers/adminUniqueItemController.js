// app/controllers/adminUniqueItemController.js

const { UniqueItem, Group } = require('../models');
const fs = require('fs');
const path = require('path');

exports.createUniqueItem = async (req, res) => {
  try {
    const { name, description, purchasePrice } = req.body;
    if (!name || !purchasePrice) {
      return res.status(400).json({ message: 'نام و قیمت خرید آیتم الزامی است.' });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const uniqueItem = await UniqueItem.create({
      name,
      description,
      purchasePrice,
      image: imagePath,
      status: 'in_shop' // آیتم در ابتدا در فروشگاه موجود است
    });

    res.status(201).json(uniqueItem);
  } catch (err) {
    console.error('Error creating unique item:', err);
    res.status(500).json({ message: 'خطا در سرور هنگام ایجاد آیتم خاص' });
  }
};

exports.listUniqueItems = async (req, res) => {
  try {
    const items = await UniqueItem.findAll({
      order: [['createdAt', 'DESC']],
      include: {
        model: Group,
        as: 'owner', // از نامی که در associate مدل تعریف کردیم استفاده می‌کنیم
        attributes: ['id', 'name'] // فقط نام و شناسه گروه مالک را لازم داریم
      }
    });
    res.json(items);
  } catch (err) {
    console.error('Error listing unique items:', err);
    res.status(500).json({ message: 'خطا در دریافت لیست آیتم‌های خاص' });
  }
};

exports.updateUniqueItem = async (req, res) => {
  try {
    const item = await UniqueItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'آیتم مورد نظر یافت نشد.' });
    }

    const { name, description, purchasePrice } = req.body;
    const updateData = { name, description, purchasePrice };

    if (req.file) {
      if (item.image) {
        const oldImagePath = path.join(__dirname, '..', 'public', item.image);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.warn(`Could not delete old image: ${oldImagePath}`);
        });
      }
      updateData.image = `/uploads/${req.file.filename}`;
    }

    await item.update(updateData);
    res.json(item);
  } catch (err) {
    console.error('Error updating unique item:', err);
    res.status(500).json({ message: 'خطا در ویرایش آیتم خاص' });
  }
};

exports.deleteUniqueItem = async (req, res) => {
  try {
    const item = await UniqueItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'آیتم مورد نظر یافت نشد.' });
    }

    if (item.status !== 'in_shop') {
      return res.status(400).json({ message: 'این آیتم در مالکیت یک گروه است و قابل حذف نیست.' });
    }

    if (item.image) {
      const imagePath = path.join(__dirname, '..', 'public', item.image);
      fs.unlink(imagePath, (err) => {
        if (err) console.warn(`Could not delete image: ${imagePath}`);
      });
    }

    await item.destroy();
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting unique item:', err);
    res.status(500).json({ message: 'خطا در حذف آیتم خاص' });
  }
};