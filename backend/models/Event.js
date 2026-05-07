const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  date: {
    type: String,
    required: [true, 'Event date is required']
  },
  location: {
    type: String,
    required: false,
    trim: true,
    maxlength: [500, 'Location cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['physical', 'virtual'],
    default: 'physical'
  },
  seatCapacity: {
    type: Number,
    required: false,
    min: [1, 'Seat capacity must be at least 1'],
    default: 50
  },
  filledSeats: {
    type: Number,
    default: 0,
    min: [0, 'Filled seats cannot be negative']
  },
  assignedAgents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Custom form fields for student registration
  formFields: [{
    id: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['text', 'paragraph', 'radio', 'date', 'select', 'phone', 'email', 'number', 'country', 'qualification']
    },
    required: {
      type: Boolean,
      default: false
    },
    options: [{
      type: String
    }], // For radio and select types
    placeholder: String,
    order: {
      type: Number,
      default: 0
    },
    regex: {
      type: String,
      default: ''
    },
    regexError: {
      type: String,
      default: 'Invalid format'
    }
  }],
  // Document requirements for this event
  requiredDocuments: [{
    label: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    mandatory: {
      type: Boolean,
      default: true
    }
  }],
  // Notification settings
  notifyAgents: {
    type: Boolean,
    default: true
  },
  notificationMessage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      if (ret._id) ret.id = ret._id.toString();
      if (ret.assignedAgents && Array.isArray(ret.assignedAgents)) {
        ret.assignedAgents = ret.assignedAgents.map(id => (id && id.toString) ? id.toString() : id);
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for faster queries
eventSchema.index({ date: 1 });
eventSchema.index({ assignedAgents: 1 });

module.exports = mongoose.model('Event', eventSchema);
