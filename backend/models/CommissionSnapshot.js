const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CommissionSnapshot = sequelize.define('CommissionSnapshot', {
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
  applicationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Applications',
      key: 'id'
    }
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Invoices',
      key: 'id'
    }
  },
  contractualTuition: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  commissionableTuition: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  commissionRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  grossAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  lockedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  lockedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  tableName: 'CommissionSnapshots',
  indexes: [
    {
      unique: true,
      fields: ['applicationId', 'invoiceId'],
      name: 'unique_application_invoice_snapshot'
    },
    { fields: ['invoiceId'] },
    { fields: ['applicationId'] },
    { fields: ['lockedBy'] }
  ]
});

// JSON formatting
CommissionSnapshot.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  values.applicationId = values.applicationId ? values.applicationId.toString() : values.applicationId;
  values.invoiceId = values.invoiceId ? values.invoiceId.toString() : values.invoiceId;
  values.lockedBy = values.lockedBy ? values.lockedBy.toString() : values.lockedBy;
  values.contractualTuition = parseFloat(values.contractualTuition) || 0;
  values.commissionableTuition = parseFloat(values.commissionableTuition) || 0;
  values.commissionRate = parseFloat(values.commissionRate) || 0;
  values.grossAmount = parseFloat(values.grossAmount) || 0;
  return values;
};

// Static helpers
CommissionSnapshot.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

module.exports = CommissionSnapshot;
