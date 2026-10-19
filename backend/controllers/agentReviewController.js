const { User } = require('../models');
const { createNotification } = require('./notificationController');
const {
  pickApplicationFields,
  validateApplication,
  missingRequiredDocs
} = require('../utils/agentApplication');

// Agent onboarding review: the agent submits, then three staff roles sign off in order.
//
//   draft ─submit─▶ submitted ─start-review─▶ under_review ─recommend─▶ recommended ─verify─▶ verified ─approve─▶ approved
//     ▲              (Account Manager or          (Account Manager)      (Head of Recruitment)     (Head of Admission)
//     │               Head of Recruitment)
//     └─ resubmit ── correction_required ◀── request-correction (any reviewer, until approved)
//                    rejected ◀── reject (Head of Recruitment or Head of Admission, until approved)
//
// Super admins (no staffRole) may perform any action.

const REVIEWABLE = ['submitted', 'under_review', 'recommended', 'verified'];

const isSuperAdmin = (user) => user.role === 'admin' && !user.staffRole;

const addHistory = (agent, entry) => {
  const history = Array.isArray(agent.onboardingHistory) ? [...agent.onboardingHistory] : [];
  history.push({ ...entry, at: new Date() });
  agent.onboardingHistory = history;
};

const fail = (res, status, detail) => res.status(status).json({ success: false, detail });

// Staff who should hear about a newly submitted application
const getSubmissionRecipients = async (agent) => {
  const recruiters = await User.findAll({
    where: { role: 'admin', staffRole: 'head_recruitment', status: 'active' },
    attributes: ['id']
  });
  const ids = new Set(recruiters.map(r => r.id));
  if (agent.accountManagerId) ids.add(agent.accountManagerId);
  return [...ids];
};

// @desc    Agent signs the application declaration (agents created without an invite link
//          have not signed one). It can be signed once and is not editable afterwards.
// @route   POST /api/agents/me/declaration
// @access  Private (Agent)
exports.acceptDeclaration = async (req, res) => {
  try {
    const agent = await User.findByPk(req.user.id);
    if (!agent || agent.role !== 'agent') return fail(res, 403, 'Only agents can sign the declaration');
    if (agent.declarationAcceptedAt) return fail(res, 400, 'The declaration has already been signed');
    if (!['draft', 'correction_required'].includes(agent.onboardingStatus)) {
      return fail(res, 400, 'The declaration can only be signed before the application is submitted');
    }

    const { declarationName, declarationIdNumber, declarationAccepted } = req.body;
    const name = typeof declarationName === 'string' ? declarationName.trim() : '';
    const idNumber = typeof declarationIdNumber === 'string' ? declarationIdNumber.trim() : '';
    const errors = [];
    if (declarationAccepted !== true && declarationAccepted !== 'true') errors.push('You must accept the declaration');
    if (!name) errors.push('Declaration signature name is required');
    if (!idNumber) errors.push('Declaration ID number is required');
    if (name.length > 255 || idNumber.length > 255) errors.push('Declaration fields must be at most 255 characters');
    if (errors.length) return fail(res, 400, errors.join('. '));

    agent.declarationName = name;
    agent.declarationIdNumber = idNumber;
    agent.declarationAcceptedAt = new Date();
    addHistory(agent, { action: 'declaration-signed', by: agent.id, byName: agent.name });
    await agent.save();

    res.status(200).json(agent.toJSON());
  } catch (error) {
    console.error('Accept declaration error:', error);
    fail(res, 500, 'Server error');
  }
};

