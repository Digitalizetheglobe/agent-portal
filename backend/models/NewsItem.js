const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const NewsItem = sequelize.define('NewsItem', {
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
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('news', 'update'),
    allowNull: false,
    defaultValue: 'news'
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  videoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  youtubeUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  publishedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'NewsItems',
  indexes: [
    { fields: ['publishedAt'] },
    { fields: ['category'] }
  ]
});

NewsItem.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  return values;
};

module.exports = NewsItem;
