const User = require('../models/User');
const Event = require('../models/Event');
const { sendEmail, templates } = require('../utils/email');

// @desc    Get all agents
// @route   GET /api/agents
// @access  Private
exports.getAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' }).sort({ createdAt: -1 });
    res.status(200).json(agents.map(agent => agent.toJSON()));
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Get single agent
// @route   GET /api/agents/:id
// @access  Private
exports.getAgent = async (req, res) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'agent' });

    if (!agent) {
      return res.status(404).json({
        success: false,
        detail: 'Agent not found'
      });
    }

    res.status(200).json(agent.toJSON());
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Create agent
// @route   POST /api/agents
// @access  Private (Admin only)
exports.createAgent = async (req, res) => {
  try {
    const { name, email, userId, password, phone, status } = req.body;

    // Check if email or userId already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { userId: userId }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        detail: 'Email or User ID already exists'
      });
    }

    // Create agent
    const agent = await User.create({
      name,
      email: email.toLowerCase(),
      userId,
      password,
      phone,
      status: status || 'active',
      role: 'agent'
    });

    // Send welcome email
    const emailTemplate = templates.welcomeAgent(name, userId);
    await sendEmail(email, emailTemplate.subject, emailTemplate.html);

    res.status(201).json(agent.toJSON());
  } catch (error) {
    console.error('Create agent error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        detail: 'Email or User ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Update agent
// @route   PUT /api/agents/:id
// @access  Private (Admin only)
exports.updateAgent = async (req, res) => {
  try {
    const { name, email, password, phone, status } = req.body;

    const agent = await User.findOne({ _id: req.params.id, role: 'agent' });

    if (!agent) {
      return res.status(404).json({
        success: false,
        detail: 'Agent not found'
      });
    }

    // Check if email is being changed and already exists
    if (email && email.toLowerCase() !== agent.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          detail: 'Email already exists'
        });
      }
      agent.email = email.toLowerCase();
    }

    // Update fields
    if (name) agent.name = name;
    if (phone) agent.phone = phone;
    if (status) agent.status = status;
    if (password) agent.password = password;

    await agent.save();

    res.status(200).json(agent.toJSON());
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Delete agent
// @route   DELETE /api/agents/:id
// @access  Private (Admin only)
exports.deleteAgent = async (req, res) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, role: 'agent' });

    if (!agent) {
      return res.status(404).json({
        success: false,
        detail: 'Agent not found'
      });
    }

    // Remove agent from all events
    await Event.updateMany(
      {},
      { $pull: { assignedAgents: agent._id } }
    );

    // Delete agent
    await User.deleteOne({ _id: agent._id });

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};
