// Visa progress pipeline (mirrors backend/utils/visaPipeline.js):
//   Application -> Eligibility -> Offer Letter -> Payment -> Visa 5% -> 15% -> 35% -> 70% -> 80% -> Visa Approval (EVAL)
//   -> SEV -> Departure Briefing -> Arrival -> Health Check -> Registration -> Tuition Fees Payment -> Visa 100% -> invoice
// The Head of Admission moves students through it; agents watch it and upload the proof of fee payment.

export const PIPELINE_STAGES = [
  'Application', 'Eligibility', 'OfferLetter', 'Payment',
  'Visa5', 'Visa15', 'Visa35', 'Visa70', 'Visa80',
  'VisaApproval', 'SEV', 'Departure', 'Arrival', 'Medical', 'Registration', 'FeesPaid', 'Visa100',
];

// Stages between the application and the tuition payment: the student is in the visa process
export const IN_VISA_STAGES = PIPELINE_STAGES.filter((s) => !['Application', 'FeesPaid', 'Visa100'].includes(s));

export const PIPELINE_STAGE_LABELS = {
  Application: 'Application Submitted',
  Eligibility: 'Eligibility Issued',
  OfferLetter: 'Offer Letter',
  Payment: 'Payment',
  Visa5: 'Visa Processing Started (5%)',
  Visa15: 'Visa 15%',
  Visa35: 'Visa 35%',
  Visa70: 'Visa 70%',
  Visa80: 'Visa 80%',
  VisaApproval: 'Visa Approval (EVAL)',
  SEV: 'SEV (Single Entry Visa)',
  Departure: 'Departure Briefing & Travel',
  Arrival: 'Student Arrival',
  Medical: 'Health Check',
  Registration: 'University Registration',
  FeesPaid: 'Tuition Fees Payment',
  Visa100: 'Final Endorsement (Visa 100%)',
};

// Heading shown on each step card of the stepper, above the stage name. Change the wording here.
export const PIPELINE_STAGE_HEADINGS = {
  Application: 'Submit application',
  Eligibility: 'Eligibility',
  OfferLetter: 'Offer letter',
  Payment: 'Payment',
  Visa5: 'Visa processing starts',
  Visa15: 'Visa processing',
  Visa35: 'Visa processing',
  Visa70: 'Visa processing',
  Visa80: 'Visa processing',
  VisaApproval: 'Visa approval',
  SEV: 'Single entry visa',
  Departure: 'Departure briefing',
  Arrival: 'Airport pickup, transport, accommodation',
  Medical: 'Health check',
  Registration: 'University registration',
  FeesPaid: 'Tuition fees payment',
  Visa100: 'Final endorsement',
};

// The one bucket an application counts in: its stage
export const getDisplayStage = (application) => application?.pipelineStage || 'Application';

const GREY = 'bg-[#F3F4F6] text-[#4B5563]';
const BLUE = 'bg-[#E6F1FB] text-[#0C447C]';
const PURPLE = 'bg-[#EEEDFE] text-[#3C3489]';
const TEAL = 'bg-[#E1F5EE] text-[#085041]';

export const DISPLAY_STAGE_INFO = {
  Application: { label: PIPELINE_STAGE_LABELS.Application, style: GREY },
  Eligibility: { label: PIPELINE_STAGE_LABELS.Eligibility, style: GREY },
  OfferLetter: { label: PIPELINE_STAGE_LABELS.OfferLetter, style: GREY },
  Payment: { label: PIPELINE_STAGE_LABELS.Payment, style: GREY },
  Visa5: { label: 'Visa 5%', style: BLUE },
  Visa15: { label: 'Visa 15%', style: BLUE },
  Visa35: { label: 'Visa 35%', style: BLUE },
  Visa70: { label: 'Visa 70%', style: PURPLE },
  Visa80: { label: 'Visa 80%', style: PURPLE },
  VisaApproval: { label: 'Visa Approval (EVAL)', style: PURPLE },
  SEV: { label: 'SEV', style: PURPLE },
  Departure: { label: 'Departure Briefing', style: TEAL },
  Arrival: { label: 'Student Arrival', style: TEAL },
  Medical: { label: 'Health Check', style: TEAL },
  Registration: { label: 'University Registration', style: TEAL },
  FeesPaid: { label: 'Tuition Fees Payment', style: 'bg-[#FAEEDA] text-[#633806]' },
  Visa100: { label: 'Final Endorsement', style: 'bg-[#EAF3DE] text-[#27500A]' },
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
