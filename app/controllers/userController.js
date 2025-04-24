const { User } = require('../models');

exports.renderDashboard = async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  res.render('dashboard', { user });
};
