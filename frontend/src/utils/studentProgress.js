import { DISPLAY_STAGE_INFO } from './pipeline';

// A student has no status of their own. Their progress is taken from their applications: the furthest
// visa stage among the live ones (the server sends it as `pipelineStage`, plus `feesPaid`), or
// "NoApplication" when they have none.

// Order of the journey shown as a stepper
export const STUDENT_JOURNEY = ['Application', 'Visa15', 'Visa35', 'Visa70', 'Arrival', 'Medical', 'Registration', 'FeesPaid', 'Visa100'];

const NO_APPLICATION = { label: 'No application', style: 'bg-[#F3F4F6] text-[#4B5563]' };

export const getStageLabel = (stage) => (DISPLAY_STAGE_INFO[stage] || NO_APPLICATION).label;

// The exact stage of a student, as a label and pill style
export const getStudentStageInfo = (student) => {
  const stage = student?.pipelineStage;
  return !stage || stage === 'NoApplication' ? NO_APPLICATION : (DISPLAY_STAGE_INFO[stage] || NO_APPLICATION);
};

// Position on the journey stepper (-1 when the student has no application)
export const getStudentJourneyIndex = (student) => STUDENT_JOURNEY.indexOf(student?.pipelineStage);

// Five groups used for counters, filters and charts
export const STUDENT_FUNNEL = [
  { key: 'NoApplication', label: 'No application', hint: 'Add an application', color: '#9CA3AF' },
  { key: 'Application', label: 'Application', hint: 'Waiting for QStudy review', color: '#378ADD' },
  { key: 'InVisa', label: 'In visa process', hint: 'Visa 15% to Registration', color: '#7F77DD' },
  { key: 'FeesPaid', label: 'Fees paid', hint: 'Fees confirmed, awaiting Visa 100%', color: '#EF9F27' },
  { key: 'Visa100', label: 'Visa 100%', hint: 'Ready for commission invoicing', color: '#1D9E75' },
];

const IN_VISA = ['Visa15', 'Visa35', 'Visa70', 'Arrival', 'Medical', 'Registration'];

export const getFunnelKey = (student) => {
  const stage = student?.pipelineStage || 'NoApplication';
  return IN_VISA.includes(stage) ? 'InVisa' : stage;
};

export const getFunnelLabel = (student) =>
  (STUDENT_FUNNEL.find((group) => group.key === getFunnelKey(student)) || STUDENT_FUNNEL[0]).label;

// Students who are past the review: in the visa process or beyond
export const isBeyondApplication = (student) => ['InVisa', 'FeesPaid', 'Visa100'].includes(getFunnelKey(student));

export const hasFeesPaid = (student) => Boolean(student?.feesPaid);
