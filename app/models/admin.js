const { DataTypes } = require('sequelize');
const bcrypt        = require('bcryptjs');

module.exports = (sequelize) => {
  const Admin = sequelize.define('Admin', {
    phoneNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    password:    { type: DataTypes.STRING, allowNull: false }
  }, {
    hooks: {
      beforeCreate: async (admin) => {
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(admin.password, salt);
      }
    }
  });

  Admin.prototype.validPassword = function(pass) {
    return bcrypt.compare(pass, this.password);
  };

  return Admin;
};
