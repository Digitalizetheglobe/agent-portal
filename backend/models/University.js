const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const University = sequelize.define('University', {
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
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  contactPerson: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Commission percentage QStudy pays agents on the tuition fee of an admission to this university.
  // Set by the Head of Admission / super admin. Null = not set yet (invoices cannot be raised).
  commissionRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  // How the commission is paid: 'percentage' (commissionRate of the tuition) or 'fixed'
  // (commissionFixedAmount for each student, in the invoice currency)
  commissionType: {
    type: DataTypes.STRING(12),
    allowNull: false,
    defaultValue: 'percentage'
  },
  commissionFixedAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // Fee structure the student pays besides tuition: [{ id, label, amount, currency, note }]
  fees: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  // Brochure files: [{ id, title, fileName, fileUrl, contentType, size, uploadedAt, uploadedBy }]
  brochures: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  timestamps: true,
  tableName: 'Universities',
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['status'] }
  ]
});

// Instance method to JSON transform
University.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  if (values.commissionRate !== null && values.commissionRate !== undefined) {
    values.commissionRate = parseFloat(values.commissionRate);
  }
  if (values.commissionFixedAmount !== null && values.commissionFixedAmount !== undefined) {
    values.commissionFixedAmount = parseFloat(values.commissionFixedAmount);
  }
  return values;
};

// Compatibility static helpers
University.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

University.findByIdAndUpdate = async function(id, updateData, options = {}) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  return await instance.update(updateData, options);
};

University.findByIdAndDelete = async function(id) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  await instance.destroy();
  return instance;
};

University.countDocuments = function(criteria = {}) {
  const where = { ...criteria };
  return this.count({ where });
};

University.deleteMany = function(criteria = {}) {
  const where = { ...criteria };
  return this.destroy({ where });
};

University.updateMany = function(criteria = {}, updateData = {}) {
  const where = { ...criteria };
  return this.update(updateData, { where });
};

module.exports = University;
