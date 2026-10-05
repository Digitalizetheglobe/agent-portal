import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  User,
  Building2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  History,
  DollarSign,
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
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useData } from '../../context/DataContext';
import { invoiceReviewAPI, formatApiError } from '../../utils/api';
import { FinancialStatusBadge, FinancialStateHierarchy } from '../common/FinancialStatusBadge';
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
  const { payoffs } = useData() || {};

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[780px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E6F1FB] flex items-center justify-center text-[#042C53]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit'] font-mono">
                    {invoice?.invoiceNumber || 'Invoice Details'}
                  </DialogTitle>
                  <FinancialStatusBadge status={reviewStatus} size="sm" />
                </div>
                <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                  Raised {formatFinancialDate(invoice?.raisedAt)} &bull; Agency: <span className="font-semibold text-gray-700">{invoice?.agentId?.agencyName || invoice?.agentId?.name || 'Agent'}</span>
                </DialogDescription>
              </div>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-xl font-bold text-[#042C53] font-['Outfit'] block tabular-nums">
                {invoice?.amount > 0 ? formatCurrency(invoice.amount, invoice.currency) : (customCommissionRate && tuitionSum > 0 ? formatCurrency(previewAmount, invoice?.currency) : '$0.00 (Pending Rate)')}
              </span>
              <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider font-['Outfit'] tabular-nums block mt-0.5">
                Commission: {invoice?.commissionRate > 0 ? formatPercentage(invoice.commissionRate) : (customCommissionRate ? `${customCommissionRate}% (Proposed)` : 'Rate Pending')}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-[#F9FAFB] max-h-[70vh] overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Lifecycle Guidance / Status Banners */}
          {reviewStatus === 'PendingReview' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900">Awaiting Initial Review Triage</h4>
                  <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                    This claim is queued for institutional compliance. Click "Start Review" to begin auditing application tuition fees and determining commission rate.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleStartReview}
                disabled={actionLoading}
                className="h-8 px-4 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shrink-0 shadow-sm"
              >
                {actionLoading ? 'Starting...' : 'Start Review'}
              </Button>
            </div>
          )}

          {reviewStatus === 'Resubmitted' && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-purple-900">Claim Resubmitted by Agent</h4>
                    <p className="text-xs text-purple-700 mt-0.5 leading-relaxed">
                      The agency updated their response memo addressing previous review inquiries.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleStartReview}
                  disabled={actionLoading}
                  className="h-8 px-4 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white shrink-0 shadow-sm"
                >
                  {actionLoading ? 'Starting...' : 'Resume Review'}
                </Button>
              </div>
              {invoice?.remarks && (
                <div className="bg-white/90 p-3 rounded-lg border border-purple-200 text-xs text-purple-950 space-y-1">
                  <span className="font-bold text-[10px] text-purple-900 uppercase tracking-wider block">Agent Response Memo:</span>
                  <p className="whitespace-pre-wrap font-medium">{invoice.remarks}</p>
                </div>
              )}
            </div>
          )}

          {reviewStatus === 'CorrectionRequired' && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Correction Active: Awaiting Agent Action</span>
              </div>
              <div className="bg-white/90 p-3 rounded-lg border border-amber-200 text-xs text-amber-950 space-y-1">
                <span className="font-bold text-[10px] text-amber-900 uppercase tracking-wider block">Requested Changes / Notes Sent:</span>
                <p className="whitespace-pre-wrap font-medium">
                  {invoice?.financeReviewNotes || invoice?.financeRejectionReason || 'Please adjust the required information.'}
                </p>
              </div>
              <p className="text-[11px] text-amber-800">
                * The agency has been notified and must provide clarification before this claim can be approved.
              </p>
            </div>
          )}

          {reviewStatus === 'UnderReview' && (
            <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-start gap-2.5 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-indigo-900">Active Audit in Progress</h4>
                <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed font-medium">
                  Verify linked application tuition fees below, specify the authoritative commission rate, and either Approve, Request Changes, or Reject.
                </p>
              </div>
            </div>
          )}

          {reviewStatus === 'Approved' && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Approved Commission Claim
                </span>
                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold uppercase">
                  Verified & Immutable
                </Badge>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Contractual rate locked at <span className="font-bold">{formatPercentage(invoice?.commissionRate)}</span>. Approved payout amount: <span className="font-bold tabular-nums">{formatCurrency(invoice?.amount, invoice?.currency)}</span>. Permanent CommissionSnapshot and linked Payoff generated.
              </p>
            </div>
          )}

          {reviewStatus === 'Rejected' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-red-900 font-bold text-xs">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Review Terminal State: Claim Rejected</span>
              </div>
              <p className="text-xs text-red-800 font-medium">
                Reason: {invoice?.financeRejectionReason || 'Institutional criteria not met.'}
              </p>
              {invoice?.financeReviewNotes && (
                <p className="text-[11px] text-red-700 italic">Notes: {invoice.financeReviewNotes}</p>
              )}
            </div>
          )}

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="bg-white border border-gray-200 p-1 rounded-lg">
              <TabsTrigger value="details" className="text-xs font-semibold px-4 py-1.5 data-[state=active]:bg-[#042C53] data-[state=active]:text-white">
                Invoice Details
              </TabsTrigger>
              <TabsTrigger value="applications" className="text-xs font-semibold px-4 py-1.5 data-[state=active]:bg-[#042C53] data-[state=active]:text-white">
                Linked Applications ({apps.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs font-semibold px-4 py-1.5 data-[state=active]:bg-[#042C53] data-[state=active]:text-white flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Review History ({history.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Details */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-200">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Agent / Agency</span>
                  <span className="text-xs font-bold text-gray-900 mt-0.5 block">{invoice?.agentId?.agencyName || 'N/A'}</span>
                  <span className="text-[11px] text-gray-600">{invoice?.agentId?.name} &bull; {invoice?.agentId?.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Financial Lifecycle State</span>
                  <div className="mt-1">
                    <FinancialStateHierarchy
                      reviewStatus={reviewStatus}
                      payoffStatus={associatedPayoff?.status}
                      settledAt={associatedPayoff?.settledAt}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {/* Admin Commission Rate Determination Card */}
              {reviewStatus === 'UnderReview' && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-[#042C53]" /> Authoritative Commission Rate Determination
                      </span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Set the institutional percentage for this claim. Gross payout is automatically derived from verified contractual tuition.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                      Institutional Authority
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 items-end">
                    <div>
                      <Label htmlFor="customRate" className="text-[11px] font-semibold text-gray-700">
                        Commission Rate (%) <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Percent className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                        <Input
                          id="customRate"
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          placeholder="e.g. 15.0"
                          value={customCommissionRate}
                          onChange={(e) => setCustomCommissionRate(e.target.value)}
                          className="text-xs h-8 pl-8 font-semibold bg-white tabular-nums"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-gray-700 block">
                        Verified Tuition Sum
                      </span>
                      <div className="h-8 flex items-center text-xs font-semibold text-gray-900 mt-1 bg-gray-50 px-3 rounded border border-gray-200 tabular-nums">
                        {formatCurrency(tuitionSum, invoice?.currency)}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-gray-700 block">
                        Calculated Gross Payout
                      </span>
                      <div className="h-8 flex items-center text-xs font-bold text-[#042C53] mt-1 bg-blue-50/50 px-3 rounded border border-blue-200 tabular-nums">
                        {formatCurrency(previewAmount, invoice?.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveRate}
                      disabled={settingRate || !customCommissionRate || parseFloat(customCommissionRate) <= 0 || parseFloat(customCommissionRate) > 100}
                      className="text-xs h-8 bg-[#042C53] hover:bg-[#03213F] text-white font-semibold"
                    >
                      {settingRate ? 'Saving Rate...' : 'Set Authoritative Rate'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Remarks & Document Link */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Remarks & Instructions</span>
                  <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                    {invoice?.remarks || 'No remarks provided.'}
                  </p>
                </div>
                {invoice?.invoiceUrl && (
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Attached Document</span>
                    <a
                      href={invoice.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#042C53] hover:underline font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Uploaded Invoice
                    </a>
                  </div>
                )}
              </div>

              {/* Review notes or Rejection Reason if present */}
              {(invoice?.financeReviewNotes || invoice?.financeRejectionReason) && (
                <div className={`p-4 rounded-xl border space-y-1.5 ${
                  reviewStatus === 'Rejected'
                    ? 'bg-red-50/70 border-red-200'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-600">
                    {reviewStatus === 'Rejected' ? 'Rejection Reason' : 'Finance Review Notes'}
                  </span>
                  {invoice.financeRejectionReason && (
                    <p className="text-xs font-medium text-red-900">{invoice.financeRejectionReason}</p>
                  )}
                  {invoice.financeReviewNotes && (
                    <p className="text-xs text-gray-700">{invoice.financeReviewNotes}</p>
                  )}
                  {invoice?.reviewer && (
                    <span className="text-[10px] text-gray-500 block pt-1">
                      Reviewed by {invoice.reviewer.name} ({invoice.reviewer.email}) on {invoice.financeReviewedAt ? formatFinancialDateTime(invoice.financeReviewedAt) : ''}
                    </span>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Linked Applications */}
            <TabsContent value="applications" className="space-y-3 mt-4">
              {apps.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-500">
                  No linked applications found for this invoice.
                </div>
              ) : (
                apps.map((app) => (
                  <div key={app.id} className="p-3.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 font-mono">{app.applicationNumber}</span>
                        <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          {app.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-600">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-gray-400" /> {app.student?.name || 'Student'}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400" /> {app.university?.name || app.courseName}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-900 tabular-nums">
                        {app.tuitionFee ? formatCurrency(app.tuitionFee, invoice?.currency) : 'N/A'}
                      </span>
                      <span className="text-[10px] text-gray-400 block">Tuition Fee</span>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Tab 3: History */}
            <TabsContent value="history" className="mt-4">
              {history.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-500">
                  No review audit records available yet.
                </div>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                  {history.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                      <div className="w-2 h-2 rounded-full bg-[#042C53] mt-1.5 shrink-0" />
                      <div className="w-full space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">{h.action}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {h.changedAt ? formatFinancialDateTime(h.changedAt) : ''}
                          </span>
                        </div>
                        {h.from && h.to && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{h.from}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[10px]">{h.to}</span>
                          </div>
                        )}
                        {h.notes && (
                          <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 mt-1">
                            {h.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Sub-Panel: Approve */}
          {activeAction === 'approve' && (
            <div className="p-5 bg-emerald-50/90 border-2 border-emerald-300 rounded-xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Confirm Invoice Approval & Payoff Generation
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveAction(null)}
                  className="text-[11px] h-6 px-2 text-gray-500 hover:bg-emerald-100"
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="approveRate" className="text-[11px] font-semibold text-emerald-900">
                    Authoritative Commission Rate (%) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="approveRate"
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 15.0"
                    value={customCommissionRate}
                    onChange={(e) => setCustomCommissionRate(e.target.value)}
                    className="text-xs h-8 bg-white tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-emerald-900">
                    Gross Settlement Amount (USD)
                  </Label>
                  <div className="h-8 flex items-center text-xs font-bold text-emerald-950 bg-emerald-100/70 px-3 rounded border border-emerald-300 tabular-nums">
                    {formatCurrency(previewAmount, invoice?.currency)}
                  </div>
                </div>
              </div>

              <div className="bg-white/80 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <span className="font-bold text-[10px] text-emerald-950 uppercase tracking-wider block">Institutional Guarantees:</span>
                <p className="leading-relaxed">
                  Approving permanently locks an immutable <strong>CommissionSnapshot</strong> and creates a <strong>Payoff (PO-YYYY-XXXXX)</strong> in <code className="bg-emerald-100 px-1 py-0.5 rounded text-[11px]">PENDING</code> state awaiting offline settlement.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="approveNotes" className="text-[11px] font-semibold text-emerald-900">
                  Optional Approval Audit Notes
                </Label>
                <Input
                  id="approveNotes"
                  placeholder="e.g. Verified enrolled student list and bank tuition receipts."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs h-8 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={actionLoading || !customCommissionRate || parseFloat(customCommissionRate) <= 0 || parseFloat(customCommissionRate) > 100}
                  className="text-xs h-8 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  {actionLoading ? 'Approving...' : 'Confirm Approval & Generate Payoff'}
                </Button>
              </div>
            </div>
          )}

          {/* Action Sub-Panel: Reject */}
          {activeAction === 'reject' && (
            <div className="p-5 bg-red-50/90 border-2 border-red-300 rounded-xl space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-600" /> Reject Invoice Claim (Terminal State)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveAction(null)}
                  className="text-[11px] h-6 px-2 text-gray-500 hover:bg-red-100"
                >
                  Cancel
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rejectReason" className="text-xs font-bold text-red-950">
                  Mandatory Rejection Reason <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="rejectReason"
                  placeholder="e.g. Discrepancy in enrolled student count or duplicate invoice."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  className="text-xs h-8 bg-white border-red-300 focus-visible:ring-red-500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rejectNotes" className="text-[11px] font-semibold text-red-900">
                  Additional Audit Notes
                </Label>
                <Textarea
                  id="rejectNotes"
                  rows={2}
                  placeholder="Explanatory notes for finance records..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs bg-white resize-none border-red-200"
                />
              </div>
              <div className="flex justify-between items-center pt-1">
                <p className="text-[10px] text-red-700">
                  * Warning: Rejection is a permanent terminal state.
                </p>
                <Button
                  size="sm"
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="text-xs h-8 px-4 bg-red-700 hover:bg-red-800 text-white font-bold"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </div>
            </div>
          )}

          {/* Action Sub-Panel: Correction */}
          {activeAction === 'correction' && (
            <div className="p-5 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Request Invoice Changes / Corrections
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveAction(null)}
                  className="text-[11px] h-6 px-2 text-gray-500 hover:bg-amber-100"
                >
                  Cancel
                </Button>
              </div>

              {/* Quick Inquiry Prompts */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                  Quick Inquiry Prompts (Click to add):
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {CORRECTION_PROMPT_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPromptChip(chip)}
                      className="text-[10px] px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-full font-medium transition-colors cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="correctionReason" className="text-xs font-bold text-amber-950">
                  Instructions for Agent <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="correctionReason"
                  rows={3}
                  placeholder="Specific instructions or missing details the agent needs to clarify or update..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  required
                  className="text-xs bg-white border-amber-300 focus-visible:ring-amber-500 rounded-lg p-3 resize-none"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="correctionNotes" className="text-[11px] font-semibold text-amber-900">
                  Internal Finance Audit Notes (Optional)
                </Label>
                <Input
                  id="correctionNotes"
                  placeholder="Internal notes recorded in the permanent audit trail..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs h-8 bg-white border-amber-200"
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <p className="text-[10px] text-amber-800">
                  Invoice will transition to CorrectionRequired state.
                </p>
                <Button
                  size="sm"
                  onClick={handleCorrection}
                  disabled={actionLoading || !correctionReason.trim()}
                  className="text-xs h-8 px-4 bg-amber-700 hover:bg-amber-800 text-white font-bold"
                >
                  {actionLoading ? 'Submitting...' : 'Send Correction Request'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 px-6 border-t border-gray-100 bg-white flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9"
          >
            Close
          </Button>

          {/* Transition Action Buttons */}
          <div className="flex items-center gap-2">
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

            {reviewStatus === 'Resubmitted' && !activeAction && (
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
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Request Correction
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveAction('reject')}
                  className="text-xs h-9 text-red-700 border-red-200 hover:bg-red-50 font-bold"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveAction('approve')}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Invoice
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
