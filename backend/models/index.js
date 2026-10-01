const { sequelize, Sequelize } = require('../config/db');

const User = require('./User');
const Event = require('./Event');
const Student = require('./Student');
const Invoice = require('./Invoice');
const Ticket = require('./Ticket');
const Notification = require('./Notification');
const PasswordResetToken = require('./PasswordResetToken');
const University = require('./University');
const Application = require('./Application');
const Course = require('./Course');

// User <-> Student
User.hasMany(Student, { foreignKey: 'agentId', as: 'students' });
Student.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });

// Student -> User (verifier, Phase H)
Student.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier', onDelete: 'SET NULL' });
User.hasMany(Student, { foreignKey: 'verifiedBy', as: 'verifiedStudents' });

// Event <-> Student
Event.hasMany(Student, { foreignKey: 'eventId', as: 'students', onDelete: 'CASCADE' });
Student.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });


// User <-> Event (Creator)
User.hasMany(Event, { foreignKey: 'createdBy', as: 'createdEvents' });
Event.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

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

// Event <-> Application (optional source)
Event.hasMany(Application, { foreignKey: 'sourceEventId', as: 'applications', onDelete: 'SET NULL' });
Application.belongsTo(Event, { foreignKey: 'sourceEventId', as: 'sourceEvent' });

// Invoice <-> Application (optional reference)
Invoice.hasMany(Application, { foreignKey: 'invoiceId', as: 'applications', onDelete: 'SET NULL' });
Application.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// University <-> Course
University.hasMany(Course, { foreignKey: 'universityId', as: 'courses', onDelete: 'SET NULL' });
Course.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Event,
  Student,
  Invoice,
  Ticket,
  Notification,
  PasswordResetToken,
  University,
  Application,
  Course
};

