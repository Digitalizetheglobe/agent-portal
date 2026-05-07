const Ticket = require('../models/Ticket');

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
      agentId: req.user._id,
      subject,
      description,
      priority,
      status: 'Open'
    });

    res.status(201).json(ticket.toJSON());
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
    let query = {};

    if (req.user.role === 'agent') {
      query.agentId = req.user._id;
    }

    const tickets = await Ticket.find(query)
      .populate('agentId', 'name email agencyName')
      .populate('responses.senderId', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json(tickets.map(t => t.toJSON()));
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
    const ticket = await Ticket.findById(req.params.id)
      .populate('agentId', 'name email agencyName')
      .populate('responses.senderId', 'name role');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        detail: 'Ticket not found'
      });
    }

    // Access check
    if (req.user.role === 'agent' && ticket.agentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    res.status(200).json(ticket.toJSON());
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
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        detail: 'Ticket not found'
      });
    }

    // Access check
    if (req.user.role === 'agent' && ticket.agentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    ticket.responses.push({
      senderId: req.user._id,
      message
    });

    // Automatically update status if admin responds
    if (req.user.role === 'admin' && ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('agentId', 'name email agencyName')
      .populate('responses.senderId', 'name role');

    res.status(201).json(populatedTicket.toJSON());
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
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        detail: 'Ticket not found'
      });
    }

    // Access check
    if (req.user.role === 'agent' && ticket.agentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    // Agents can only close their own tickets or reopen them
    // Admins can do anything
    ticket.status = status;
    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('agentId', 'name email agencyName')
      .populate('responses.senderId', 'name role');

    res.status(200).json(populatedTicket.toJSON());
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
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        detail: 'Ticket not found'
      });
    }

    // Access check - only admin can delete for now, or maybe the agent who created it?
    // User request implies admin page "delete ticket"
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        detail: 'Only admins can delete tickets'
      });
    }

    await Ticket.findByIdAndDelete(req.params.id);

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
