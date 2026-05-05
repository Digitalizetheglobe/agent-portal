const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  }],
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Rejected'],
    default: 'Pending'
  },
  remarks: String,
  raisedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: Date
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for faster queries
invoiceSchema.index({ agentId: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
