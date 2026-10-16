const { Op } = require('sequelize');
const { User } = require('../models');
const { sendEmail, templates } = require('../utils/email');
const { putObject, getObject, deleteObject, generateStoragePath } = require('../utils/storage');
const { randomUUID: uuidv4 } = require('crypto');
const { createNotification } = require('./notificationController');
const { STAFF_ROLES } = require('../middleware/auth');
const { passwordProblem } = require('../utils/security');
const { pickApplicationFields, validateApplication, BANK_KEYS, canSeeBankDetails, IN_REVIEW_STATUSES } = require('../utils/agentApplication');

// Serialize an agent for a viewer; bank details are hidden from staff with no payout role.
const serializeAgent = (agent, viewer) => {
  const json = agent.toJSON();
  if (!canSeeBankDetails(viewer)) BANK_KEYS.forEach(k => delete json[k]);
  return json;
};

// @desc    Get all agents
// @route   GET /api/agents
// @access  Private
const accountManagerInclude = {
  model: User,
  as: 'accountManager',
  attributes: ['id', 'name', 'email', 'phone'],
  required: false
};

// Account Managers only work with the agents assigned to them.
const isAccountManager = (user) => user.role === 'admin' && user.staffRole === 'account_manager';

// Validate an Account Manager assignment. Returns { value } (null = unassign) or { error }.
const resolveAccountManager = async (raw) => {
  if (raw === null || raw === '') return { value: null };
  const manager = await User.findOne({
    where: { id: raw, role: 'admin', staffRole: 'account_manager' },
    attributes: ['id']
  });
  if (!manager) return { error: 'Selected Account Manager does not exist' };
  return { value: manager.id };
};

const reloadWithManager = (id) => User.findByPk(id, { include: [accountManagerInclude] });

