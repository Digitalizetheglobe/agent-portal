const { randomUUID: uuidv4 } = require('crypto');
const { User } = require('../models');
const { putObject, getObject, generateStoragePath } = require('../utils/storage');
const { createNotification } = require('./notificationController');

// After an agent is approved, QStudy completes the agreement and activates the account:
//
//   approved ─issue contract─▶ contract issued ─upload signed copy─▶ contract signed ─issue E-Certificate─▶ activated
//
// An activated agent can submit students. Contract renewals upload a new contract the same way;
// the agent stays activated while a renewal is out for signature.

const fail = (res, status, detail) => res.status(status).json({ success: false, detail });

const addHistory = (agent, entry) => {
  const history = Array.isArray(agent.onboardingHistory) ? [...agent.onboardingHistory] : [];
  history.push({ ...entry, at: new Date() });
  agent.onboardingHistory = history;
};

// Loads the agent a staff member is acting on (routes allow the Head of Admission and super admin;
// the Account Manager check is kept as a safeguard).
const loadAgent = async (req, res) => {
  const agent = await User.findOne({ where: { id: req.params.id, role: 'agent' } });
  if (!agent) {
    fail(res, 404, 'Agent not found');
    return null;
  }
  if (req.user.staffRole === 'account_manager' && agent.accountManagerId !== req.user.id) {
    fail(res, 403, 'You can only manage agents assigned to you');
    return null;
  }
  if (agent.onboardingStatus !== 'approved') {
    fail(res, 400, 'The agent application must be approved before the contract and E-Certificate');
    return null;
  }
  return agent;
};

const storeFile = async (agent, folder, file) => {
  const path = generateStoragePath(`agents/${agent.id}/${folder}`, file.originalname);
  const result = await putObject(path, file.buffer, file.mimetype);
  const id = uuidv4();
  return { id, fileUrl: result.path, fileName: file.originalname, uploadedAt: new Date() };
};

const parseExpiry = (raw) => {
  if (raw === undefined || raw === null || raw === '') return { value: null };
  const date = new Date(raw);
  if (isNaN(date.getTime())) return { error: 'Contract expiry date is not valid' };
  if (date <= new Date()) return { error: 'Contract expiry date must be in the future' };
  return { value: date };
};

const notify = (agent, title, message, type = 'success') =>
  createNotification({
    recipient: agent.id,
    title,
    message,
    type,
    relatedId: agent.id,
    relatedModel: 'Agent'
  });

// @desc    Issue the agent contract (or a renewal) by uploading the contract file
// @route   POST /api/agents/:id/contract/issue
// @access  Private (Account Manager of the agent, Head of Recruitment, Head of Admission, super admin)
exports.issueContract = async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, 'Please upload the contract file');
    const expiry = parseExpiry(req.body.expiresAt);
    if (expiry.error) return fail(res, 400, expiry.error);

    const agent = await loadAgent(req, res);
    if (!agent) return;

    const doc = await storeFile(agent, 'contract', req.file);
    const renewal = agent.isActivated;

    agent.contractDocuments = [
      ...(Array.isArray(agent.contractDocuments) ? agent.contractDocuments : []),
      { ...doc, kind: 'issued', uploadedBy: req.user.id, uploadedByName: req.user.name }
    ];
    agent.contractStatus = 'issued';
    agent.contractIssuedAt = new Date();
    agent.contractSignedAt = null;
    agent.contractExpiresAt = expiry.value;
    addHistory(agent, {
      action: renewal ? 'contract-renewal-issued' : 'contract-issued',
      by: req.user.id,
      byName: req.user.name
    });
    await agent.save();

    await notify(
      agent,
      renewal ? 'Contract renewal ready' : 'Your agent contract is ready',
      'Please download your agent contract from your profile, sign it and return it to QStudy.',
      'info'
    );

    res.status(200).json(agent.toJSON());
  } catch (error) {
    console.error('Issue contract error:', error);
    fail(res, 500, 'Server error');
  }
};

// @desc    Upload the signed contract the agent returned
// @route   POST /api/agents/:id/contract/signed
// @access  Private (same staff as issue)
exports.uploadSignedContract = async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, 'Please upload the signed contract');

    const agent = await loadAgent(req, res);
    if (!agent) return;
    if (agent.contractStatus !== 'issued') {
      return fail(res, 400, 'Issue the contract before uploading the signed copy');
    }

    const doc = await storeFile(agent, 'contract', req.file);
    agent.contractDocuments = [
      ...(Array.isArray(agent.contractDocuments) ? agent.contractDocuments : []),
      { ...doc, kind: 'signed', uploadedBy: req.user.id, uploadedByName: req.user.name }
    ];
    agent.contractStatus = 'signed';
    agent.contractSignedAt = new Date();
    addHistory(agent, { action: 'contract-signed', by: req.user.id, byName: req.user.name });
    await agent.save();

    res.status(200).json(agent.toJSON());
  } catch (error) {
    console.error('Upload signed contract error:', error);
    fail(res, 500, 'Server error');
  }
};

