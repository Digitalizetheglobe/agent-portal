const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// A news item or scholarship update the Head of Admission publishes for one university.
// Publishing notifies the agents (in the portal and by email).
const UniversityUpdate = sequelize.define('UniversityUpdate', {
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
  universityId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Universities', key: 'id' },
    onDelete: 'CASCADE'
  },
  type: {
    type: DataTypes.ENUM('news', 'scholarship'),
    allowNull: false,
    defaultValue: 'news'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // Scholarships: what it is worth and when to apply by (both optional)
  amount: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  deadline: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'UniversityUpdates',
  indexes: [
    { fields: ['universityId', 'publishedAt'] },
    { fields: ['type'] }
  ]
});

UniversityUpdate.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  return values;
};

module.exports = UniversityUpdate;
