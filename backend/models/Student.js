const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Student = sequelize.define('Student', {
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
    type: DataTypes.STRING(100),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    set(val) {
      if (val) this.setDataValue('email', val.toLowerCase().trim());
      else this.setDataValue('email', val);
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  education: {
    type: DataTypes.STRING,
    allowNull: true
  },
  courseInterested: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  // Documents an admin has asked the agent to upload: [{ category, label, requestedBy, requestedAt }]
  documentRequests: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  customFields: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  status: {
    type: DataTypes.ENUM('Registered', 'Contacted', 'Confirmed', 'Attended', 'Converted'),
    defaultValue: 'Registered'
  },

  // --- Phase H: Student Verification ---
  verificationStatus: {
    type: DataTypes.ENUM('Pending', 'UnderReview', 'Verified', 'Rejected'),
    defaultValue: 'Pending',
    allowNull: false
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  verificationHistory: {
    type: DataTypes.JSONB,
    defaultValue: [],
    allowNull: false
  },
  verificationRejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'Students',
  indexes: [
    { fields: ['eventId'] },
    { fields: ['agentId'] },
    { fields: ['email'] },
    { fields: ['verificationStatus'] }
  ]
});

// Instance method to JSON transform
Student.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  values.eventId = values.eventId ? values.eventId.toString() : values.eventId;
  values.agentId = values.agentId ? values.agentId.toString() : values.agentId;
  values.submittedAt = values.createdAt;
  
  // Ensure customFields is plain object
  if (values.customFields && values.customFields instanceof Map) {
    values.customFields = Object.fromEntries(values.customFields);
  }
  return values;
};

// Compatibility static helpers
Student.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

Student.findByIdAndUpdate = async function(id, updateData, options = {}) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  return await instance.update(updateData, options);
};

Student.findByIdAndDelete = async function(id) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  await instance.destroy();
  return instance;
};

Student.countDocuments = function(criteria = {}) {
  const where = { ...criteria };
  return this.count({ where });
};

Student.deleteMany = function(criteria = {}) {
  const where = { ...criteria };
  return this.destroy({ where });
};

Student.updateMany = function(criteria = {}, updateData = {}) {
  const where = { ...criteria };
  return this.update(updateData, { where });
};

module.exports = Student;