// @desc    Agent submits (or resubmits) their application for review
// @route   POST /api/agents/me/onboarding/submit
// @access  Private (Agent)
exports.submitOnboarding = async (req, res) => {
  try {
    const agent = await User.findByPk(req.user.id);
    if (!agent || agent.role !== 'agent') return fail(res, 403, 'Only agents can submit an application');

    if (!['draft', 'correction_required'].includes(agent.onboardingStatus)) {
      return fail(res, 400, `Your application is already ${agent.onboardingStatus.replace('_', ' ')}`);
    }

    const problems = validateApplication(pickApplicationFields(agent.toJSON()), { mode: 'register' });
    if (!agent.declarationAcceptedAt) problems.push('The declaration has not been accepted');
    const missingDocs = missingRequiredDocs(agent.agentType, agent.verificationDocuments);
    if (missingDocs.length) problems.push(`Missing documents: ${missingDocs.join(', ')}`);
    if (problems.length) {
      return fail(res, 400, `Your application is incomplete. ${problems.join('. ')}`);
    }

    const from = agent.onboardingStatus;
    agent.onboardingStatus = 'submitted';
    agent.onboardingSubmittedAt = new Date();
    agent.verificationStatus = 'pending';
    addHistory(agent, {
      action: from === 'draft' ? 'submitted' : 'resubmitted',
      from,
      to: 'submitted',
      by: agent.id,
      byName: agent.name
    });
    await agent.save();

    const recipients = await getSubmissionRecipients(agent);
    await Promise.all(recipients.map(recipient => createNotification({
      recipient,
      title: 'Agent application submitted',
      message: `${agent.name} has ${from === 'draft' ? 'submitted' : 'resubmitted'} an application for review.` +
        (agent.accountManagerId ? '' : ' No Account Manager is assigned to this agent yet: assign one before the review can start.'),
      type: 'info',
      relatedId: agent.id,
      relatedModel: 'Agent'
    })));

    res.status(200).json(agent.toJSON());
  } catch (error) {
    console.error('Submit onboarding error:', error);
    fail(res, 500, 'Server error');
  }
};

// Only the agent's Account Manager can recommend, so the review must not start without one:
// the application would sit under review with nobody able to move it on.
const accountManagerCheck = async (agent) => {
  if (!agent.accountManagerId) {
    return 'This agent has no Account Manager. Assign one (Edit agent, Account Manager) before starting the review.';
  }
  const manager = await User.findOne({
    where: { id: agent.accountManagerId, role: 'admin', staffRole: 'account_manager', status: 'active' },
    attributes: ['id']
  });
  return manager ? null : "This agent's Account Manager is inactive or no longer exists. Assign another before starting the review.";
};

const documentsApprovedCheck = (agent) => {
  const missing = missingRequiredDocs(agent.agentType, agent.verificationDocuments, { approvedOnly: true });
  return missing.length ? `These required documents are not approved yet: ${missing.join(', ')}` : null;
};

// roles: staff roles allowed to perform the action (super admin always may).
// accountManagerOwned: an Account Manager may only act on agents assigned to them.
// nextRole: staff role notified that the application is waiting for them.
const ACTIONS = {
  'start-review': {
    roles: ['account_manager', 'head_recruitment'],
    from: ['submitted'],
    to: 'under_review',
    check: accountManagerCheck
  },
  recommend: {
    roles: ['account_manager'],
    from: ['under_review'],
    to: 'recommended',
    nextRole: 'head_recruitment',
    apply: (agent, { reviewer }) => {
      agent.onboardingRecommendedBy = reviewer.id;
      agent.onboardingRecommendedAt = new Date();
    }
  },
  verify: {
    roles: ['head_recruitment'],
    from: ['recommended'],
    to: 'verified',
    nextRole: 'head_admission',
    check: documentsApprovedCheck,
    apply: (agent, { reviewer }) => {
      agent.onboardingReviewedBy = reviewer.id;
      agent.onboardingReviewedAt = new Date();
    },
    notify: () => ({
      title: 'Application verified',
      message: 'Your application has been verified. It now goes to the Head of Admission for final approval.',
      type: 'info'
    })
  },
  'request-correction': {
    roles: ['account_manager', 'head_recruitment', 'head_admission'],
    from: REVIEWABLE,
    to: 'correction_required',
    needsRemarks: 'Please explain what the agent needs to correct',
    apply: (agent, { remarks }) => {
      agent.verificationStatus = 'pending';
      agent.verificationRemarks = remarks;
    },
    notify: (remarks) => ({
      title: 'Application needs changes',
      message: `Your application was returned for correction: ${remarks}`,
      type: 'warning'
    })
  },
  approve: {
    roles: ['head_admission'],
    from: ['verified'],
    to: 'approved',
    check: documentsApprovedCheck,
    apply: (agent, { reviewer, remarks }) => {
      agent.isVerified = true;
      agent.verificationStatus = 'approved';
      agent.verificationRemarks = remarks || '';
      agent.onboardingDecidedBy = reviewer.id;
      agent.onboardingDecidedAt = new Date();
    },
    notify: () => ({
      title: 'Application approved',
      message: 'Congratulations! Your application has been approved. QStudy will contact you about your agent agreement.',
      type: 'success'
    })
  },
  reject: {
    roles: ['head_recruitment', 'head_admission'],
    from: [...REVIEWABLE, 'correction_required'],
    to: 'rejected',
    needsRemarks: 'Please give a reason for rejection',
    apply: (agent, { reviewer, remarks }) => {
      agent.isVerified = false;
      agent.verificationStatus = 'rejected';
      agent.verificationRemarks = remarks;
      agent.onboardingDecidedBy = reviewer.id;
      agent.onboardingDecidedAt = new Date();
    },
    notify: (remarks) => ({
      title: 'Application rejected',
      message: `Your application was not approved: ${remarks}`,
      type: 'error'
    })
  }
};

