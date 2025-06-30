const { FeatureFlag, sequelize } = require('../models');

exports.getFeatureFlags = async (req, res) => {
  try {
    const flags = await FeatureFlag.findAll({
      order: [['category', 'ASC'], ['displayName', 'ASC']]
    });
    res.json(flags);
  } catch (err) {
    console.error('Error fetching feature flags:', err);
    res.status(500).json({ message: 'خطا در دریافت لیست قابلیت‌ها' });
  }
};

exports.updateFeatureFlags = async (req, res) => {
  const flagsToUpdate = req.body.flags;
  if (!Array.isArray(flagsToUpdate)) {
    return res.status(400).json({ message: 'فرمت درخواست نامعتبر است. باید یک آرایه ارسال شود.' });
  }

  const t = await sequelize.transaction();
  try {
    for (const flag of flagsToUpdate) {
      await FeatureFlag.update(
        { isEnabled: flag.isEnabled },
        { where: { name: flag.name }, transaction: t }
      );
    }
    await t.commit();

    req.io.emit('force-reload', { message: 'Admin updated site features. Reloading...' });

    res.json({ success: true, message: 'قابلیت‌ها با موفقیت به‌روزرسانی و اعمال شدند.' });

  } catch (err) {
    await t.rollback();
    console.error('Error updating feature flags:', err);
    res.status(500).json({ message: 'خطا در به‌روزرسانی قابلیت‌ها' });
  }
};
