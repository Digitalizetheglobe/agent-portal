const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Central audit log: one row for every record created, changed or deleted anywhere in the portal,
// with who did it and when. Rows are written by the hooks in utils/audit.js and are never edited.
const AuditLog = sequelize.define('AuditLog', {
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
  at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // Who: the signed-in user. Null with actorRole 'system' for startup tasks and public actions.
  actorId: { type: DataTypes.UUID, allowNull: true },
  actorName: { type: DataTypes.STRING, allowNull: false, defaultValue: 'System' },
  // super_admin, account_manager, head_recruitment, head_admission, accounts, agent or system
  actorRole: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'system' },

  action: { type: DataTypes.ENUM('create', 'update', 'delete'), allowNull: false },
  // What: Agent, Staff, Student, Application, Invoice, Payoff, University, Course...
  entityType: { type: DataTypes.STRING(60), allowNull: false },
  entityId: { type: DataTypes.STRING(64), allowNull: false },
  // A readable name for the record (application number, invoice number, name...) kept as it was then
  entityLabel: { type: DataTypes.STRING(255), allowNull: true },
  summary: { type: DataTypes.TEXT, allowNull: false },
  // For updates: { field: { from, to } }. Secrets are hidden, long or structured values are marked "[changed]".
  changes: { type: DataTypes.JSONB, allowNull: true },

  // The request that caused it, for tracing
  endpoint: { type: DataTypes.STRING(300), allowNull: true },
  ip: { type: DataTypes.STRING(64), allowNull: true }
}, {
  timestamps: false,
  tableName: 'AuditLogs',
  indexes: [
    { fields: ['at'] },
    { fields: ['entityType', 'entityId'] },
    { fields: ['actorId'] },
    { fields: ['action'] }
  ]
});

AuditLog.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  return values;
};

module.exports = AuditLog;
