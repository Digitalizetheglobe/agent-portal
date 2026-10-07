const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Application = sequelize.define('Application', {
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
  applicationNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },

  // Relationships
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Students',
      key: 'id'
    }
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  universityId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Universities',
      key: 'id'
    }
  },
  sourceEventId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Events',
      key: 'id'
    }
  },

  // Course / Intake
  // courseId references the Course catalog; null only for legacy free-text applications.
  courseId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  courseName: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  courseLevel: {
    type: DataTypes.ENUM('Undergraduate', 'Postgraduate', 'Diploma', 'Doctorate', 'Certificate'),
    allowNull: true
  },
  intakeTerm: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  tuitionFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'USD'
  },

  // Lifecycle Status (Note: isInvoiceEligible is tracked separately)
  status: {
    type: DataTypes.ENUM(
      'Draft',
      'Submitted',
      'UnderReview',
      'VisitScheduled',
      'VisitCompleted',
      'OfferReceived',
      'ConditionalOffer',
      'AdmissionConfirmed',
      'Enrolled',
      'Rejected',
      'Withdrawn'
    ),
    defaultValue: 'Draft'
  },

  // University Visit Milestone
  visitDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  visitLocation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  visitNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  visitCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  // Offer Milestone
  offerDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  offerLetterUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  offerConditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // Admission Milestone
  admissionDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  admissionLetterUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  universityStudentId: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // Enrollment Milestone
  enrollmentDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  enrollmentProofUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Deposit lifecycle: Required -> Paid -> Verified | NotVerified.
  // Only 'Verified' counts toward enrollment and commission eligibility.
  depositStatus: {
    type: DataTypes.ENUM('Required', 'Paid', 'Verified', 'NotVerified'),
    allowNull: false,
    defaultValue: 'Required'
  },
  // Legacy mirror: true once the deposit has been reported paid (Paid, Verified or NotVerified)
  depositPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  depositAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  depositVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  depositVerifiedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  depositNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // Invoice Linkage
  isInvoiceEligible: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isInvoiced: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Invoices',
      key: 'id'
    }
  },

  // Audit
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  history: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  timestamps: true,
  tableName: 'Applications',
  indexes: [
    { fields: ['applicationNumber'], unique: true },
    { fields: ['studentId'] },
    { fields: ['agentId'] },
    { fields: ['universityId'] },
    { fields: ['courseId'] },
    { fields: ['sourceEventId'] },
    { fields: ['status'] }
  ]
});

// Instance method to JSON transform
Application.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  values.studentId = values.studentId ? values.studentId.toString() : values.studentId;
  values.agentId = values.agentId ? values.agentId.toString() : values.agentId;
  values.universityId = values.universityId ? values.universityId.toString() : values.universityId;
  if (values.courseId) {
    values.courseId = values.courseId.toString();
  }
  if (values.sourceEventId) {
    values.sourceEventId = values.sourceEventId.toString();
  }
  if (values.invoiceId) {
    values.invoiceId = values.invoiceId.toString();
  }
  return values;
};

// Compatibility static helpers
Application.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

Application.findByIdAndUpdate = async function(id, updateData, options = {}) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  return await instance.update(updateData, options);
};

Application.findByIdAndDelete = async function(id) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  await instance.destroy();
  return instance;
};

Application.countDocuments = function(criteria = {}) {
  const where = { ...criteria };
  return this.count({ where });
};

Application.deleteMany = function(criteria = {}) {
  const where = { ...criteria };
  return this.destroy({ where });
};

Application.updateMany = function(criteria = {}, updateData = {}) {
  const where = { ...criteria };
  return this.update(updateData, { where });
};

module.exports = Application;
