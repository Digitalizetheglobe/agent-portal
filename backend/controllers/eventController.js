const Event = require('../models/Event');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendEmail, templates } = require('../utils/email');

// @desc    Get all events
// @route   GET /api/events
// @access  Private
exports.getEvents = async (req, res) => {
  try {
    let query = {};

    // Agents only see assigned events
    if (req.user.role === 'agent') {
      query.assignedAgents = req.user._id;
    }

    const events = await Event.find(query).sort({ date: -1 });
    res.status(200).json(events.map(event => event.toJSON()));
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        detail: 'Event not found'
      });
    }

    // Check if agent has access to this event
    if (req.user.role === 'agent') {
      const hasAccess = event.assignedAgents.some(
        agentId => agentId.toString() === req.user._id.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          detail: 'Access denied'
        });
      }
    }

    res.status(200).json(event.toJSON());
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Create event
// @route   POST /api/events
// @access  Private (Admin only)
exports.createEvent = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      date, 
      location, 
      seatCapacity, 
      assignedAgents, 
      formFields, 
      notifyAgents, 
      notificationMessage 
    } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
      location,
      seatCapacity,
      assignedAgents: assignedAgents || [],
      formFields: formFields || [],
      notifyAgents: notifyAgents !== false,
      notificationMessage: notificationMessage || '',
      createdBy: req.user._id
    });

    // Notify assigned agents
    if (notifyAgents !== false && assignedAgents && assignedAgents.length > 0) {
      for (const agentId of assignedAgents) {
        const agent = await User.findById(agentId);
        if (agent) {
          const messageText = notificationMessage || `You have been assigned to the event "${title}" scheduled for ${date}.`;
          const emailTemplate = templates.eventAssignment(agent.name, title, date, messageText);
          await sendEmail(agent.email, emailTemplate.subject, emailTemplate.html);
        }
      }
    }

    res.status(201).json(event.toJSON());
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Admin only)
exports.updateEvent = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      date, 
      location, 
      seatCapacity, 
      assignedAgents, 
      formFields, 
      notifyAgents, 
      notificationMessage 
    } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        detail: 'Event not found'
      });
    }

    // Get old assigned agents to compare
    const oldAgentIds = event.assignedAgents.map(id => id.toString());

    // Update fields
    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (date !== undefined) event.date = date;
    if (location !== undefined) event.location = location;
    if (seatCapacity !== undefined) event.seatCapacity = seatCapacity;
    if (assignedAgents !== undefined) event.assignedAgents = assignedAgents;
    if (formFields !== undefined) event.formFields = formFields;
    if (notifyAgents !== undefined) event.notifyAgents = notifyAgents;
    if (notificationMessage !== undefined) event.notificationMessage = notificationMessage;

    await event.save();

    // Notify newly assigned agents
    if (notifyAgents !== false && assignedAgents) {
      const newAgentIds = assignedAgents.filter(id => !oldAgentIds.includes(id));
      for (const agentId of newAgentIds) {
        const agent = await User.findById(agentId);
        if (agent) {
          const messageText = notificationMessage || `You have been assigned to the event "${event.title}" scheduled for ${event.date}.`;
          const emailTemplate = templates.eventAssignment(agent.name, event.title, event.date, messageText);
          await sendEmail(agent.email, emailTemplate.subject, emailTemplate.html);
        }
      }
    }

    res.status(200).json(event.toJSON());
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Admin only)
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        detail: 'Event not found'
      });
    }

    // Delete all students associated with this event
    await Student.deleteMany({ eventId: event._id });

    // Delete event
    await Event.deleteOne({ _id: event._id });

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};
