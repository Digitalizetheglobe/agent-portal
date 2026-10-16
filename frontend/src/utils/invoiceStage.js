// Invoice stages from the client workflow:
//   Submitted (agent raised it, being reviewed) -> Processing (approved by the Head of Admission,
//   waiting for the university to pay QStudy and for Accounts to pay the agent) -> Paid & Recorded.
// Every invoice is in exactly one stage, so moving one on lowers one count and raises the next.

export const INVOICE_STAGES = ['Submitted', 'Processing', 'Paid', 'Rejected'];

export const INVOICE_STAGE_INFO = {
  Submitted: { label: 'Submitted', style: 'bg-[#E6F1FB] text-[#0C447C]' },
  Processing: { label: 'Processing', style: 'bg-[#FAEEDA] text-[#633806]' },
  Paid: { label: 'Paid & Recorded', style: 'bg-[#EAF3DE] text-[#27500A]' },
  Rejected: { label: 'Rejected', style: 'bg-[#FCEBEB] text-[#791F1F]' },
};

export const getInvoiceStage = (invoice) => {
  if (invoice?.status === 'Paid') return 'Paid';
  if (invoice?.financeReviewStatus === 'Rejected' || invoice?.status === 'Rejected') return 'Rejected';
  if (invoice?.financeReviewStatus === 'Approved') return 'Processing';
  return 'Submitted';
};

// Counts per stage; each invoice is counted once
export const countInvoicesByStage = (invoices = []) => {
  const counts = Object.fromEntries(INVOICE_STAGES.map((key) => [key, 0]));
  invoices.forEach((invoice) => { counts[getInvoiceStage(invoice)] += 1; });
  return counts;
};

// Where a payoff is on the way to the agent
export const getPayoffPaymentState = (payoff) => {
  if (!payoff) return null;
  if (payoff.status === 'SETTLED') return 'Settled';
  if (payoff.status === 'CANCELLED') return 'Cancelled';
  if (payoff.universityPaid || payoff.universityPaidAt) return 'UniversityPaid';
  if (payoff.blockBypassed || payoff.blockBypassedAt) return 'ExceptionAuthorized';
  return 'AwaitingUniversity';
};

export const PAYOFF_PAYMENT_STATE_INFO = {
  AwaitingUniversity: { label: 'Awaiting university payment', style: 'bg-[#FAEEDA] text-[#633806]' },
  UniversityPaid: { label: 'University paid - ready to pay agent', style: 'bg-[#E6F1FB] text-[#0C447C]' },
  ExceptionAuthorized: { label: 'Exception authorized', style: 'bg-[#EEEDFE] text-[#3C3489]' },
  Settled: { label: 'Paid', style: 'bg-[#EAF3DE] text-[#27500A]' },
  Cancelled: { label: 'Cancelled', style: 'bg-[#F3F4F6] text-[#4B5563]' },
};

// Currencies the university can pay in. The payoff has its own currency; the payment must match it.
export const currencyLabel = (code) => (String(code || '').toUpperCase() === 'MYR' ? 'RM' : String(code || 'USD').toUpperCase());
