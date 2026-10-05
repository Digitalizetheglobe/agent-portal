const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Payoff = sequelize.define('Payoff', {
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
  payoffNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'Invoices',
      key: 'id'
    }
  },
  grossCommission: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  deductions: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  netAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'USD'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'SETTLED', 'CANCELLED'),
    defaultValue: 'PENDING',
    allowNull: false
  },
  settlementReference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  settledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  settledBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  settlementNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  batchReference: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'Payoffs',
  indexes: [
    {
      unique: true,
      fields: ['invoiceId'],
      name: 'unique_invoice_payoff'
    },
    {
      unique: true,
      fields: ['payoffNumber'],
      name: 'unique_payoff_number'
    },
    { fields: ['agentId'] },
    { fields: ['status'] },
    { fields: ['settledBy'] }
  ]
});

// JSON formatting
Payoff.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  values.agentId = values.agentId ? values.agentId.toString() : values.agentId;
  values.invoiceId = values.invoiceId ? values.invoiceId.toString() : values.invoiceId;
  if (values.settledBy) {
    values.settledBy = values.settledBy.toString();
  }
  values.grossCommission = parseFloat(values.grossCommission) || 0;
  values.deductions = parseFloat(values.deductions) || 0;
  values.netAmount = parseFloat(values.netAmount) || 0;
  return values;
};

// Static helpers
Payoff.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

module.exports = Payoff;
