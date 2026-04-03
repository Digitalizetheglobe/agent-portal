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
  assignedAgents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      ret.assignedAgents = ret.assignedAgents.map(id => id.toString());
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
