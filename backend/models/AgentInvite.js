const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// One-time onboarding link sent by an Account Manager. Only the SHA-256 hash of the
// token is stored, so a database leak cannot be used to register agents.
const AgentInvite = sequelize.define('AgentInvite', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.id;
    }
  },
  tokenHash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  // Optional prefill. When email is set, the registrant cannot change it.
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Account Manager who will own the agent that registers through this link
  accountManagerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  usedByUserId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'AgentInvites',
  indexes: [
    { fields: ['tokenHash'], unique: true },
    { fields: ['accountManagerId'] },
    { fields: ['createdBy'] }
  ]
});

AgentInvite.prototype.getState = function () {
  if (this.revokedAt) return 'revoked';
  if (this.usedAt) return 'used';
  if (new Date(this.expiresAt) < new Date()) return 'expired';
  return 'pending';
};

AgentInvite.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.tokenHash;
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  values.state = this.getState();
  return values;
};

module.exports = AgentInvite;
