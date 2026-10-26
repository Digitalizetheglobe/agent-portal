const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// One wire from a university to QStudy. It is spread over that university's payoffs (all in the
// same currency) and lowers what the university still owes. A wrong entry is reversed, never edited.
const UniversityPayment = sequelize.define('UniversityPayment', {
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
    references: { model: 'Universities', key: 'id' }
  },
  // The currency the university paid in (any 3-letter code: USD, INR, MYR, ...)
  currency: { type: DataTypes.STRING(10), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  receivedAt: { type: DataTypes.DATEONLY, allowNull: false },
  reference: { type: DataTypes.STRING(100), allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  // Days the agent may be paid after this payment (0 = immediate). Staff only.
  paymentTermDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 14 },
  recordedBy: { type: DataTypes.UUID, allowNull: false },
  recordedByName: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'ACTIVE' },
  // How the amount was spread: [{ payoffId, amount }]
  allocations: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  reversedAt: { type: DataTypes.DATE, allowNull: true },
  reversedBy: { type: DataTypes.UUID, allowNull: true },
  reversalReason: { type: DataTypes.TEXT, allowNull: true },
  // Set when this payment was created from a payment recorded the old way, on one payoff
  legacyPayoffId: { type: DataTypes.UUID, allowNull: true, unique: true }
}, {
  timestamps: true,
  tableName: 'UniversityPayments',
  indexes: [
    { fields: ['universityId', 'currency'] },
    { fields: ['status'] }
  ]
});

UniversityPayment.prototype.toJSON = function() {
  const values = { ...this.get() };
  values._id = values.id;
  values.amount = parseFloat(values.amount) || 0;
  return values;
};

module.exports = UniversityPayment;
