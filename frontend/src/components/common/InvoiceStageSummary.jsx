import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { INVOICE_STAGES, INVOICE_STAGE_INFO, countInvoicesByStage } from '../../utils/invoiceStage';

const HINTS = {
  Submitted: 'Received by QStudy',
  Processing: 'Waiting for the university payment',
  UniversityPaid: 'Commission is being paid',
  Paid: 'Agent paid',
  Amendment: 'See the note',
};

/**
 * How many invoices are in each stage. Every invoice counts in exactly one stage, so when one is
 * approved Submitted drops by one and Processing rises by one, and when it is paid Processing drops.
 */
const InvoiceStageSummary = ({ invoices = [] }) => {
  const counts = useMemo(() => countInvoicesByStage(invoices), [invoices]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" data-testid="invoice-stage-summary">
      {INVOICE_STAGES.map((stage) => (
        <div key={stage} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
          <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', INVOICE_STAGE_INFO[stage].style)}>
            {INVOICE_STAGE_INFO[stage].label}
          </span>
          <p className="mt-2 text-2xl font-semibold text-[#111827] tabular-nums">{counts[stage]}</p>
          <p className="text-[11px] text-[#6B7280]">{HINTS[stage]}</p>
        </div>
      ))}
    </div>
  );
};

export default InvoiceStageSummary;
