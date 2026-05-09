const Invoice = require('../models/Invoice');
const Student = require('../models/Student');
const { v4: uuidv4 } = require('uuid');

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private (Agent only)
exports.createInvoice = async (req, res) => {
  try {
    const { studentIds, amount, commissionRate, remarks, invoiceUrl } = req.body;

    if (req.user.role !== 'agent') {
      return res.status(403).json({
        success: false,
        detail: 'Only agents can raise invoices'
      });
    }

    if (!studentIds || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        detail: 'Please provide at least one student'
      });
    }

    // Verify students belong to agent and are "Converted"
    const students = await Student.find({
      _id: { $in: studentIds },
      agentId: req.user._id,
      status: 'Converted'
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        detail: 'One or more students are not eligible for invoicing (must be Converted and belong to you)'
      });
    }

    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const invoice = await Invoice.create({
      agentId: req.user._id,
      studentIds,
      invoiceNumber,
      amount,
      commissionRate,
      remarks,
      invoiceUrl,
      status: 'Pending'
    });

    res.status(201).json(invoice.toJSON());
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'agent') {
      query.agentId = req.user._id;
    }

    const invoices = await Invoice.find(query)
      .populate('agentId', 'name email agencyName')
      .populate('studentIds', 'name email status')
      .sort({ createdAt: -1 });

    res.status(200).json(invoices.map(inv => inv.toJSON()));
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('agentId', 'name email agencyName')
      .populate('studentIds', 'name email status');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        detail: 'Invoice not found'
      });
    }

    // Access check
    if (req.user.role === 'agent' && invoice.agentId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    res.status(200).json(invoice.toJSON());
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Update invoice status
// @route   PATCH /api/invoices/:id/status
// @access  Private (Admin only)
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        detail: 'Only admins can update invoice status'
      });
    }

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        detail: 'Invoice not found'
      });
    }

    invoice.status = status;
    if (remarks) invoice.remarks = remarks;
    if (status === 'Paid') invoice.paidAt = Date.now();

    await invoice.save();

    res.status(200).json(invoice.toJSON());
  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};
