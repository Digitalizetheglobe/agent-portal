const crypto = require('crypto');
const { sequelize } = require('../config/db');
const { User, AgentInvite } = require('../models');
const { sendEmail, templates } = require('../utils/email');
const { pickApplicationFields, validateApplication } = require('../utils/agentApplication');
const { generateAccessToken, generateRefreshToken, setTokenCookies } = require('../middleware/auth');
const { passwordProblem } = require('../utils/security');

const DEFAULT_EXPIRY_DAYS = 7;
const MAX_EXPIRY_DAYS = 30;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const isAccountManager = (user) => user.role === 'admin' && user.staffRole === 'account_manager';
const buildLink = (token) => `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register/${token}`;

// Invites an Account Manager can see/manage: their own.
const inviteScope = (user) => (isAccountManager(user) ? { accountManagerId: user.id } : {});

// @desc    Create an onboarding invite and (optionally) email it
// @route   POST /api/onboarding/invites
// @access  Private (Super admin, Account Manager, Head of Recruitment)
exports.createInvite = async (req, res) => {
  try {
    const { email, name, accountManagerId, expiresInDays } = req.body;

    const days = expiresInDays === undefined ? DEFAULT_EXPIRY_DAYS : Number(expiresInDays);
    if (!Number.isInteger(days) || days < 1 || days > MAX_EXPIRY_DAYS) {
      return res.status(400).json({ success: false, detail: `Expiry must be 1-${MAX_EXPIRY_DAYS} days` });
    }

    const normalizedEmail = email ? String(email).toLowerCase().trim() : null;
    if (normalizedEmail) {
      if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
        return res.status(400).json({ success: false, detail: 'Invalid email address' });
      }
      if (await User.findOne({ where: { email: normalizedEmail } })) {
        return res.status(400).json({ success: false, detail: 'An account with this email already exists' });
      }
    }

    // Account Managers own the agents they invite; other staff may choose the owner.
    let owner = null;
    if (isAccountManager(req.user)) {
      owner = req.user;
    } else if (accountManagerId) {
      owner = await User.findOne({
        where: { id: accountManagerId, role: 'admin', staffRole: 'account_manager' }
      });
      if (!owner) return res.status(400).json({ success: false, detail: 'Selected Account Manager does not exist' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const invite = await AgentInvite.create({
      tokenHash: hashToken(token),
      email: normalizedEmail,
      name: name ? String(name).trim() : null,
      accountManagerId: owner ? owner.id : null,
      createdBy: req.user.id,
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    });

    const link = buildLink(token);
    let emailSent = false;
    if (normalizedEmail) {
      try {
        const tpl = templates.agentInvite(invite.name, link, owner && owner.name, invite.expiresAt);
        await sendEmail(normalizedEmail, tpl.subject, tpl.html);
        emailSent = true;
      } catch (emailErr) {
        console.warn('Invite email failed:', emailErr.message);
      }
    }

    // The raw token/link is only ever returned here; it cannot be recovered later.
    res.status(201).json({ ...invite.toJSON(), link, emailSent });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};

// @desc    List onboarding invites
// @route   GET /api/onboarding/invites
// @access  Private (Super admin, Account Manager, Head of Recruitment)
exports.getInvites = async (req, res) => {
  try {
    const invites = await AgentInvite.findAll({
      where: inviteScope(req.user),
      include: [{ model: User, as: 'accountManager', attributes: ['id', 'name'], required: false }],
      order: [['createdAt', 'DESC']],
      limit: 200
    });
    res.status(200).json(invites.map(i => i.toJSON()));
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};

// @desc    Revoke an unused invite
// @route   PATCH /api/onboarding/invites/:id/revoke
// @access  Private (Super admin, Account Manager, Head of Recruitment)
exports.revokeInvite = async (req, res) => {
  try {
    const invite = await AgentInvite.findOne({ where: { id: req.params.id, ...inviteScope(req.user) } });
    if (!invite) return res.status(404).json({ success: false, detail: 'Invite not found' });
    if (invite.usedAt) return res.status(400).json({ success: false, detail: 'Invite has already been used' });

    invite.revokedAt = invite.revokedAt || new Date();
    await invite.save();
    res.status(200).json(invite.toJSON());
  } catch (error) {
    console.error('Revoke invite error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};

const findUsableInvite = async (token, options = {}) => {
  if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
  const invite = await AgentInvite.findOne({ where: { tokenHash: hashToken(token) }, ...options });
  return invite && invite.getState() === 'pending' ? invite : null;
};

// @desc    Validate an invite link and return prefill data
// @route   GET /api/onboarding/:token
// @access  Public
exports.getInviteByToken = async (req, res) => {
  try {
    const invite = await findUsableInvite(req.params.token, {
      include: [{ model: User, as: 'accountManager', attributes: ['name'], required: false }]
    });
    if (!invite) {
      return res.status(404).json({ success: false, detail: 'This registration link is invalid, expired or already used.' });
    }
    res.status(200).json({
      email: invite.email,
      name: invite.name,
      accountManagerName: invite.accountManager ? invite.accountManager.name : null,
      expiresAt: invite.expiresAt
    });
  } catch (error) {
    console.error('Get invite error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};

const fail = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// @desc    Register an agent through an invite link and sign them in
// @route   POST /api/onboarding/:token/register
// @access  Public (valid invite token)
exports.registerWithInvite = async (req, res) => {
  const { name, email, phone, password, declarationName, declarationIdNumber, declarationAccepted } = req.body;
  const application = pickApplicationFields(req.body);

  try {
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, detail: 'Name is required' });
    if (!phone || !/^\+?[0-9]{10,}$/.test(String(phone).replace(/[\s-]/g, ''))) {
      return res.status(400).json({ success: false, detail: 'A valid phone number is required' });
    }
    const weakPassword = passwordProblem(password);
    if (weakPassword) {
      return res.status(400).json({ success: false, detail: weakPassword });
    }

    // Login first: the agent can create just the login (name, email, phone, password) and fill in the
    // application afterwards, signed in. A full application sent with the registration is still checked.
    const withApplication = Boolean(application.agentType);
    const errors = withApplication ? validateApplication(application, { mode: 'register' }) : [];
    if (withApplication) {
      if (!declarationAccepted || declarationAccepted === 'false') {
        errors.push('You must accept the declaration');
      }
      if (!declarationName || !String(declarationName).trim()) errors.push('Declaration signature name is required');
      if (!declarationIdNumber || !String(declarationIdNumber).trim()) errors.push('Declaration ID number is required');
    }
    if (errors.length) {
      return res.status(400).json({ success: false, detail: errors.join('. ') });
    }

    const user = await sequelize.transaction(async (t) => {
      // Row lock so two simultaneous submissions cannot both use the same link
      const invite = await findUsableInvite(req.params.token, { transaction: t, lock: t.LOCK.UPDATE });
      if (!invite) throw fail(404, 'This registration link is invalid, expired or already used.');

      // An invite issued for a specific email can only register that email
      const finalEmail = String(invite.email || email || '').toLowerCase().trim();
      if (!/\S+@\S+\.\S+/.test(finalEmail)) throw fail(400, 'A valid email address is required');
      if (await User.findOne({ where: { email: finalEmail }, transaction: t })) {
        throw fail(400, 'An account with this email already exists');
      }

      const agent = await User.create({
        name: String(name).trim(),
        email: finalEmail,
        password,
        phone: String(phone).trim(),
        role: 'agent',
        status: 'active',
        isVerified: false,
        verificationStatus: 'pending',
        ...application,
        ...(withApplication ? {
          declarationName: String(declarationName).trim(),
          declarationIdNumber: String(declarationIdNumber).trim(),
          declarationAcceptedAt: new Date()
        } : {}),
        accountManagerId: invite.accountManagerId,
        verificationDocuments: [],
        onboardingHistory: [{ action: 'registered', byName: String(name).trim(), at: new Date() }]
      }, { transaction: t });

      invite.usedAt = new Date();
      invite.usedByUserId = agent.id;
      await invite.save({ transaction: t });

      return agent;
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({ ...user.toJSON(), accessToken, refreshToken });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, detail: error.message });
    }
    console.error('Register with invite error:', error);
    res.status(500).json({ success: false, detail: 'Server error' });
  }
};
