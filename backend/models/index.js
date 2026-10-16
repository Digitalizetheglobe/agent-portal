const { sequelize, Sequelize } = require('../config/db');

const User = require('./User');
const NewsItem = require('./NewsItem');
const Student = require('./Student');
const Invoice = require('./Invoice');
const Ticket = require('./Ticket');
const Notification = require('./Notification');
const PasswordResetToken = require('./PasswordResetToken');
const University = require('./University');
const Application = require('./Application');
const Course = require('./Course');
const CommissionSnapshot = require('./CommissionSnapshot');
const Payoff = require('./Payoff');
const AgentInvite = require('./AgentInvite');
const AuditLog = require('./AuditLog');
const UniversityUpdate = require('./UniversityUpdate');
const ChatMessage = require('./ChatMessage');
const { installAuditHooks } = require('../utils/audit');

// User <-> Student
User.belongsTo(User, { foreignKey: 'accountManagerId', as: 'accountManager', onDelete: 'SET NULL' });
User.hasMany(User, { foreignKey: 'accountManagerId', as: 'managedAgents' });

User.hasMany(Student, { foreignKey: 'agentId', as: 'students' });
Student.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

// Student -> User (verifier, Phase H)
Student.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier', onDelete: 'SET NULL' });
User.hasMany(Student, { foreignKey: 'verifiedBy', as: 'verifiedStudents' });

// User <-> NewsItem (author)
User.hasMany(NewsItem, { foreignKey: 'createdBy', as: 'newsItems' });
NewsItem.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });

// User <-> Invoice
User.hasMany(Invoice, { foreignKey: 'agentId', as: 'invoices' });
Invoice.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });
Invoice.belongsTo(User, { foreignKey: 'financeReviewedBy', as: 'reviewer' });
User.hasMany(Invoice, { foreignKey: 'financeReviewedBy', as: 'reviewedInvoices' });

// User <-> Ticket
User.hasMany(Ticket, { foreignKey: 'agentId', as: 'tickets' });
Ticket.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'recipient', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'recipient', as: 'recipientUser' });

// User <-> PasswordResetToken
User.hasMany(PasswordResetToken, { foreignKey: 'userId', as: 'resetTokens', onDelete: 'CASCADE' });
PasswordResetToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Student <-> Application
Student.hasMany(Application, { foreignKey: 'studentId', as: 'applications', onDelete: 'CASCADE' });
Application.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

// University <-> Application
University.hasMany(Application, { foreignKey: 'universityId', as: 'applications', onDelete: 'RESTRICT' });
Application.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

// User/Agent <-> Application
User.hasMany(Application, { foreignKey: 'agentId', as: 'applications' });
Application.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

// Invoice <-> Application (optional reference)
Invoice.hasMany(Application, { foreignKey: 'invoiceId', as: 'applications', onDelete: 'SET NULL' });
Application.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// University <-> Course
University.hasMany(Course, { foreignKey: 'universityId', as: 'courses', onDelete: 'SET NULL' });
Course.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

// CommissionSnapshot Associations
Invoice.hasMany(CommissionSnapshot, { foreignKey: 'invoiceId', as: 'commissionSnapshots', onDelete: 'CASCADE' });
CommissionSnapshot.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

Application.hasMany(CommissionSnapshot, { foreignKey: 'applicationId', as: 'commissionSnapshots', onDelete: 'RESTRICT' });
CommissionSnapshot.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

User.hasMany(CommissionSnapshot, { foreignKey: 'lockedBy', as: 'lockedSnapshots' });
CommissionSnapshot.belongsTo(User, { foreignKey: 'lockedBy', as: 'lockedByUser' });

// Payoff Associations
Invoice.hasOne(Payoff, { foreignKey: 'invoiceId', as: 'payoff', onDelete: 'RESTRICT' });
Payoff.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

User.hasMany(Payoff, { foreignKey: 'agentId', as: 'payoffs' });
Payoff.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

User.hasMany(Payoff, { foreignKey: 'settledBy', as: 'settledPayoffs' });
Payoff.belongsTo(User, { foreignKey: 'settledBy', as: 'settler' });

// Agent onboarding invites
User.hasMany(AgentInvite, { foreignKey: 'createdBy', as: 'sentInvites', onDelete: 'CASCADE' });
AgentInvite.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
AgentInvite.belongsTo(User, { foreignKey: 'accountManagerId', as: 'accountManager', onDelete: 'SET NULL' });

// University <-> UniversityUpdate (news and scholarship updates)
University.hasMany(UniversityUpdate, { foreignKey: 'universityId', as: 'updates', onDelete: 'CASCADE' });
UniversityUpdate.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

// Live chat: a conversation is all messages of one agent
User.hasMany(ChatMessage, { foreignKey: 'agentId', as: 'chatMessages', onDelete: 'CASCADE' });
ChatMessage.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender', onDelete: 'CASCADE' });

// Every create / update / delete of any record is written to the audit log, with who did it
installAuditHooks(sequelize, AuditLog);

module.exports = {
  sequelize,
  Sequelize,
  AuditLog,
  UniversityUpdate,
  ChatMessage,
  User,
  NewsItem,
  Student,
  Invoice,
  Ticket,
  Notification,
  PasswordResetToken,
  University,
  Application,
  Course,
  CommissionSnapshot,
  Payoff,
  AgentInvite
};

