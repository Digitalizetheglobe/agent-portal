const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');
const { assertStrongPassword } = require('../utils/security');

const BCRYPT_ROUNDS = 12;

const User = sequelize.define('User', {
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
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    },
    set(val) {
      if (val) this.setDataValue('email', val.toLowerCase().trim());
    }
  },
  userId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Set whenever the password changes; tokens issued earlier are rejected
  passwordChangedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'agent'),
    defaultValue: 'agent'
  },
  // Staff position for role 'admin' users. null = super admin (full access).
  staffRole: {
    type: DataTypes.ENUM('account_manager', 'head_recruitment', 'head_admission', 'accounts'),
    allowNull: true
  },
  // For agents: the Account Manager (staffRole account_manager) who owns this agent.
  accountManagerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  agencyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  businessRegistrationNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fullAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // ── Onboarding review: Account Manager recommends → Head of Recruitment verifies → Head of Admission approves ──
  onboardingStatus: {
    type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'recommended', 'verified', 'correction_required', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'draft'
  },
  // Login dates, kept as proof of when the agent first and last signed in
  firstLoginAt: { type: DataTypes.DATE, allowNull: true },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  onboardingSubmittedAt: { type: DataTypes.DATE, allowNull: true },
  // "Account Manager": recommended the application
  onboardingRecommendedBy: { type: DataTypes.UUID, allowNull: true },
  onboardingRecommendedAt: { type: DataTypes.DATE, allowNull: true },
  // "Verified by": Head of Recruitment who verified it
  onboardingReviewedBy: { type: DataTypes.UUID, allowNull: true },
  onboardingReviewedAt: { type: DataTypes.DATE, allowNull: true },
  // "Approved by": Head of Admission who approved (or whoever rejected) it
  onboardingDecidedBy: { type: DataTypes.UUID, allowNull: true },
  onboardingDecidedAt: { type: DataTypes.DATE, allowNull: true },
  onboardingHistory: { type: DataTypes.JSONB, defaultValue: [] },

  // ── Agent contract + E-Certificate (after approval) ──
  // not_issued → issued (QStudy uploads the contract) → signed (QStudy uploads the signed copy)
  contractStatus: {
    type: DataTypes.ENUM('not_issued', 'issued', 'signed'),
    allowNull: false,
    defaultValue: 'not_issued'
  },
  contractIssuedAt: { type: DataTypes.DATE, allowNull: true },
  contractSignedAt: { type: DataTypes.DATE, allowNull: true },
  contractExpiresAt: { type: DataTypes.DATE, allowNull: true },
  // Every contract file ever uploaded: { id, kind: 'issued' | 'signed', fileUrl, fileName, uploadedAt, uploadedBy, uploadedByName }
  contractDocuments: { type: DataTypes.JSONB, defaultValue: [] },
  eCertificateNumber: { type: DataTypes.STRING, allowNull: true },
  eCertificateIssuedAt: { type: DataTypes.DATE, allowNull: true },
  eCertificateIssuedBy: { type: DataTypes.UUID, allowNull: true },
  // Optional uploaded certificate file: { id, fileUrl, fileName, uploadedAt }
  eCertificateFile: { type: DataTypes.JSONB, allowNull: true },
  // Activated = contract signed + E-Certificate issued. Only activated agents can submit students.
  isActivated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  activatedAt: { type: DataTypes.DATE, allowNull: true },

  // Sequential agent ID (QS-AG-0001), assigned at registration
  agentCode: { type: DataTypes.STRING, allowNull: true, unique: true },

  // Which universities the agent can see / submit students to (set by Super Admin).
  // Modes: all | malaysia_only | foreign_only | custom (uses allowedUniversityIds)
  universityAccessMode: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'all' },
  allowedUniversityIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

  // ── Agent application (QStudy agent application form) ──
  agentType: {
    type: DataTypes.ENUM('company', 'individual'),
    allowNull: true
  },
  // NRIC / passport number (individual agents)
  idNumber: { type: DataTypes.STRING, allowNull: true },
  contactPerson: { type: DataTypes.STRING, allowNull: true },
  contactDesignation: { type: DataTypes.STRING, allowNull: true },
  signatoryName: { type: DataTypes.STRING, allowNull: true },
  signatoryDesignation: { type: DataTypes.STRING, allowNull: true },
  natureOfBusiness: { type: DataTypes.TEXT, allowNull: true },
  website: { type: DataTypes.STRING, allowNull: true },
  fax: { type: DataTypes.STRING, allowNull: true },
  isRelativeOfEmployee: { type: DataTypes.BOOLEAN, defaultValue: false },
  relativeName: { type: DataTypes.STRING, allowNull: true },
  // Bank details for commission payouts
  bankBeneficiaryName: { type: DataTypes.STRING, allowNull: true },
  bankName: { type: DataTypes.STRING, allowNull: true },
  bankAccountNumber: { type: DataTypes.STRING, allowNull: true },
  bankSwiftCode: { type: DataTypes.STRING, allowNull: true },
  bankIban: { type: DataTypes.STRING, allowNull: true },
  bankAddress: { type: DataTypes.TEXT, allowNull: true },
  // Declaration signed on the application
  declarationName: { type: DataTypes.STRING, allowNull: true },
  declarationIdNumber: { type: DataTypes.STRING, allowNull: true },
  declarationAcceptedAt: { type: DataTypes.DATE, allowNull: true },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verificationStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  verificationRemarks: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  verificationDocuments: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  timestamps: true,
  tableName: 'Users',
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['userId'], unique: true },
    { fields: ['role', 'status'] }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        assertStrongPassword(user.password);
        user.password = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
        user.passwordChangedAt = new Date();
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        assertStrongPassword(user.password);
        user.password = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
        // Sessions issued before this moment stop working (see middleware/auth.js)
        user.passwordChangedAt = new Date();
      }
    }
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  if (typeof candidatePassword !== 'string' || !candidatePassword) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Hash compared against when the account does not exist, so a login for an unknown email takes as
// long as one for a real account (no account enumeration through response time).
User.DUMMY_HASH = bcrypt.hashSync('not-a-real-password-' + Date.now(), BCRYPT_ROUNDS);

// Instance method to JSON transform
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  values.id = values.id ? values.id.toString() : values.id;
  values._id = values.id;
  delete values.password;
  return values;
};

// Compatibility static helpers
User.findById = function(id, options = {}) {
  return this.findByPk(id, options);
};

User.findByIdAndUpdate = async function(id, updateData, options = {}) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  return await instance.update(updateData, options);
};

User.findByIdAndDelete = async function(id) {
  const instance = await this.findByPk(id);
  if (!instance) return null;
  await instance.destroy();
  return instance;
};

User.countDocuments = function(criteria = {}) {
  const where = { ...criteria };
  return this.count({ where });
};

User.deleteMany = function(criteria = {}) {
  const where = { ...criteria };
  return this.destroy({ where });
};

User.updateMany = function(criteria = {}, updateData = {}) {
  const where = { ...criteria };
  return this.update(updateData, { where });
};

module.exports = User;
