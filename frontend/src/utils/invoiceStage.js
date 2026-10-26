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
// Whatever currency the university pays in is shown as it is: USD ($), INR (₹), MYR (RM), ...
export const currencyLabel = (code) => {
  const c = String(code || 'USD').toUpperCase();
  try {
    const symbol = new Intl.NumberFormat('en-US', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find((p) => p.type === 'currency')?.value;
    return symbol && symbol !== c ? `${c} (${symbol})` : c;
  } catch {
    return c;
  }
};

// An amount in its own currency, e.g. "INR (₹) 1,20,000.00" is too long for tables, so: ₹1,20,000.00
export const formatMoney = (amount, code) => {
  const c = String(code || 'USD').toUpperCase();
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).format(n);
  } catch {
    return `${c} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

// Payment terms for paying the agent once the university has paid (staff only)
export const PAYMENT_TERM_OPTIONS = [
  { value: 14, label: '14 days (default)' },
  { value: 30, label: '30 days' },
  { value: 0, label: 'Immediate' },
];

// Maturity pill for a pending payoff whose university payment is recorded; null otherwise.
// Green: more than 7 days left, amber: 7 days or fewer, red: overdue.
export const getPayoutDueInfo = (payoff) => {
  if (!payoff || payoff.status !== 'PENDING' || payoff.daysUntilDue === null || payoff.daysUntilDue === undefined) return null;
  const days = payoff.daysUntilDue;
  const date = new Date(`${String(payoff.payoutDueDate).slice(0, 10)}T00:00:00`)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  if (days < 0) return { tone: 'overdue', label: `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'}`, style: 'bg-[#FCEBEB] text-[#791F1F]' };
  if (days === 0) return { tone: 'soon', label: `Due today (${date})`, style: 'bg-[#FAEEDA] text-[#633806]' };
  if (days === 1) return { tone: 'soon', label: `Due tomorrow (${date})`, style: 'bg-[#FAEEDA] text-[#633806]' };
  const style = days <= 7 ? 'bg-[#FAEEDA] text-[#633806]' : 'bg-[#EAF3DE] text-[#27500A]';
  return { tone: days <= 7 ? 'soon' : 'ok', label: `Due in ${days} days (${date})`, style };
};
