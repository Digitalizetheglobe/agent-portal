// The student progress pipeline from the client workflow:
//   Application -> Visa 15% -> Visa 35% -> Visa 70% -> Arrival -> Medical Examination
//   -> Registration -> Fees Paid -> Visa 100%
// The Head of Admission moves an application through it. Each application is in one stage at a time.
// Visa 100% (the final endorsement) comes after the fees are paid and unlocks the commission invoice.

const STAGES = ['Application', 'Visa15', 'Visa35', 'Visa70', 'Arrival', 'Medical', 'Registration', 'FeesPaid', 'Visa100'];

const STAGE_LABELS = {
  Application: 'Application',
  Visa15: 'Visa 15%',
  Visa35: 'Visa 35%',
  Visa70: 'Visa 70%',
  Arrival: 'Arrival',
  Medical: 'Medical Examination',
  Registration: 'Registration',
  FeesPaid: 'Fees Paid',
  Visa100: 'Visa 100%'
};

// Applications that are not live cannot move through the pipeline
const INACTIVE_APPLICATION_STATUSES = ['Draft', 'Rejected', 'Withdrawn'];

// Eligible to invoice: Visa 100% reached (which needs the fees accepted by the Head of Admission first)
const isPipelineComplete = (application) =>
  application.pipelineStage === 'Visa100' && application.feeStatus === 'Accepted';

// The single bucket an application counts in on the dashboard: its stage, so nothing is counted twice
const getDisplayStage = (application) => application.pipelineStage || 'Application';

const DISPLAY_STAGES = [...STAGES];
const DISPLAY_LABELS = { ...STAGE_LABELS };

// Stages from which the student's fees count as paid
const FEES_PAID_STAGES = ['FeesPaid', 'Visa100'];

// Where a student is, taken from their applications: the furthest stage among the live ones,
// or "NoApplication".
const getStudentProgress = (applications = []) => {
  const live = applications.filter(app => !INACTIVE_APPLICATION_STATUSES.includes(app.status));
  if (live.length === 0) return { pipelineStage: 'NoApplication', feesPaid: false };

  let furthest = 0;
  let feesPaid = false;
  for (const app of live) {
    const stage = getDisplayStage(app);
    furthest = Math.max(furthest, DISPLAY_STAGES.indexOf(stage));
    if (FEES_PAID_STAGES.includes(stage)) feesPaid = true;
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
  FEES_PAID_STAGES,
  isPipelineComplete,
  getDisplayStage
};
