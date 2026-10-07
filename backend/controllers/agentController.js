const { Op } = require('sequelize');
const { User, Event } = require('../models');
const { sendEmail, templates } = require('../utils/email');
const { putObject, getObject, deleteObject, generateStoragePath } = require('../utils/storage');
const { v4: uuidv4 } = require('uuid');
const { createNotification } = require('./notificationController');

// @desc    Get all agents
// @route   GET /api/agents
// @access  Private
// Parse an admin-supplied commission rate. Returns { value } (null = clear) or { error }.
const parseCommissionRate = (raw) => {
  if (raw === null || raw === '') return { value: null };
  const rate = parseFloat(raw);
  if (isNaN(rate) || !isFinite(rate) || rate <= 0 || rate > 100) {
    return { error: 'Commission rate must be a percentage greater than 0 and at most 100' };
  }
  return { value: Math.round(rate * 100) / 100 };
};

exports.getAgents = async (req, res) => {
  try {
    const agents = await User.findAll({
      where: { role: 'agent' },
      order: [['createdAt', 'DESC']]
    });
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
// @access  Private (Admin or own agent profile)
exports.getAgent = async (req, res) => {
  try {
    // If authenticated user is an agent, they can only view their own profile
    if (req.user.role === 'agent' && req.params.id.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    const agent = await User.findOne({
      where: { id: req.params.id, role: 'agent' }
    });

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
    const { name, email, userId, password, phone, status, region, agencyName, businessRegistrationNumber, fullAddress, commissionRate } = req.body;

    let parsedCommissionRate = null;
    if (commissionRate !== undefined) {
      const parsed = parseCommissionRate(commissionRate);
      if (parsed.error) return res.status(400).json({ success: false, detail: parsed.error });
      parsedCommissionRate = parsed.value;
    }

    // Check if email or userId already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          ...(userId ? [{ userId }] : [])
        ]
      }
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
      role: 'agent',
      isVerified: false,
      verificationStatus: 'pending',
      region,
      agencyName,
      businessRegistrationNumber,
      fullAddress,
      commissionRate: parsedCommissionRate,
      verificationDocuments: []
    });

    // Send welcome email
    try {
      const emailTemplate = templates.welcomeAgent(name, userId);
      await sendEmail(email, emailTemplate.subject, emailTemplate.html);
    } catch (emailErr) {
      console.warn('Welcome email failed:', emailErr.message);
    }

    res.status(201).json(agent.toJSON());
  } catch (error) {
    console.error('Create agent error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
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

    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        detail: 'An account with this email already exists'
      });
    }

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: 'admin',
      status: 'active',
      isVerified: true,
      verificationStatus: 'approved'
    });

    res.status(201).json(admin.toJSON());
  } catch (error) {
    console.error('Create admin error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
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
    const { name, email, password, phone, status, region, agencyName, businessRegistrationNumber, fullAddress, commissionRate } = req.body;

    const agent = await User.findOne({
      where: { id: req.params.id, role: 'agent' }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        detail: 'Agent not found'
      });
    }

    // Check if email is being changed and already exists
    if (email && email.toLowerCase() !== agent.email) {
      const existingEmail = await User.findOne({
        where: { email: email.toLowerCase() }
      });
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
    if (region !== undefined) agent.region = region;
    if (agencyName !== undefined) agent.agencyName = agencyName;
    if (businessRegistrationNumber !== undefined) agent.businessRegistrationNumber = businessRegistrationNumber;
    if (fullAddress !== undefined) agent.fullAddress = fullAddress;
    if (commissionRate !== undefined) {
      const parsed = parseCommissionRate(commissionRate);
      if (parsed.error) return res.status(400).json({ success: false, detail: parsed.error });
      agent.commissionRate = parsed.value;
    }

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
    const agent = await User.findOne({
      where: { id: req.params.id, role: 'agent' }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        detail: 'Agent not found'
      });
    }

    // Remove agent from all events
    const events = await Event.findAll();
    for (const event of events) {
      if (Array.isArray(event.assignedAgents) && event.assignedAgents.some(a => a?.toString() === agent.id.toString())) {
        event.assignedAgents = event.assignedAgents.filter(a => a?.toString() !== agent.id.toString());
        await event.save();
      }
    }

    // Delete agent
    await agent.destroy();

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

    const user = await User.findByPk(req.user.id);
    
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
    const docId = uuidv4();
    const docs = Array.isArray(user.verificationDocuments) ? [...user.verificationDocuments] : [];
    docs.push({
      id: docId,
      _id: docId,
      docType: docType || 'Other',
      fileUrl: result.path,
      fileName: req.file.originalname,
      status: 'pending',
      uploadedAt: new Date()
    });

    user.verificationDocuments = docs;
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
    const { isVerified, verificationStatus, remarks, documentId, documentStatus } = req.body;
    
    const agent = await User.findOne({
      where: { id: req.params.id, role: 'agent' }
    });
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        detail: 'Agent not found'
      });
    }

    if (isVerified !== undefined) {
      agent.isVerified = isVerified;
    }
    
    if (verificationStatus !== undefined) {
      agent.verificationStatus = verificationStatus;
    }

    let updatedDocType = 'document';
    if (documentId && documentStatus) {
      const docs = Array.isArray(agent.verificationDocuments) ? [...agent.verificationDocuments] : [];
      const doc = docs.find(d => d.id === documentId || d._id === documentId);
      if (doc) {
        doc.status = documentStatus;
        if (remarks) doc.remarks = remarks;
        updatedDocType = doc.docType || 'document';
        agent.verificationDocuments = docs;
      }
    } else if (remarks !== undefined) {
      agent.verificationRemarks = remarks;
    }

    await agent.save();

    // Notify agent about verification/document status change
    if (isVerified !== undefined) {
      await createNotification({
        recipient: agent.id,
        title: isVerified ? 'Account Verified' : 'Account Unverified',
        message: isVerified 
          ? 'Congratulations! Your agency account has been verified.' 
          : 'Your account verification status has been updated.',
        type: isVerified ? 'success' : 'info',
        relatedId: agent.id,
        relatedModel: 'Agent'
      });
    } else if (documentId && documentStatus) {
      await createNotification({
        recipient: agent.id,
        title: documentStatus === 'approved' ? 'Compliance Document Approved' : 'Compliance Document Rejected',
        message: `Your ${updatedDocType} has been ${documentStatus}.`,
        type: documentStatus === 'approved' ? 'success' : 'warning',
        relatedId: agent.id,
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

// @desc    Download verification document
// @route   GET /api/agents/:id/documents/:docId
// @access  Private (Admin or Agent themselves)
exports.downloadVerificationDocument = async (req, res) => {
  try {
    const agent = await User.findOne({
      where: { id: req.params.id, role: 'agent' }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        detail: 'Agent not found'
      });
    }

    // Check access (Admins can download all, agents only their own)
    if (req.user.role === 'agent' && agent.id.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        detail: 'Access denied'
      });
    }

    // Find document
    const docs = Array.isArray(agent.verificationDocuments) ? agent.verificationDocuments : [];
    const doc = docs.find(d => d.id === req.params.docId || d._id === req.params.docId);

    if (!doc) {
      return res.status(404).json({
        success: false,
        detail: 'Document not found'
      });
    }

    // Download from storage
    const { data, contentType } = await getObject(doc.fileUrl);

    res.setHeader('Content-Type', contentType);
    const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${doc.fileName}"`);
    res.send(Buffer.from(data));
  } catch (error) {
    console.error('Download agent document error:', error);
    res.status(500).json({
      success: false,
      detail: 'Server error'
    });
  }
};

// @desc    Delete verification document
// @route   DELETE /api/agents/me/documents/:docId
// @access  Private (Agent only)
exports.deleteVerificationDocument = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user || user.role !== 'agent') {
      return res.status(403).json({
        success: false,
        detail: 'Only agents can delete their own verification documents'
      });
    }

    // Find document
    const docs = Array.isArray(user.verificationDocuments) ? [...user.verificationDocuments] : [];
    const doc = docs.find(d => d.id === req.params.docId || d._id === req.params.docId);

    if (!doc) {
      return res.status(404).json({
        success: false,
        detail: 'Document not found'
      });
    }

    // Delete from storage
    await deleteObject(doc.fileUrl);

    // Remove from verificationDocuments
    user.verificationDocuments = docs.filter(d => d.id !== req.params.docId && d._id !== req.params.docId);
    await user.save();

    res.status(200).json(user.toJSON());
  } catch (error) {
    console.error('Delete verification document error:', error);
    res.status(500).json({
      success: false,
      detail: error.message || 'Server error'
    });
  }
};
