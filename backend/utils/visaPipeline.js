// The student progress pipeline from the client workflow:
//   Application -> Visa 15% -> Visa 35% -> Visa 70% -> Arrival -> Registration -> Visa 100% -> Fees paid
// The Head of Admission moves an application through it. Each application is in one stage at a time.

const STAGES = ['Application', 'Visa15', 'Visa35', 'Visa70', 'Arrival', 'Registration', 'Visa100'];

const STAGE_LABELS = {
  Application: 'Application',
  Visa15: 'Visa 15%',
  Visa35: 'Visa 35%',
  Visa70: 'Visa 70%',
  Arrival: 'Arrival',
  Registration: 'Registration',
  Visa100: 'Visa 100%'
};

// Applications that are not live cannot move through the pipeline
const INACTIVE_APPLICATION_STATUSES = ['Draft', 'Rejected', 'Withdrawn'];

// Eligible to invoice: Visa 100% reached and the fees were accepted by the Head of Admission
const isPipelineComplete = (application) =>
  application.pipelineStage === 'Visa100' && application.feeStatus === 'Accepted';

// The single bucket an application counts in on the dashboard. At Visa 100% it is either
// waiting for fees ("PendingFees") or done ("FeesPaid"), so nothing is ever counted twice.
const getDisplayStage = (application) => {
  if (application.pipelineStage === 'Visa100') {
    return application.feeStatus === 'Accepted' ? 'FeesPaid' : 'PendingFees';
  }
  return application.pipelineStage || 'Application';
};

const DISPLAY_STAGES = [...STAGES.slice(0, -1), 'PendingFees', 'FeesPaid'];
const DISPLAY_LABELS = { ...STAGE_LABELS, Visa100: 'Visa 100%', PendingFees: 'Visa 100% - Pending Fees', FeesPaid: 'Fees Paid' };

// Where a student is, taken from their applications: the furthest stage among the live ones
// (Application ... Registration, then "PendingFees" and "FeesPaid"), or "NoApplication".
const getStudentProgress = (applications = []) => {
  const live = applications.filter(app => !INACTIVE_APPLICATION_STATUSES.includes(app.status));
  if (live.length === 0) return { pipelineStage: 'NoApplication', feesPaid: false };

  let furthest = 0;
  let feesPaid = false;
  for (const app of live) {
    const stage = getDisplayStage(app);
    furthest = Math.max(furthest, DISPLAY_STAGES.indexOf(stage));
    if (stage === 'FeesPaid') feesPaid = true;
  }
  return { pipelineStage: DISPLAY_STAGES[furthest], feesPaid };
};

module.exports = {
  STAGES,
  getStudentProgress,
  STAGE_LABELS,
  INACTIVE_APPLICATION_STATUSES,
  DISPLAY_STAGES,
  DISPLAY_LABELS,
  isPipelineComplete,
  getDisplayStage
};
