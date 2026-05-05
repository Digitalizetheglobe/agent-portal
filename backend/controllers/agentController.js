const User = require('../models/User');
const Event = require('../models/Event');
const { sendEmail, templates } = require('../utils/email');
const { putObject, generateStoragePath } = require('../utils/storage');
const { v4: uuidv4 } = require('uuid');
const { createNotification } = require('./notificationController');

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
        ...(userId ? [{ userId }] : [])
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        detail: 'Email or User ID already exists'
      });
    }

    // Create agent — agents start unverified and require admin approval
    const agent = await User.create({
      name,
      email: email.toLowerCase(),
      userId,
      password,
      phone,
      status: status || 'active',
      role: 'agent',
      isVerified: false
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

// @desc    Create a new admin user
// @route   POST /api/agents/admin
// @access  Private (Admin only)
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        detail: 'Name, email, and password are required'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        detail: 'An account with this email already exists'
      });
    }

    // Admins are always verified — no approval workflow needed
    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: 'admin',
      status: 'active',
      isVerified: true
    });

    res.status(201).json(admin.toJSON());
  } catch (error) {
    console.error('Create admin error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, detail: 'Email already exists' });
    }
    res.status(500).json({ success: false, detail: error.message || 'Server error' });
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

// @desc    Upload verification document
// @route   POST /api/agents/me/documents
// @access  Private (Agent only)
exports.uploadVerificationDocument = async (req, res) => {
  try {
    const { docType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        detail: 'No file uploaded'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user || user.role !== 'agent') {
      return res.status(403).json({
        success: false,
        detail: 'Only agents can upload verification documents'
      });
    }

    // Generate storage path
    const storagePath = generateStoragePath(`agents/${user.id}/verification`, req.file.originalname);

    // Upload to storage
    const result = await putObject(storagePath, req.file.buffer, req.file.mimetype);

    // Add to verificationDocuments
    user.verificationDocuments.push({
      docType: docType || 'Other',
      fileUrl: result.path,
      fileName: req.file.originalname,
      status: 'pending',
      uploadedAt: new Date()
    });

    await user.save();

    res.status(200).json(user.toJSON());
  } catch (error) {
    console.error('Upload verification document error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};

// @desc    Verify agent
// @route   PATCH /api/agents/:id/verify
// @access  Private (Admin only)
exports.verifyAgent = async (req, res) => {
  try {
    const { isVerified, remarks, documentId, documentStatus } = req.body;
    
    const agent = await User.findOne({ _id: req.params.id, role: 'agent' });
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        detail: 'Agent not found'
      });
    }

    if (isVerified !== undefined) {
      agent.isVerified = isVerified;
    }

    if (documentId && documentStatus) {
      const doc = agent.verificationDocuments.id(documentId);
      if (doc) {
        doc.status = documentStatus;
        if (remarks) doc.remarks = remarks;
      }
    }

    await agent.save();

    // Notify agent about verification/document status change
    if (isVerified !== undefined) {
      await createNotification({
        recipient: agent._id,
        title: isVerified ? 'Account Verified' : 'Account Unverified',
        message: isVerified 
          ? 'Congratulations! Your agency account has been verified.' 
          : 'Your account verification status has been updated.',
        type: isVerified ? 'success' : 'info',
        relatedId: agent._id,
        relatedModel: 'Agent'
      });
    } else if (documentId && documentStatus) {
       const doc = agent.verificationDocuments.id(documentId);
       await createNotification({
        recipient: agent._id,
        title: documentStatus === 'approved' ? 'Compliance Document Approved' : 'Compliance Document Rejected',
        message: `Your ${doc?.docType || 'document'} has been ${documentStatus}.`,
        type: documentStatus === 'approved' ? 'success' : 'warning',
        relatedId: agent._id,
        relatedModel: 'Agent'
      });
    }

    res.status(200).json(agent.toJSON());
  } catch (error) {
    console.error('Verify agent error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

