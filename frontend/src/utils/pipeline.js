// Visa progress pipeline (mirrors backend/utils/visaPipeline.js):
//   Application -> Visa 15% -> Visa 35% -> Visa 70% -> Arrival -> Registration -> Visa 100% -> Fees paid
// The Head of Admission moves students through it; agents watch it and upload the proof of fee payment.

export const PIPELINE_STAGES = ['Application', 'Visa15', 'Visa35', 'Visa70', 'Arrival', 'Registration', 'Visa100'];

export const PIPELINE_STAGE_LABELS = {
  Application: 'Application',
  Visa15: 'Visa 15%',
  Visa35: 'Visa 35%',
  Visa70: 'Visa 70%',
  Arrival: 'Arrival',
  Registration: 'Registration',
  Visa100: 'Visa 100%',
};

// Heading shown on each step card of the stepper, above the stage name. Change the wording here.
export const PIPELINE_STAGE_HEADINGS = {
  Application: 'Submit application',
  Visa15: 'Start review',
  Visa35: 'Visa processing',
  Visa70: 'Visa approval',
  Arrival: 'Student arrival',
  Registration: 'University registration',
  Visa100: 'Visa issued',
};

// The one bucket an application counts in. At Visa 100% it is waiting for fees or fees are paid.
export const getDisplayStage = (application) => {
  const stage = application?.pipelineStage || 'Application';
  if (stage === 'Visa100') return application?.feeStatus === 'Accepted' ? 'FeesPaid' : 'PendingFees';
  return stage;
};

export const DISPLAY_STAGE_INFO = {
  Application: { label: 'Application', style: 'bg-[#F3F4F6] text-[#4B5563]' },
  Visa15: { label: 'Visa 15%', style: 'bg-[#E6F1FB] text-[#0C447C]' },
  Visa35: { label: 'Visa 35%', style: 'bg-[#E6F1FB] text-[#0C447C]' },
  Visa70: { label: 'Visa 70%', style: 'bg-[#EEEDFE] text-[#3C3489]' },
  Arrival: { label: 'Arrival', style: 'bg-[#E1F5EE] text-[#085041]' },
  Registration: { label: 'Registration', style: 'bg-[#E1F5EE] text-[#085041]' },
  PendingFees: { label: 'Pending Fees', style: 'bg-[#FAEEDA] text-[#633806]' },
  FeesPaid: { label: 'Fees Paid', style: 'bg-[#EAF3DE] text-[#27500A]' },
};

export const getDisplayStageInfo = (application) => DISPLAY_STAGE_INFO[getDisplayStage(application)] || DISPLAY_STAGE_INFO.Application;

// The Head of Admission (or super admin) moves stages and reviews the fee proof
export const canManagePipeline = (user) =>
  user?.role === 'admin' && (!user.staffRole || user.staffRole === 'head_admission');

// Applications that are not live cannot move through the pipeline
export const isPipelineActive = (application) => !['Draft', 'Rejected', 'Withdrawn'].includes(application?.status);

export const FEE_STATUS_LABELS = {
  Pending: 'Not paid yet',
  ProofSubmitted: 'Proof uploaded, waiting for review',
  Accepted: 'Paid and confirmed',
  Rejected: 'Proof rejected',
};