// @desc    The agent uploads their own signed copy of the contract
// @route   POST /api/agents/me/contract/signed
// @access  Private (Agent). Staff are notified and can still replace the file or issue the E-Certificate.
exports.uploadOwnSignedContract = async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, 'Please upload your signed contract');

    const agent = await User.findByPk(req.user.id);
    if (!agent || agent.role !== 'agent') return fail(res, 403, 'Only agents can upload their signed contract');
    if (agent.onboardingStatus !== 'approved' || agent.contractStatus !== 'issued') {
      return fail(res, 400, 'There is no contract waiting for your signature');
    }

    const doc = await storeFile(agent, 'contract', req.file);
    agent.contractDocuments = [
      ...(Array.isArray(agent.contractDocuments) ? agent.contractDocuments : []),
      { ...doc, kind: 'signed', uploadedBy: agent.id, uploadedByName: agent.name }
    ];
    agent.contractStatus = 'signed';
    agent.contractSignedAt = new Date();
    addHistory(agent, { action: 'contract-signed', by: agent.id, byName: agent.name, remarks: 'Uploaded by the agent' });
    await agent.save();

    // Tell the people who issue the E-Certificate that the signed contract is in
    const staff = await User.findAll({
      where: { role: 'admin', status: 'active', staffRole: 'head_admission' },
      attributes: ['id']
    });
    await Promise.all(staff.map(({ id: recipient }) => createNotification({
      recipient,
      title: 'Signed contract received',
      message: `${agent.name} uploaded their signed contract. Review it and issue the E-Certificate.`,
      type: 'info',
      relatedId: agent.id,
      relatedModel: 'Agent'
    })));

    res.status(200).json(agent.toJSON());
  } catch (error) {
    console.error('Upload own signed contract error:', error);
    fail(res, 500, 'Server error');
  }
};

const nextCertificateNumber = () =>
  `QS-AGT-${new Date().getFullYear()}-${uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase()}`;

// @desc    Issue the E-Certificate and activate the agent (needs a signed contract)
// @route   POST /api/agents/:id/certificate
// @access  Private (Head of Admission, super admin). Multipart `file` is the certificate itself.
exports.issueCertificate = async (req, res) => {
  try {
    const agent = await loadAgent(req, res);
    if (!agent) return;
    if (agent.contractStatus !== 'signed') {
      return fail(res, 400, 'The signed contract must be uploaded before issuing the E-Certificate');
    }

    // The Head of Admission uploads the E-Certificate itself; re-issuing may keep the existing file
    if (!req.file && !agent.eCertificateFile) return fail(res, 400, 'Please upload the E-Certificate file');
    if (req.file) agent.eCertificateFile = await storeFile(agent, 'certificate', req.file);
    const firstTime = !agent.isActivated;
    if (!agent.eCertificateNumber) agent.eCertificateNumber = nextCertificateNumber();
    agent.eCertificateIssuedAt = new Date();
    agent.eCertificateIssuedBy = req.user.id;
    agent.isActivated = true;
    agent.activatedAt = agent.activatedAt || new Date();
    addHistory(agent, {
      action: firstTime ? 'certificate-issued' : 'certificate-reissued',
      by: req.user.id,
      byName: req.user.name,
      remarks: agent.eCertificateNumber
    });
    await agent.save();

    if (firstTime) {
      await notify(
        agent,
        'Your account is active',
        `Your contract and E-Certificate (${agent.eCertificateNumber}) are ready. You can now submit students.`
      );
    }

    res.status(200).json(agent.toJSON());
  } catch (error) {
    console.error('Issue certificate error:', error);
    fail(res, 500, 'Server error');
  }
};

// @desc    Download a contract file or the E-Certificate file
// @route   GET /api/agents/:id/contract/:docId   (docId 'certificate' returns the certificate file)
// @access  Private (staff, or the agent themselves)
exports.downloadContractFile = async (req, res) => {
  try {
    const agent = await User.findOne({ where: { id: req.params.id, role: 'agent' } });
    if (!agent) return fail(res, 404, 'Agent not found');

    const isOwner = req.user.role === 'agent' && agent.id.toString() === req.user.id.toString();
    const isStaff = req.user.role === 'admin';
    if (!isOwner && !isStaff) return fail(res, 403, 'Access denied');
    if (req.user.staffRole === 'account_manager' && agent.accountManagerId !== req.user.id) {
      return fail(res, 403, 'Access denied');
    }

    const docs = Array.isArray(agent.contractDocuments) ? agent.contractDocuments : [];
    const file = req.params.docId === 'certificate'
      ? agent.eCertificateFile
      : docs.find(d => d.id === req.params.docId);
    if (!file) return fail(res, 404, 'File not found');

    const { data, contentType } = await getObject(file.fileUrl);
    res.setHeader('Content-Type', contentType);
    const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${file.fileName}"`);
    res.send(Buffer.from(data));
  } catch (error) {
    console.error('Download contract file error:', error);
    fail(res, 500, 'Server error');
  }
};
