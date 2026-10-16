const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// One message in the live chat between an agent and QStudy staff.
// A conversation is simply all messages with the same agentId.
const ChatMessage = sequelize.define('ChatMessage', {
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
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE'
  },
  // Who wrote it (the agent, or the staff member who replied)
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE'
  },
  fromAgent: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // When the other side opened it
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'ChatMessages',
  timestamps: true,
  indexes: [{ fields: ['agentId', 'createdAt'] }]
});

module.exports = ChatMessage;