// @desc    List Account Managers (for assignment dropdowns)
// @route   GET /api/agents/account-managers
// @access  Private (Admin)
exports.getAccountManagers = async (req, res) => {
  try {
    const managers = await User.findAll({
      where: { role: 'admin', staffRole: 'account_manager', status: 'active' },
      attributes: ['id', 'name', 'email'],
      order: [['name', 'ASC']]
    });
    res.status(200).json(managers.map(m => m.toJSON()));
  } catch (error) {
    console.error('Get account managers error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};

exports.getAgents = async (req, res) => {
  try {
    const where = { role: 'agent' };
    if (isAccountManager(req.user)) where.accountManagerId = req.user.id;
    const agents = await User.findAll({
      where,
      include: [accountManagerInclude],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(agents.map(agent => serializeAgent(agent, req.user)));
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

    const where = { id: req.params.id, role: 'agent' };
    if (isAccountManager(req.user)) where.accountManagerId = req.user.id;

    const agent = await User.findOne({ where, include: [accountManagerInclude] });

    if (!agent) {
      return res.status(404).json({
        success: false,
        detail: 'Agent not found'
      });
    }

    res.status(200).json(serializeAgent(agent, req.user));
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
    const { name, email, userId, password, phone, status, region, agencyName, businessRegistrationNumber, fullAddress, accountManagerId } = req.body;

    if (typeof email !== 'string' || !email.trim() || !name) {
      return res.status(400).json({ success: false, detail: 'Name and email are required' });
    }
    const weakPassword = passwordProblem(password);
    if (weakPassword) return res.status(400).json({ success: false, detail: weakPassword });

    // Account Managers own the agents they create; they cannot assign to others.
    let assignedManagerId = null;
    if (isAccountManager(req.user)) {
      assignedManagerId = req.user.id;
    } else if (accountManagerId) {
      const resolved = await resolveAccountManager(accountManagerId);
      if (resolved.error) return res.status(400).json({ success: false, detail: resolved.error });
      assignedManagerId = resolved.value;
    }

    // Staff-created agents may carry the full application; mandatory checks apply on self-registration.
    const { agencyName: _a, businessRegistrationNumber: _b, fullAddress: _f, region: _r, ...extraApplication } = pickApplicationFields(req.body);
    const createErrors = validateApplication(extraApplication, { mode: 'update' });
    if (createErrors.length) return res.status(400).json({ success: false, detail: createErrors.join('. ') });

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
      ...extraApplication,
      accountManagerId: assignedManagerId,
      verificationDocuments: []
    });

    // Send welcome email
    try {
      const emailTemplate = templates.welcomeAgent(name, userId);
      await sendEmail(email, emailTemplate.subject, emailTemplate.html);
    } catch (emailErr) {
      console.warn('Welcome email failed:', emailErr.message);
    }

    res.status(201).json(serializeAgent(await reloadWithManager(agent.id), req.user));
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
    const { name, email, password, phone, staffRole } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        detail: 'Name, email, and password are required'
      });
    }

    const weakAdminPassword = passwordProblem(password);
    if (weakAdminPassword) {
      return res.status(400).json({ success: false, detail: weakAdminPassword });
    }

    if (staffRole && !STAFF_ROLES.includes(staffRole)) {
      return res.status(400).json({
        success: false,
        detail: `Invalid staff role. Allowed: ${STAFF_ROLES.join(', ')}`
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
      staffRole: staffRole || null,
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
    const { name, email, password, phone, status, region, agencyName, businessRegistrationNumber, fullAddress, accountManagerId } = req.body;

    const where = { id: req.params.id, role: 'agent' };
    if (isAccountManager(req.user)) where.accountManagerId = req.user.id;
    const agent = await User.findOne({ where });

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
    if (password) {
      const weak = passwordProblem(password);
      if (weak) return res.status(400).json({ success: false, detail: weak });
      agent.password = password;
    }
    if (region !== undefined) agent.region = region;
    if (agencyName !== undefined) agent.agencyName = agencyName;
    if (businessRegistrationNumber !== undefined) agent.businessRegistrationNumber = businessRegistrationNumber;
    if (fullAddress !== undefined) agent.fullAddress = fullAddress;
    // Remaining application-form fields (agentType, bank details, signatory, ...)
    const { agencyName: _a, businessRegistrationNumber: _b, fullAddress: _f, region: _r, ...appPatch } = pickApplicationFields(req.body);
    const appErrors = validateApplication(appPatch, { mode: 'update', existing: agent.toJSON() });
    if (appErrors.length) return res.status(400).json({ success: false, detail: appErrors.join('. ') });
    Object.assign(agent, appPatch);

    // Agent ownership is not editable by Account Managers (commission is set per university, not per agent)
    if (accountManagerId !== undefined && !isAccountManager(req.user)) {
      const resolved = await resolveAccountManager(accountManagerId);
      if (resolved.error) return res.status(400).json({ success: false, detail: resolved.error });
      agent.accountManagerId = resolved.value;
    }

    await agent.save();

    res.status(200).json(serializeAgent(await reloadWithManager(agent.id), req.user));
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

    if (IN_REVIEW_STATUSES.includes(user.onboardingStatus)) {
      return res.status(403).json({
        success: false,
        detail: 'Your application is under review. Documents cannot be changed until it is returned to you.'
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

    // Account approval/rejection now goes through the onboarding review endpoints
    if (isVerified !== undefined || verificationStatus !== undefined) {
      return res.status(400).json({
        success: false,
        detail: 'Use the onboarding review actions to approve, reject or return an application'
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

    if (isVerified !== undefined) {
      agent.isVerified = isVerified;
    }
    
    if (verificationStatus !== undefined) {
      agent.verificationStatus = verificationStatus;
    }

    let updatedDocType = 'document';
    if (documentId && documentStatus) {
      // Clone each document: editing the stored objects in place makes Sequelize see no change
      // to the JSONB column, so the update would not be saved.
      const docs = Array.isArray(agent.verificationDocuments)
        ? agent.verificationDocuments.map(d => ({ ...d }))
        : [];
      const doc = docs.find(d => d.id === documentId || d._id === documentId);
      if (!doc) {
        return res.status(404).json({ success: false, detail: 'Document not found' });
      }
      doc.status = documentStatus;
      if (remarks) doc.remarks = remarks;
      updatedDocType = doc.docType || 'document';
      agent.verificationDocuments = docs;
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

    if (IN_REVIEW_STATUSES.includes(user.onboardingStatus)) {
      return res.status(403).json({
        success: false,
        detail: 'Your application is under review. Documents cannot be changed until it is returned to you.'
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
