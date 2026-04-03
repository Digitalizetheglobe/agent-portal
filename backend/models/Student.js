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
    required: [true, 'Student name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  education: {
    type: String,
    required: [true, 'Education is required'],
    trim: true
  },
  courseInterested: {
    type: String,
    required: [true, 'Course interest is required'],
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
  documents: [documentSchema]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      ret.eventId = ret.eventId.toString();
      ret.agentId = ret.agentId.toString();
      ret.submittedAt = ret.createdAt;
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
