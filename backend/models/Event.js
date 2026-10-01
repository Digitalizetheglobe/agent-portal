const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Event = sequelize.define('Event', {
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('physical', 'virtual'),
    defaultValue: 'physical'
  },
  seatCapacity: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  filledSeats: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  assignedAgents: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  formFields: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  requiredDocuments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  notifyAgents: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notificationMessage: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }
}, {
  timestamps: true,
  tableName: 'Events',
  indexes: [
    { fields: ['date'] }
  ]
});

// Instance method to JSON transform
Event.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  if (Array.isArray(values.assignedAgents)) {
    values.assignedAgents = values.assignedAgents.map(a => (a && a.toString) ? a.toString() : a);
  }
  return values;
};

// Compatibility static helpers
Event.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

Event.findByIdAndUpdate = async function(id, updateData, options = {}) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  // Handle MongoDB $inc if present
  if (updateData && updateData.$inc) {
    for (const [key, val] of Object.entries(updateData.$inc)) {
      instance[key] = (instance[key] || 0) + val;
    }
    delete updateData.$inc;
  }
  return await instance.update(updateData, options);
};

Event.findByIdAndDelete = async function(id) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  await instance.destroy();
  return instance;
};

Event.countDocuments = function(criteria = {}) {
  const where = { ...criteria };
  return this.count({ where });
};

Event.deleteMany = function(criteria = {}) {
  const where = { ...criteria };
  return this.destroy({ where });
};

Event.updateMany = function(criteria = {}, updateData = {}) {
  const where = { ...criteria };
  return this.update(updateData, { where });
};

module.exports = Event;
