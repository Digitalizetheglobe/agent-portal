const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  storagePath: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    default: 'application/octet-stream'
  },
  size: {
    type: Number,
    default: 0
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false, // Made optional for flexibility
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: false, // Made optional for flexibility
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: false, // Made optional for flexibility
    trim: true
  },
  country: {
    type: String,
    required: false, // Made optional for flexibility
    trim: true
  },
  education: {
    type: String,
    required: false, // Made optional for flexibility
    trim: true
  },
  courseInterested: {
    type: String,
    required: false, // Made optional for flexibility
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Agent ID is required']
  },
  documents: [documentSchema],
  // Custom form fields for flexible registration
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      ret.eventId = ret.eventId.toString();
      ret.agentId = ret.agentId.toString();
      ret.submittedAt = ret.createdAt;
      
      // Convert customFields Map to plain object
      if (ret.customFields && ret.customFields instanceof Map) {
        ret.customFields = Object.fromEntries(ret.customFields);
      }
      
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for faster queries
studentSchema.index({ eventId: 1 });
studentSchema.index({ agentId: 1 });
studentSchema.index({ email: 1 });

module.exports = mongoose.model('Student', studentSchema);
