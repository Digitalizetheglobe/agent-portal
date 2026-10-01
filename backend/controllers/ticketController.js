const { Ticket, User } = require('../models');

// Helper to format ticket with populated agent and responses.senderId
const formatTicket = async (ticket) => {
  const t = ticket.toJSON();

  // Populate agent
  if (ticket.agent) {
    t.agentId = {
      id: ticket.agent.id,
      _id: ticket.agent.id,
      name: ticket.agent.name,
      email: ticket.agent.email,
      agencyName: ticket.agent.agencyName
    };
  } else if (t.agentId) {
    const agent = await User.findByPk(t.agentId, {
      attributes: ['id', 'name', 'email', 'agencyName']
    });
    if (agent) {
      t.agentId = {
        id: agent.id,
        _id: agent.id,
        name: agent.name,
        email: agent.email,
        agencyName: agent.agencyName
      };
    }
  }

  // Populate responses
  if (Array.isArray(t.responses) && t.responses.length > 0) {
    const senderIds = [...new Set(t.responses.map(r => typeof r.senderId === 'object' ? r.senderId?.id || r.senderId?._id : r.senderId).filter(Boolean))];
    const senders = await User.findAll({
      where: { id: senderIds },
      attributes: ['id', 'name', 'role']
    });
    const senderMap = new Map(senders.map(s => [s.id.toString(), s.toJSON()]));

    t.responses = t.responses.map(r => {
      const rawId = typeof r.senderId === 'object' ? r.senderId?.id || r.senderId?._id : r.senderId;
      const sender = senderMap.get(rawId?.toString());
      return {
        ...r,
        senderId: sender || (typeof r.senderId === 'object' ? r.senderId : { id: rawId, _id: rawId, name: 'User', role: 'agent' })
      };
    });
  } else {
    t.responses = [];
  }

  return t;
};

// @desc    Create new ticket
// @route   POST /api/tickets
// @access  Private (Agent only)
exports.createTicket = async (req, res) => {
  try {
    const { subject, description, priority } = req.body;

    if (req.user.role !== 'agent') {
      return res.status(403).json({
        success: false,
        detail: 'Only agents can create support tickets'
      });
    }

    const ticket = await Ticket.create({
      agentId: req.user.id,
      subject,
      description,
      priority: priority || 'Medium',
      status: 'Open',
      responses: []
    });

    const formatted = await formatTicket(ticket);
    res.status(201).json(formatted);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private
exports.getTickets = async (req, res) => {
  try {
    let where = {};

    if (req.user.role === 'agent') {
      where.agentId = req.user.id;
    }

    const tickets = await Ticket.findAll({
      where,
      include: [{
        model: User,
        as: 'agent',
        attributes: ['id', 'name', 'email', 'agencyName']
      }],
      order: [['createdAt', 'DESC']]
    });

    const formattedTickets = await Promise.all(
      tickets.map(t => formatTicket(t))
    );

    res.status(200).json(formattedTickets);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'agent',
        attributes: ['id', 'name', 'email', 'agencyName']
      }]
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        detail: 'Ticket not found'
      });
    }

    // Access check
    if (req.user.role === 'agent' && ticket.agentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    const formatted = await formatTicket(ticket);
    res.status(200).json(formatted);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Add response to ticket
// @route   POST /api/tickets/:id/responses
// @access  Private
exports.addResponse = async (req, res) => {
  try {
    const { message } = req.body;
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'agent',
        attributes: ['id', 'name', 'email', 'agencyName']
      }]
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        detail: 'Ticket not found'
      });
    }

    // Access check
    if (req.user.role === 'agent' && ticket.agentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    const currentResponses = Array.isArray(ticket.responses) ? [...ticket.responses] : [];
    currentResponses.push({
      senderId: req.user.id,
      message,
      timestamp: new Date()
    });

    ticket.responses = currentResponses;

    // Automatically update status if admin responds
    if (req.user.role === 'admin' && ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    await ticket.save();

    const formatted = await formatTicket(ticket);
    res.status(201).json(formatted);
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Update ticket status
// @route   PATCH /api/tickets/:id/status
// @access  Private
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'agent',
        attributes: ['id', 'name', 'email', 'agencyName']
      }]
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        detail: 'Ticket not found'
      });
    }

    // Access check
    if (req.user.role === 'agent' && ticket.agentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    ticket.status = status;
    await ticket.save();

    const formatted = await formatTicket(ticket);
    res.status(200).json(formatted);
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Private (Admin only)
exports.deleteTicket = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        detail: 'Only admins can delete tickets'
      });
    }

    const ticket = await Ticket.findByPk(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        detail: 'Ticket not found'
      });
    }

    await ticket.destroy();

    res.status(200).json({
      success: true,
      detail: 'Ticket deleted successfully'
    });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};