// @desc    Staff review step: start-review, recommend, verify, approve, request-correction, reject
// @route   PATCH /api/agents/:id/onboarding/:action
// @access  Private (Account Manager, Head of Recruitment, Head of Admission, super admin; per action)
exports.reviewOnboarding = async (req, res) => {
  try {
    const action = ACTIONS[req.params.action];
    if (!action) return fail(res, 404, 'Unknown review action');

    if (!isSuperAdmin(req.user) && !action.roles.includes(req.user.staffRole)) {
      return fail(res, 403, `Only ${action.roles.join(' or ')} can ${req.params.action.replace('-', ' ')} an application`);
    }

    const remarks = typeof req.body.remarks === 'string' ? req.body.remarks.trim() : '';
    if (action.needsRemarks && !remarks) return fail(res, 400, action.needsRemarks);

    const agent = await User.findOne({ where: { id: req.params.id, role: 'agent' } });
    if (!agent) return fail(res, 404, 'Agent not found');

    if (req.user.staffRole === 'account_manager' && agent.accountManagerId !== req.user.id) {
      return fail(res, 403, 'You can only review agents assigned to you');
    }

    if (!action.from.includes(agent.onboardingStatus)) {
      return fail(res, 400, `Cannot ${req.params.action.replace('-', ' ')} an application that is ${agent.onboardingStatus.replace('_', ' ')}`);
    }
    const blocker = action.check && await action.check(agent);
    if (blocker) return fail(res, 400, blocker);

    const from = agent.onboardingStatus;
    if (action.apply) action.apply(agent, { reviewer: req.user, remarks });
    agent.onboardingStatus = action.to;
    addHistory(agent, {
      action: req.params.action,
      from,
      to: action.to,
      by: req.user.id,
      byName: req.user.name,
      remarks: remarks || undefined
    });
    await agent.save();

    if (action.nextRole) {
      const next = await User.findAll({
        where: { role: 'admin', staffRole: action.nextRole, status: 'active' },
        attributes: ['id']
      });
      await Promise.all(next.map(staff => createNotification({
        recipient: staff.id,
        title: 'Agent application awaiting you',
        message: `${agent.name}'s application was ${action.to} and is ready for your review.`,
        type: 'info',
        relatedId: agent.id,
        relatedModel: 'Agent'
      })));
    }

    if (action.notify) {
      await createNotification({
        recipient: agent.id,
        ...action.notify(remarks),
        relatedId: agent.id,
        relatedModel: 'Agent'
      });
    }

    res.status(200).json(agent.toJSON());
  } catch (error) {
    console.error('Review onboarding error:', error);
    fail(res, 500, 'Server error');
  }
};
