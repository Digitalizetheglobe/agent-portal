const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// One message in the live chat between an agent and QStudy staff.
// A conversation is all messages with the same agentId and channel:
//   direct  - the agent and their Account Manager
//   support - the general helpdesk
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
  channel: {
    type: DataTypes.ENUM('direct', 'support'),
    allowNull: false,
    defaultValue: 'direct'
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
  indexes: [{ fields: ['agentId', 'channel', 'createdAt'] }]
});

module.exports = ChatMessage;
