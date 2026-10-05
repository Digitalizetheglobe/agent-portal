const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invoice = sequelize.define('Invoice', {
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
  agentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  studentIds: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  amount: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  commissionRate: {
    type: DataTypes.DOUBLE,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Paid', 'Rejected'),
    defaultValue: 'Pending'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  invoiceUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  raisedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // Finance Review Milestone
  financeReviewStatus: {
    type: DataTypes.ENUM('PendingReview', 'UnderReview', 'CorrectionRequired', 'Resubmitted', 'Approved', 'Rejected'),
    defaultValue: 'PendingReview'
  },
  financeReviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  financeReviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  financeReviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  financeRejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  financeReviewHistory: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  timestamps: true,
  tableName: 'Invoices',
  indexes: [
    { fields: ['invoiceNumber'], unique: true },
    { fields: ['agentId', 'status'] },
    { fields: ['financeReviewStatus'] }
  ]
});

// Instance method to JSON transform
Invoice.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  return values;
};

// Compatibility static helpers
Invoice.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

Invoice.findByIdAndUpdate = async function(id, updateData, options = {}) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  return await instance.update(updateData, options);
};

Invoice.findByIdAndDelete = async function(id) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  await instance.destroy();
  return instance;
};

Invoice.countDocuments = function(criteria = {}) {
  const where = { ...criteria };
  return this.count({ where });
};

Invoice.deleteMany = function(criteria = {}) {
  const where = { ...criteria };
  return this.destroy({ where });
};

Invoice.updateMany = function(criteria = {}, updateData = {}) {
  const where = { ...criteria };
  return this.update(updateData, { where });
};

module.exports = Invoice;
