import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  History,
  Percent
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useData } from '../../context/DataContext';
import { invoiceReviewAPI, formatApiError } from '../../utils/api';
import { FinancialStatusBadge } from '../common/FinancialStatusBadge';
import {
  formatCurrency,
  formatFinancialDate,
  formatFinancialDateTime,
  formatPercentage
} from '../../utils/financialFormatters';
import { toast } from 'sonner';

const CORRECTION_PROMPT_CHIPS = [
  'Missing tuition deposit receipt',
  'Enrolled student count discrepancy',
  'Deposit verification not yet completed',
  'Course fee mismatch with institutional records',
  'Clarify student enrollment start date'
];

/**
 * FinanceReviewModal enables Admin to inspect an invoice, verify linked applications,
 * audit history, determine authoritative commission rate, request corrections with quick chips,
 * and approve (creating Snapshot + Payoff) or reject.
 */
const FinanceReviewModal = ({
  open,
  onOpenChange,
  invoiceId,
  initialInvoice,
  onSuccess
}) => {
  const { payoffs, agents } = useData() || {};

  const [invoice, setInvoice] = useState(initialInvoice || null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Rate determination state
  const [customCommissionRate, setCustomCommissionRate] = useState('');
  const [settingRate, setSettingRate] = useState(false);

  // Review action state
  const [activeAction, setActiveAction] = useState(null); // 'approve' | 'reject' | 'correction' | null
  const [rejectionReason, setRejectionReason] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  const loadInvoiceData = async (id) => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [invRes, histRes] = await Promise.all([
        invoiceReviewAPI.getByInvoiceId(id),
        invoiceReviewAPI.getHistory(id).catch(() => ({ data: [] }))
      ]);
      setInvoice(invRes.data);
      if (invRes.data?.commissionRate) {
        setCustomCommissionRate(String(invRes.data.commissionRate));
      } else {
        setCustomCommissionRate('');
      }
      const histData = Array.isArray(histRes.data)
        ? histRes.data
        : (histRes.data?.history || []);
      setHistory(histData);
    } catch (err) {
      console.error('Failed to load invoice review details:', err);
      setErrorMsg(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && invoiceId) {
      setActiveAction(null);
      setRejectionReason('');
      setCorrectionReason('');
      setReviewNotes('');
      loadInvoiceData(invoiceId);
    } else if (open && initialInvoice) {
      setInvoice(initialInvoice);
      setCustomCommissionRate(initialInvoice.commissionRate ? String(initialInvoice.commissionRate) : '');
      if (initialInvoice.id) {
        loadInvoiceData(initialInvoice.id);
      }
    }
  }, [open, invoiceId, initialInvoice]);

  const apps = useMemo(() => {
    return Array.isArray(invoice?.applications) ? invoice.applications : [];
  }, [invoice?.applications]);

  // Admin-configured rate on the agent profile, used as the default for this invoice
  const agentDefaultRate = useMemo(() => {
    const agentId = invoice?.agentId?._id || invoice?.agentId?.id || invoice?.agentId;
    const agent = (agents || []).find(a => String(a.id || a._id) === String(agentId));
    const rate = parseFloat(agent?.commissionRate);
    return rate > 0 ? rate : null;
  }, [invoice?.agentId, agents]);

  const isRateOverride = agentDefaultRate !== null
    && customCommissionRate !== ''
    && parseFloat(customCommissionRate) !== agentDefaultRate;

  const associatedPayoff = useMemo(() => {
    if (!invoice) return null;
    return (payoffs || []).find(
      p => (p.invoiceId?._id || p.invoiceId?.id || p.invoiceId) === (invoice?._id || invoice?.id)
    );
  }, [invoice, payoffs]);

  const tuitionSum = useMemo(() => {
    if (!apps || apps.length === 0) return 0;
    return apps.reduce((sum, a) => sum + (parseFloat(a.tuitionFee) || 0), 0);
  }, [apps]);

  const previewAmount = useMemo(() => {
    const rate = parseFloat(customCommissionRate);
    if (isNaN(rate) || rate <= 0) return invoice?.amount || 0;
    if (tuitionSum > 0) {
      return (tuitionSum * (rate / 100));
    }
    return invoice?.amount || 0;
  }, [tuitionSum, customCommissionRate, invoice]);

  const handleApplyPromptChip = (chipText) => {
    setCorrectionReason(prev => {
      const trimmed = (prev || '').trim();
      if (!trimmed) return chipText;
      if (trimmed.includes(chipText)) return trimmed;
      return `${trimmed}; ${chipText}`;
    });
  };

  const handleStartReview = async () => {
    const id = invoice?.id || invoiceId;
    if (!id) return;

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await invoiceReviewAPI.start(id);
      toast.success('Invoice review active (Under Review)');
      setInvoice(res.data);
      await loadInvoiceData(id);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error('Error starting review:', err);
      const msg = formatApiError(err);
      setErrorMsg(msg);
      toast.error('Failed to start review', { description: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRate = async () => {
    const id = invoice?.id || invoiceId;
    if (!id) return;

    const rateNum = parseFloat(customCommissionRate);
    if (isNaN(rateNum) || rateNum <= 0 || rateNum > 100) {
      setErrorMsg('Please enter a valid commission rate percentage (> 0 and <= 100).');
      return;
    }

    setSettingRate(true);
    setErrorMsg('');
    try {
      const res = await invoiceReviewAPI.setRate(id, { commissionRate: rateNum });
      toast.success('Authoritative commission rate updated');
      setInvoice(res.data);
      setCustomCommissionRate(String(res.data.commissionRate));
      await loadInvoiceData(id);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error('Error setting commission rate:', err);
      const msg = formatApiError(err);
      setErrorMsg(msg);
      toast.error('Failed to set commission rate', { description: msg });
    } finally {
      setSettingRate(false);
    }
  };

  const handleApprove = async () => {
    const id = invoice?.id || invoiceId;
    if (!id) return;

    const rateNum = customCommissionRate ? parseFloat(customCommissionRate) : (invoice?.commissionRate || 0);
    if (!rateNum || rateNum <= 0 || isNaN(rateNum) || rateNum > 100) {
      setErrorMsg('An Admin-controlled commission rate (> 0% and <= 100%) must be established before approval.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await invoiceReviewAPI.approve(id, {
        notes: reviewNotes.trim() || undefined,
        commissionRate: rateNum
      });
      toast.success('Invoice approved — CommissionSnapshot and Payoff created');
      setInvoice(res.data);
      setCustomCommissionRate(String(res.data.commissionRate));
      setActiveAction(null);
      await loadInvoiceData(id);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error('Error approving review:', err);
      const msg = formatApiError(err);
      setErrorMsg(msg);
      toast.error('Failed to approve invoice', { description: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const id = invoice?.id || invoiceId;
    if (!id) return;

    if (!rejectionReason.trim()) {
      setErrorMsg('Rejection reason is required.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await invoiceReviewAPI.reject(id, {
        reason: rejectionReason.trim(),
        notes: reviewNotes.trim() || undefined
      });
      toast.success('Invoice claim rejected (Terminal State)');
      setInvoice(res.data);
      setActiveAction(null);
      await loadInvoiceData(id);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error('Error rejecting review:', err);
      const msg = formatApiError(err);
      setErrorMsg(msg);
      toast.error('Failed to reject invoice', { description: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCorrection = async () => {
    const id = invoice?.id || invoiceId;
    if (!id) return;

    if (!correctionReason.trim()) {
      setErrorMsg('Correction reason / remarks is required.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await invoiceReviewAPI.correction(id, {
        remarks: correctionReason.trim(),
        notes: reviewNotes.trim() || undefined
      });
      toast.success('Correction request sent to agency');
      setInvoice(res.data);
      setActiveAction(null);
      await loadInvoiceData(id);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error('Error requesting correction:', err);
      const msg = formatApiError(err);
      setErrorMsg(msg);
      toast.error('Failed to request correction', { description: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const reviewStatus = invoice?.financeReviewStatus || 'PendingReview';
  const money = (v) => formatCurrency(v, invoice?.currency);
  const agent = invoice?.agentId || {};
  const rateNum = parseFloat(customCommissionRate);
  const rateValid = !isNaN(rateNum) && rateNum > 0 && rateNum <= 100;
  const closeAnd = () => onOpenChange(false);

  const Section = ({ title, hint, children }) => (
    <section className="space-y-2">
      <div>
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">{title}</h3>
        {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );

  const Row = ({ label, children }) => (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-900 text-right break-words">{children}</span>
    </div>
  );

  // One plain-language box that says where the invoice is and what to do next
  const status = {
    PendingReview: {
      tone: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: Clock,
      title: 'New invoice, not reviewed yet',
      text: 'Click "Start Review" to begin checking the students and tuition on this invoice.'
    },
    UnderReview: {
      tone: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      icon: ShieldCheck,
      title: 'Review in progress',
      text: 'Check the students below, confirm the commission rate, then approve the invoice, ask the agent to fix something, or reject it.'
    },
    Resubmitted: {
      tone: 'bg-purple-50 border-purple-200 text-purple-900',
      icon: Clock,
      title: 'The agent replied and sent this back',
      text: 'Read their reply, then click "Resume Review" to continue.'
    },
    CorrectionRequired: {
      tone: 'bg-amber-50 border-amber-300 text-amber-950',
      icon: AlertTriangle,
      title: 'Waiting for the agent',
      text: 'You asked the agent to fix something. Nothing to do until they reply.'
    },
    Approved: {
      tone: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      icon: CheckCircle2,
      title: 'Approved',
      text: `Commission of ${money(invoice?.amount)} at ${formatPercentage(invoice?.commissionRate)} is locked. A payoff was created and is waiting for bank transfer.`
    },
    Rejected: {
      tone: 'bg-red-50 border-red-200 text-red-900',
      icon: XCircle,
      title: 'Rejected',
      text: 'This invoice was rejected. This is final and no commission will be paid.'
    }
  }[reviewStatus] || { tone: 'bg-gray-50 border-gray-200 text-gray-800', icon: Clock, title: reviewStatus, text: '' };
  const StatusIcon = status.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg font-bold text-[#111827] font-mono">
                  {invoice?.invoiceNumber || 'Invoice'}
                </DialogTitle>
                <FinancialStatusBadge status={reviewStatus} size="sm" />
              </div>
              <DialogDescription className="text-xs text-gray-500 mt-1">
                {agent.agencyName || agent.name || 'Agent'} &middot; Submitted {formatFinancialDate(invoice?.raisedAt)}
              </DialogDescription>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Commission</span>
              <span className="text-xl font-bold text-[#042C53] font-['Outfit'] tabular-nums block">
                {invoice?.amount > 0
                  ? money(invoice.amount)
                  : rateValid && tuitionSum > 0 ? money(previewAmount) : 'Not set'}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-[#F9FAFB] max-h-[68vh] overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Where are we + what to do */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${status.tone}`}>
            <StatusIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold">{status.title}</h4>
              <p className="text-xs leading-relaxed">{status.text}</p>
              {reviewStatus === 'Approved' && (
                <Link to="/admin/payoffs" onClick={closeAnd} className="text-xs font-semibold underline inline-block pt-1">
                  Go to Payoffs
                </Link>
              )}
            </div>
          </div>

          {/* Agent's reply after a correction */}
          {reviewStatus === 'Resubmitted' && invoice?.remarks && (
            <Section title="Agent's reply">
              <p className="bg-white p-3 rounded-xl border border-purple-200 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{invoice.remarks}</p>
            </Section>
          )}

          {/* What finance asked / why rejected */}
          {reviewStatus === 'CorrectionRequired' && (
            <Section title="What you asked the agent to fix">
              <p className="bg-white p-3 rounded-xl border border-amber-200 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                {invoice?.financeReviewNotes || invoice?.financeRejectionReason || 'No details were recorded.'}
              </p>
            </Section>
          )}
          {reviewStatus === 'Rejected' && (
            <Section title="Reason for rejection">
              <div className="bg-white p-3 rounded-xl border border-red-200 text-xs text-gray-800 space-y-1">
                <p className="font-medium">{invoice?.financeRejectionReason || 'No reason was recorded.'}</p>
                {invoice?.financeReviewNotes && <p className="text-gray-600">{invoice.financeReviewNotes}</p>}
              </div>
            </Section>
          )}

          {/* Agent */}
          <Section title="Agent">
            <div className="bg-white rounded-xl border border-gray-200 px-4">
              <Row label="Agency">{agent.agencyName || 'N/A'}</Row>
              <Row label="Agent">{agent.name || 'N/A'}</Row>
              <Row label="Email">{agent.email || 'N/A'}</Row>
            </div>
          </Section>

          {/* Students */}
          <Section
            title={`Students on this invoice (${apps.length})`}
            hint={reviewStatus === 'UnderReview' ? 'Step 1: check each student and tuition. Click a name to open their page.' : undefined}
          >
            {apps.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-500">
                No applications are linked to this invoice.
              </div>
            ) : (
              <div className="space-y-2">
                {apps.map((app) => {
                  const studentId = app.studentId || app.student?.id;
                  const universityId = app.universityId || app.university?.id;
                  return (
                    <div key={app.id} className="p-3.5 bg-white rounded-xl border border-gray-200 flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {studentId ? (
                            <Link to={`/admin/students/${studentId}`} onClick={closeAnd} className="text-sm font-semibold text-[#042C53] hover:underline">
                              {app.student?.name || 'Student'}
                            </Link>
                          ) : (
                            <span className="text-sm font-semibold text-gray-900">{app.student?.name || 'Student'}</span>
                          )}
                          {app.status && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {app.status}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-600">
                          {universityId ? (
                            <Link to={`/admin/universities/${universityId}`} onClick={closeAnd} className="text-[#042C53] hover:underline font-medium">
                              {app.university?.name || 'University'}
                            </Link>
                          ) : (
                            <span className="font-medium">{app.university?.name || 'University'}</span>
                          )}
                          {app.courseName && <> &middot; {app.courseName}</>}
                        </div>
                        {app.id && (
                          <Link to={`/admin/applications/${app.id}`} onClick={closeAnd} className="text-[11px] text-blue-600 hover:underline font-mono inline-block">
                            {app.applicationNumber}
                          </Link>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-gray-900 tabular-nums block">
                          {app.tuitionFee ? money(app.tuitionFee) : 'N/A'}
                        </span>
                        <span className="text-[10px] text-gray-400">Tuition</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 rounded-xl text-xs">
                  <span className="font-semibold text-gray-700">Total tuition</span>
                  <span className="font-bold text-gray-900 tabular-nums">{money(tuitionSum)}</span>
                </div>
              </div>
            )}
          </Section>

          {/* Commission rate (only while reviewing) */}
          {reviewStatus === 'UnderReview' && (
            <Section title="Commission" hint="Step 2: confirm the rate. The commission is the total tuition multiplied by this rate.">
              <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label htmlFor="customRate" className="text-[11px] font-semibold text-gray-700">
                      Commission rate (%)
                    </Label>
                    <div className="relative mt-1">
                      <Percent className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                      <Input
                        id="customRate"
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.1"
                        placeholder="e.g. 10"
                        value={customCommissionRate}
                        onChange={(e) => setCustomCommissionRate(e.target.value)}
                        className="text-xs h-9 pl-8 font-semibold bg-white tabular-nums"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-700 block">Total tuition</span>
                    <div className="h-9 flex items-center text-xs font-semibold text-gray-900 mt-1 bg-gray-50 px-3 rounded-md border border-gray-200 tabular-nums">
                      {money(tuitionSum)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-700 block">Commission to pay</span>
                    <div className="h-9 flex items-center text-xs font-bold text-[#042C53] mt-1 bg-blue-50 px-3 rounded-md border border-blue-200 tabular-nums">
                      {money(previewAmount)}
                    </div>
                  </div>
                </div>
                <p className={`text-[11px] ${isRateOverride ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                  {agentDefaultRate === null
                    ? 'No default rate is set on this agent. Enter the rate to use.'
                    : isRateOverride
                      ? `This is different from the agent's usual rate of ${agentDefaultRate}%. The change is recorded in the history.`
                      : `This is the agent's usual rate (${agentDefaultRate}%).`}
                </p>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveRate}
                    disabled={settingRate || !rateValid}
                    className="text-xs h-8 bg-[#042C53] hover:bg-[#03213F] text-white font-semibold"
                  >
                    {settingRate ? 'Saving...' : 'Save rate'}
                  </Button>
                </div>
              </div>
            </Section>
          )}

          {/* Remarks + document */}
          {(invoice?.remarks && reviewStatus !== 'Resubmitted') || invoice?.invoiceUrl ? (
            <Section title="From the agent">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                {invoice?.remarks && reviewStatus !== 'Resubmitted' && (
                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{invoice.remarks}</p>
                )}
                {invoice?.invoiceUrl && (
                  <a
                    href={invoice.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#042C53] hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open attached invoice document
                  </a>
                )}
              </div>
            </Section>
          ) : null}

          {/* Decision notes once reviewed */}
          {reviewStatus === 'Approved' && invoice?.financeReviewNotes && (
            <Section title="Approval notes">
              <p className="bg-white p-3 rounded-xl border border-emerald-200 text-xs text-gray-800">{invoice.financeReviewNotes}</p>
            </Section>
          )}
          {invoice?.reviewer && invoice?.financeReviewedAt && (
            <p className="text-[11px] text-gray-500">
              Last reviewed by {invoice.reviewer.name} on {formatFinancialDateTime(invoice.financeReviewedAt)}
            </p>
          )}

          {/* History */}
          <details className="bg-white rounded-xl border border-gray-200 group">
            <summary className="px-4 py-3 text-xs font-bold text-gray-900 cursor-pointer flex items-center gap-1.5 select-none">
              <History className="w-3.5 h-3.5 text-gray-500" /> History ({history.length})
            </summary>
            {history.length === 0 ? (
              <p className="px-4 pb-4 text-xs text-gray-500">Nothing has happened on this invoice yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 border-t border-gray-100">
                {history.map((h, i) => (
                  <li key={i} className="px-4 py-2.5 text-xs flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-gray-900">{h.action}</span>
                      {h.from && h.to && (
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          {h.from} <ArrowRight className="w-3 h-3" /> {h.to}
                        </span>
                      )}
                      {h.notes && <p className="text-[11px] text-gray-600">{h.notes}</p>}
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">
                      {h.changedAt ? formatFinancialDateTime(h.changedAt) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>

          {/* Decision: Approve */}
          {activeAction === 'approve' && (
            <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Approve this invoice?
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveAction(null)} className="text-xs h-7 px-2 text-gray-600">
                  Back
                </Button>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                The agent will be owed <strong>{money(previewAmount)}</strong>
                {rateValid && <> ({rateNum}% of {money(tuitionSum)})</>}. A payoff is created and waits for you to record the bank transfer. <strong>This cannot be undone.</strong>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="approveRate" className="text-[11px] font-semibold text-emerald-900">Commission rate (%)</Label>
                  <Input
                    id="approveRate"
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={customCommissionRate}
                    onChange={(e) => setCustomCommissionRate(e.target.value)}
                    className="text-xs h-9 bg-white tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="approveNotes" className="text-[11px] font-semibold text-emerald-900">Note (optional)</Label>
                  <Input
                    id="approveNotes"
                    placeholder="e.g. Checked tuition receipts"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="text-xs h-9 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={actionLoading || !rateValid}
                  className="text-xs h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  {actionLoading ? 'Approving...' : 'Approve and create payoff'}
                </Button>
              </div>
            </div>
          )}

          {/* Decision: Reject */}
          {activeAction === 'reject' && (
            <div className="p-5 bg-red-50 border-2 border-red-300 rounded-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-red-950 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-600" /> Reject this invoice?
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveAction(null)} className="text-xs h-7 px-2 text-gray-600">
                  Back
                </Button>
              </div>
              <p className="text-xs text-red-900">Rejecting is final. The agent will not be paid for this invoice. If something can be fixed, ask for a correction instead.</p>
              <div className="space-y-1.5">
                <Label htmlFor="rejectReason" className="text-xs font-bold text-red-950">
                  Reason (the agent will see this) <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="rejectReason"
                  placeholder="e.g. This invoice duplicates INV-2026-0012"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="text-xs h-9 bg-white border-red-300 focus-visible:ring-red-500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rejectNotes" className="text-[11px] font-semibold text-red-900">Internal note (optional)</Label>
                <Textarea
                  id="rejectNotes"
                  rows={2}
                  placeholder="Anything finance should remember..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs bg-white resize-none border-red-200"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="text-xs h-9 px-4 bg-red-700 hover:bg-red-800 text-white font-bold"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject invoice'}
                </Button>
              </div>
            </div>
          )}

          {/* Decision: Correction */}
          {activeAction === 'correction' && (
            <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Ask the agent to fix something
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveAction(null)} className="text-xs h-7 px-2 text-gray-600">
                  Back
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-amber-900 block">Tap to add a common request:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CORRECTION_PROMPT_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPromptChip(chip)}
                      className="text-[11px] px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-full font-medium transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="correctionReason" className="text-xs font-bold text-amber-950">
                  What does the agent need to do? (the agent will see this) <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="correctionReason"
                  rows={3}
                  placeholder="Explain clearly what is missing or wrong..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="text-xs bg-white border-amber-300 focus-visible:ring-amber-500 rounded-lg p-3 resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="correctionNotes" className="text-[11px] font-semibold text-amber-900">Internal note (optional, agent cannot see)</Label>
                <Input
                  id="correctionNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs h-9 bg-white border-amber-200"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleCorrection}
                  disabled={actionLoading || !correctionReason.trim()}
                  className="text-xs h-9 px-4 bg-amber-700 hover:bg-amber-800 text-white font-bold"
                >
                  {actionLoading ? 'Sending...' : 'Send to agent'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-white flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={closeAnd} className="text-xs h-9">
            Close
          </Button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {reviewStatus === 'PendingReview' && (
              <Button
                type="button"
                size="sm"
                onClick={handleStartReview}
                disabled={actionLoading}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {actionLoading ? 'Starting...' : 'Start Review'}
              </Button>
            )}

            {reviewStatus === 'Resubmitted' && (
              <Button
                type="button"
                size="sm"
                onClick={handleStartReview}
                disabled={actionLoading}
                className="text-xs h-9 bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {actionLoading ? 'Starting...' : 'Resume Review'}
              </Button>
            )}

            {reviewStatus === 'UnderReview' && !activeAction && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveAction('correction')}
                  className="text-xs h-9 text-amber-700 border-amber-300 hover:bg-amber-50 font-bold"
                >
                  Ask for correction
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveAction('reject')}
                  className="text-xs h-9 text-red-700 border-red-200 hover:bg-red-50 font-bold"
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveAction('approve')}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Approve
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinanceReviewModal;
