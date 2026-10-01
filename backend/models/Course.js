const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Course = sequelize.define('Course', {
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
    allowNull: true
  },
  level: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Undergraduate'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  duration: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  tuitionFee: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  universityId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  universityIds: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'Courses',
  indexes: [
    { fields: ['universityId'] },
    { fields: ['status'] },
    { fields: ['level'] }
  ]
});

// JSON serialization helper
Course.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  values.universityId = values.universityId ? values.universityId.toString() : values.universityId;

  let uIds = [];
  if (Array.isArray(values.universityIds)) {
    uIds = values.universityIds.map(String);
  } else if (values.universityId) {
    uIds = [values.universityId.toString()];
  }
  values.universityIds = uIds;
  return values;
};

// Static helper methods for compatibility
Course.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

Course.findByIdAndUpdate = async function(id, updateData, options = {}) {
  const course = await this.findByPk(id);
  if (!course) return null;
  await course.update(updateData);
  if (options.new) {
    return await this.findByPk(id);
  }
  return course;
};

Course.findByIdAndDelete = async function(id) {
  const course = await this.findByPk(id);
  if (!course) return null;
  await course.destroy();
  return course;
};

module.exports = Course;
