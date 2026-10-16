// Agent onboarding review: labels, styles and permissions shared by agent and admin screens.

export const ONBOARDING_STATUS = {
  draft: { label: 'Draft', style: 'bg-[#F3F4F6] text-[#4B5563]' },
  submitted: { label: 'Submitted', style: 'bg-[#E6F1FB] text-[#0C447C]' },
  under_review: { label: 'Under review', style: 'bg-[#FAEEDA] text-[#633806]' },
  recommended: { label: 'Recommended', style: 'bg-[#EEEDFE] text-[#3C3489]' },
  verified: { label: 'Verified', style: 'bg-[#E1F5EE] text-[#085041]' },
  correction_required: { label: 'Changes requested', style: 'bg-[#FFF1E0] text-[#8A4B08]' },
  approved: { label: 'Approved', style: 'bg-[#EAF3DE] text-[#27500A]' },
  rejected: { label: 'Rejected', style: 'bg-[#FCEBEB] text-[#791F1F]' },
};

export const getOnboardingStatus = (agent) =>
  ONBOARDING_STATUS[agent?.onboardingStatus] || ONBOARDING_STATUS.draft;

// Statuses where the application is with staff (agent cannot edit documents or details)
export const IN_REVIEW_STATUSES = ['submitted', 'under_review', 'recommended', 'verified'];

export const isLockedForReview = (agent) => IN_REVIEW_STATUSES.includes(agent?.onboardingStatus);

const isStaff = (user) => user?.role === 'admin';
const isSuperAdmin = (user) => isStaff(user) && !user.staffRole;

// Any staff member who takes part in the approval chain (mirrors the backend)
export const canReviewOnboarding = (user) =>
  isSuperAdmin(user) || (isStaff(user) && ['account_manager', 'head_recruitment', 'head_admission'].includes(user.staffRole));

// Head of Recruitment or Head of Admission (or super admin) approve/reject the uploaded documents
export const canReviewDocuments = (user) =>
  isSuperAdmin(user) || (isStaff(user) && ['head_recruitment', 'head_admission'].includes(user.staffRole));

// The Head of Admission (or super admin) issues the contract and uploads the E-Certificate (mirrors the backend)
export const canManageContract = (user, agent) =>
  !!agent && agent.onboardingStatus === 'approved' &&
  (isSuperAdmin(user) || (isStaff(user) && user.staffRole === 'head_admission'));

// Who can see an approved agent's contract and E-Certificate (read-only unless they can manage it):
// the Head of Admission, the Head of Recruitment, super admin, and the Account Manager of that agent.
export const canViewContract = (user, agent) => {
  if (!agent || agent.onboardingStatus !== 'approved') return false;
  if (isSuperAdmin(user)) return true;
  if (!isStaff(user)) return false;
  if (user.staffRole === 'account_manager') return agent.accountManagerId === user.id;
  return ['head_recruitment', 'head_admission'].includes(user.staffRole);
};

// Contract / activation progress for an approved agent: the step the agent is on and what is next
export const CONTRACT_STEPS = [
  { key: 'issued', label: 'Contract issued' },
  { key: 'signed', label: 'Signed contract uploaded' },
  { key: 'activated', label: 'E-Certificate issued, account active' },
];

export const getContractProgress = (agent) => {
  const status = agent?.contractStatus || 'not_issued';
  return {
    issued: status === 'issued' || status === 'signed',
    signed: status === 'signed',
    activated: !!agent?.isActivated,
  };
};

// Chain: Account Manager recommends -> Head of Recruitment verifies -> Head of Admission approves.
// `direct` actions need no remarks dialog.
const REVIEW_ACTIONS = [
  { action: 'start-review', label: 'Start review', roles: ['account_manager', 'head_recruitment'], from: ['submitted'], kind: 'primary', direct: true },
  { action: 'recommend', label: 'Recommend', roles: ['account_manager'], from: ['under_review'], kind: 'primary', direct: true },
  { action: 'verify', label: 'Verify', roles: ['head_recruitment'], from: ['recommended'], kind: 'primary' },
  { action: 'approve', label: 'Approve', roles: ['head_admission'], from: ['verified'], kind: 'success' },
  { action: 'request-correction', label: 'Request changes', roles: ['account_manager', 'head_recruitment', 'head_admission'], from: ['under_review', 'recommended', 'verified'], kind: 'warn' },
  { action: 'reject', label: 'Reject', roles: ['head_recruitment', 'head_admission'], from: ['under_review', 'recommended', 'verified', 'correction_required'], kind: 'danger' },
];

/**
 * Review actions the signed-in staff member can take on this agent right now.
 * An Account Manager only acts on agents assigned to them.
 */
export const getReviewActions = (user, agent) => {
  if (!canReviewOnboarding(user) || !agent) return [];
  if (user.staffRole === 'account_manager' && agent.accountManagerId !== user.id) return [];
  return REVIEW_ACTIONS.filter((a) =>
    a.from.includes(agent.onboardingStatus) && (isSuperAdmin(user) || a.roles.includes(user.staffRole))
  );
};

// What the application is waiting for, shown next to the status badge
export const WAITING_FOR = {
  draft: 'The agent has not submitted their application yet. Review actions appear once they submit.',
  submitted: 'Submitted. The Account Manager or Head of Recruitment starts the review.',
  under_review: 'Waiting for the Account Manager to recommend the agent.',
  recommended: 'Recommended. Waiting for the Head of Recruitment to verify the documents.',
  verified: 'Verified. Waiting for the Head of Admission to approve.',
  correction_required: 'Returned to the agent. Waiting for them to resubmit.',
  approved: 'Application approved. The agent is verified.',
  rejected: 'Application rejected.',
};

// Documents required with the application, by agent type (mirrors the backend)
export const REQUIRED_DOCS = {
  company: ['Company Profile', 'Business Registration Certificate', 'Director Passport'],
  individual: ['Passport'],
};
const DOC_ALIASES = {
  'Business Registration Certificate': ['Business License'],
  'Director Passport': ['Identity'],
  Passport: ['Identity'],
};

export const DOC_TYPE_OPTIONS = [
  'Passport',
  'Company Profile',
  'Business Registration Certificate',
  'Director Passport',
  'Other',
];

// Checklist of required documents with the best matching upload for each
export const getDocChecklist = (agent) =>
  (REQUIRED_DOCS[agent?.agentType] || []).map((type) => {
    const accepted = [type, ...(DOC_ALIASES[type] || [])];
    const matches = (agent?.verificationDocuments || []).filter((d) => accepted.includes(d.docType));
    const doc = matches.find((d) => d.status === 'approved') || matches[matches.length - 1] || null;
    return { type, doc };
  });

export const HISTORY_LABELS = {
  submitted: 'Application submitted',
  resubmitted: 'Application resubmitted',
  'start-review': 'Review started',
  recommend: 'Recommended by Account Manager',
  verify: 'Verified by Head of Recruitment',
  'declaration-signed': 'Declaration signed',
  'contract-issued': 'Contract issued',
  'contract-renewal-issued': 'Contract renewal issued',
  'contract-signed': 'Signed contract uploaded',
  'certificate-issued': 'E-Certificate issued, agent activated',
  'certificate-reissued': 'E-Certificate re-issued',
  'request-correction': 'Changes requested',
  approve: 'Application approved',
  reject: 'Application rejected',
};
