import React, { useState, useEffect } from 'react';
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
import { invoiceReviewAPI, formatApiError } from '../../utils/api';
import { toast } from 'sonner';

/**
 * FinanceReviewModal enables Admin to inspect an invoice, view linked applications,
 * audit history, start review, approve, or reject with reason.
 */
const FinanceReviewModal = ({
  open,
  onOpenChange,
  invoiceId,
  initialInvoice,
  onSuccess
}) => {
  const [invoice, setInvoice] = useState(initialInvoice || null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Rate determination state
  const [customCommissionRate, setCustomCommissionRate] = useState('');
  const [settingRate, setSettingRate] = useState(false);

  // Review action state
  const [activeAction, setActiveAction] = useState(null); // 'approve' | 'reject' | null
  const [rejectionReason, setRejectionReason] = useState('');
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

  const handleStartReview = async () => {
    const id = invoice?.id || invoiceId;
    if (!id) return;

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await invoiceReviewAPI.start(id);
      toast.success('Invoice marked Under Review');
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
      toast.success('Invoice review approved successfully');
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
      toast.success('Invoice review rejected');
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

  const getReviewStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'UnderReview':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5"><Clock className="w-3 h-3 mr-1" /> Under Review</Badge>;
      case 'Rejected':
        return <Badge className="bg-[#FCEBEB] text-[#791F1F] border-[#F7C1C1] font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'PendingReview':
      default:
        return <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
    }
  };

  const reviewStatus = invoice?.financeReviewStatus || 'PendingReview';
  const apps = Array.isArray(invoice?.applications) ? invoice.applications : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E6F1FB] flex items-center justify-center text-[#042C53]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                    {invoice?.invoiceNumber || 'Invoice Details'}
                  </DialogTitle>
                  {getReviewStatusBadge(reviewStatus)}
                </div>
                <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                  Submitted {invoice?.raisedAt ? new Date(invoice.raisedAt).toLocaleDateString() : 'N/A'} &bull; Agent: <span className="font-semibold text-gray-700">{invoice?.agentId?.agencyName || invoice?.agentId?.name || 'Agent'}</span>
                </DialogDescription>
              </div>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-lg font-bold text-[#111827] font-['Outfit'] block">
                {invoice?.amount ? `$${Number(invoice.amount).toLocaleString()}` : '$0.00 (Pending Rate)'}
              </span>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                Commission: {invoice?.commissionRate ? `${invoice.commissionRate}%` : 'Rate Pending'}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 bg-[#F9FAFB] max-h-[70vh] overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
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
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Payment Status</span>
                  <div className="mt-1">
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase ${
                      invoice?.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : invoice?.status === 'Rejected'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {invoice?.status || 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Admin Commission Rate Determination Card (Phase 8.1-D-R1) */}
              {reviewStatus === 'UnderReview' && (
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-[#042C53]" /> Admin Commission Rate Determination
                      </span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Set the authoritative percentage for this invoice. Amount will be derived automatically from verified tuition.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                      Admin Authority
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
                          className="text-xs h-8 pl-8 font-semibold bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-gray-700 block">
                        Calculated Settlement Preview
                      </span>
                      <div className="h-8 flex items-center text-xs font-bold text-[#042C53] mt-1 bg-gray-50 px-3 rounded border border-gray-200">
                        {apps.length > 0 && customCommissionRate && !isNaN(parseFloat(customCommissionRate))
                          ? `$${(apps.reduce((sum, a) => sum + (parseFloat(a.tuitionFee) || 0), 0) * (parseFloat(customCommissionRate) / 100)).toFixed(2)}`
                          : `$${Number(invoice?.amount || 0).toLocaleString()}`}
                      </div>
                    </div>

                    <div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveRate}
                        disabled={settingRate || !customCommissionRate || parseFloat(customCommissionRate) <= 0 || parseFloat(customCommissionRate) > 100}
                        className="w-full text-xs h-8 bg-[#042C53] hover:bg-[#03213F] text-white font-semibold"
                      >
                        {settingRate ? 'Saving...' : 'Set Authoritative Rate'}
                      </Button>
                    </div>
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
                      Reviewed by {invoice.reviewer.name} ({invoice.reviewer.email}) on {invoice.financeReviewedAt ? new Date(invoice.financeReviewedAt).toLocaleString() : ''}
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
                        <span className="text-xs font-bold text-gray-900">{app.applicationNumber}</span>
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
                      <span className="text-xs font-bold text-gray-900">
                        {app.tuitionFee ? `$${Number(app.tuitionFee).toLocaleString()}` : 'Unknown'}
                      </span>
                      <span className="text-[10px] text-gray-400 block">Tuition</span>
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
                          <span className="text-[10px] text-gray-400">
                            {h.changedAt ? new Date(h.changedAt).toLocaleString() : ''}
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

          {/* Action Sub-Panels */}
          {activeAction === 'approve' && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Confirm Invoice Approval
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
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-emerald-900">
                    Calculated Settlement (USD)
                  </Label>
                  <div className="h-8 flex items-center text-xs font-bold text-emerald-950 bg-emerald-100/60 px-3 rounded border border-emerald-300">
                    {apps.length > 0 && customCommissionRate && !isNaN(parseFloat(customCommissionRate))
                      ? `$${(apps.reduce((sum, a) => sum + (parseFloat(a.tuitionFee) || 0), 0) * (parseFloat(customCommissionRate) / 100)).toFixed(2)}`
                      : `$${Number(invoice?.amount || 0).toLocaleString()}`}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="approveNotes" className="text-[11px] font-semibold text-emerald-900">
                  Optional Approval Notes
                </Label>
                <Input
                  id="approveNotes"
                  placeholder="e.g. Verified enrolled student list and tuition receipts."
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
                  className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                >
                  {actionLoading ? 'Approving...' : 'Confirm Approval & Calculate Amount'}
                </Button>
              </div>
            </div>
          )}

          {activeAction === 'reject' && (
            <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-600" /> Reject Invoice Review
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
                <Label htmlFor="rejectReason" className="text-[11px] font-semibold text-red-900">
                  Rejection Reason <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="rejectReason"
                  placeholder="e.g. Discrepancy in enrolled student count or duplicate invoice."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  className="text-xs h-8 bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rejectNotes" className="text-[11px] font-semibold text-red-900">
                  Additional Notes
                </Label>
                <Textarea
                  id="rejectNotes"
                  rows={2}
                  placeholder="Detailed instructions for the agent to correct..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs bg-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="text-xs h-8 bg-red-700 hover:bg-red-800 text-white font-semibold"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
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
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {actionLoading ? 'Starting...' : 'Start Review'}
              </Button>
            )}

            {reviewStatus === 'UnderReview' && !activeAction && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveAction('reject')}
                  className="text-xs h-9 text-red-700 border-red-200 hover:bg-red-50 font-semibold"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveAction('approve')}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
