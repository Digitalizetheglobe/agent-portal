const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'PasswordResetTokens',
  indexes: [
    { fields: ['token'], unique: true },
    { fields: ['userId'] }
  ]
});

// Compatibility static helpers
PasswordResetToken.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

PasswordResetToken.countDocuments = function(criteria = {}) {
  const where = { ...criteria };
  return this.count({ where });
};

PasswordResetToken.deleteMany = function(criteria = {}) {
  const where = { ...criteria };
  return this.destroy({ where });
};

module.exports = PasswordResetToken;
