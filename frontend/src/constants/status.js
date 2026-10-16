/**
 * Status constants matching backend Phase A-H enums and workflows exactly.
 * Display labels are provided for UI presentation, but API payloads must
 * always transmit the exact string values.
 */

// Phase B & E: Application Status
export const APPLICATION_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'UnderReview',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn'
};

export const APPLICATION_STATUS_LIST = Object.values(APPLICATION_STATUS);

export const APPLICATION_STATUS_LABELS = {
  [APPLICATION_STATUS.DRAFT]: 'Draft',
  [APPLICATION_STATUS.SUBMITTED]: 'Submitted',
  [APPLICATION_STATUS.UNDER_REVIEW]: 'Under Review',
  [APPLICATION_STATUS.REJECTED]: 'Rejected',
  [APPLICATION_STATUS.WITHDRAWN]: 'Withdrawn'
};

// Phase F: Invoice Status
export const INVOICE_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  REJECTED: 'Rejected'
};

export const INVOICE_STATUS_LIST = Object.values(INVOICE_STATUS);

export const INVOICE_STATUS_LABELS = {
  [INVOICE_STATUS.PENDING]: 'Pending',
  [INVOICE_STATUS.PAID]: 'Paid',
  [INVOICE_STATUS.REJECTED]: 'Rejected'
};

// Phase G: Finance Review Status
export const FINANCE_REVIEW_STATUS = {
  PENDING_REVIEW: 'PendingReview',
  UNDER_REVIEW: 'UnderReview',
  CORRECTION_REQUIRED: 'CorrectionRequired',
  RESUBMITTED: 'Resubmitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

export const FINANCE_REVIEW_STATUS_LIST = Object.values(FINANCE_REVIEW_STATUS);

export const FINANCE_REVIEW_STATUS_LABELS = {
  [FINANCE_REVIEW_STATUS.PENDING_REVIEW]: 'Pending Review',
  [FINANCE_REVIEW_STATUS.UNDER_REVIEW]: 'Under Review',
  [FINANCE_REVIEW_STATUS.CORRECTION_REQUIRED]: 'Correction Required',
  [FINANCE_REVIEW_STATUS.RESUBMITTED]: 'Resubmitted',
  [FINANCE_REVIEW_STATUS.APPROVED]: 'Approved',
  [FINANCE_REVIEW_STATUS.REJECTED]: 'Rejected'
};

// Phase H: Student Verification Status
export const STUDENT_VERIFICATION_STATUS = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'UnderReview',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected'
};

export const STUDENT_VERIFICATION_STATUS_LIST = Object.values(STUDENT_VERIFICATION_STATUS);

export const STUDENT_VERIFICATION_STATUS_LABELS = {
  [STUDENT_VERIFICATION_STATUS.PENDING]: 'Pending',
  [STUDENT_VERIFICATION_STATUS.UNDER_REVIEW]: 'Under Review',
  [STUDENT_VERIFICATION_STATUS.VERIFIED]: 'Verified',
  [STUDENT_VERIFICATION_STATUS.REJECTED]: 'Rejected'
};

