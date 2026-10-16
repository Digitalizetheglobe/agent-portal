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
  },

  // ── University paid QStudy ──
  // The agent is paid only after the university has paid QStudy. Accounts or the Head of Admission
  // record that payment; until then settlement is blocked (see bypass below). The currency of the
  // payment is the payoff's own currency (USD stays USD, RM stays RM).
  universityPaidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  universityPaidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  universityPaymentReference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  universityPaymentNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  universityPaymentRecordedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  universityPaymentRecordedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // Exception: the Head of Admission (or super admin) lets the agent be paid before the university
  // has paid, with a note. Accounts can then settle.
  blockBypassedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  blockBypassedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  blockBypassNote: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // Payment slip uploaded by Accounts when the payment to the agent is marked cleared
  // { id, fileUrl, fileName, contentType, uploadedAt, uploadedBy }
  paymentSlip: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  // Audit trail: { action, by, byName, at, notes }
  history: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
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
  if (values.universityPaidAmount !== null && values.universityPaidAmount !== undefined) {
    values.universityPaidAmount = parseFloat(values.universityPaidAmount);
  }
  // Convenience flags for the screens
  values.universityPaid = Boolean(values.universityPaidAt);
  values.blockBypassed = Boolean(values.blockBypassedAt);
  values.paymentBlocked = values.status === 'PENDING' && !values.universityPaid && !values.blockBypassed;
  return values;
};

// Static helpers
Payoff.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

module.exports = Payoff;
