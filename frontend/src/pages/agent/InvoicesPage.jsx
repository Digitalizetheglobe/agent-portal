import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  FilePlus,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Search,
  ExternalLink,
  Building2,
  User,
  History,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import InvoiceModal from '../../components/modals/InvoiceModal';
import { invoiceReviewAPI } from '../../utils/api';
import { FinancialStatusBadge, FinancialStateHierarchy } from '../../components/common/FinancialStatusBadge';
import {
  formatCurrency,
  formatFinancialDate,
  formatFinancialDateTime,
  formatPercentage
} from '../../utils/financialFormatters';
import { toast } from 'sonner';

const InvoicesPage = () => {
  const { invoices, fetchInvoices, payoffs, fetchPayoffs, loading } = useData();
  const { user } = useAuth();

  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Correction and resubmission state
  const [agentCorrectionRemarks, setAgentCorrectionRemarks] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState('');

  useEffect(() => {
    if (fetchInvoices) {
      fetchInvoices();
    }
    if (fetchPayoffs) {
      fetchPayoffs();
    }
  }, [fetchInvoices, fetchPayoffs]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv =>
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  // Financial summary metrics aligned with true workflow (FA-4.3)
  const stats = useMemo(() => {
    const total = invoices.length;

    // 1. In Review: PendingReview, Resubmitted, UnderReview
    const inReviewInvoices = invoices.filter(i =>
      ['PendingReview', 'Resubmitted', 'UnderReview'].includes(i.financeReviewStatus)
    );

    // 2. Action Required: CorrectionRequired
    const actionRequiredInvoices = invoices.filter(i =>
      i.financeReviewStatus === 'CorrectionRequired'
    );

    // 3. Approved invoices
    const approvedInvoices = invoices.filter(i => i.financeReviewStatus === 'Approved');

    // 4. Payoff statistics from authoritative payoffs
    const agentPayoffs = payoffs || [];
    const pendingPayoffs = agentPayoffs.filter(p => p.status === 'PENDING');
    const settledPayoffs = agentPayoffs.filter(p => p.status === 'SETTLED');

    const pendingPayoutAmount = pendingPayoffs.reduce((sum, p) => sum + Number(p.netAmount || p.grossCommission || 0), 0);
    const settledPayoutAmount = settledPayoffs.reduce((sum, p) => sum + Number(p.netAmount || p.grossCommission || 0), 0);

    return {
      total,
      inReviewCount: inReviewInvoices.length,
      actionRequiredCount: actionRequiredInvoices.length,
      approvedCount: approvedInvoices.length,
      pendingPayoutCount: pendingPayoffs.length,
      pendingPayoutAmount,
      settledPayoutCount: settledPayoffs.length,
      settledPayoutAmount
    };
  }, [invoices, payoffs]);

  // Authoritative payoff associated with the modal's selected invoice
  const selectedAssociatedPayoff = useMemo(() => {
    if (!selectedInvoice) return null;
    return (payoffs || []).find(
      p => (p.invoiceId?._id || p.invoiceId?.id || p.invoiceId) === (selectedInvoice?._id || selectedInvoice?.id)
    );
  }, [selectedInvoice, payoffs]);

  const handleOpenView = async (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewOpen(true);
    setReviewHistory([]);
    setAgentCorrectionRemarks(invoice.remarks || '');
    setResubmitError('');
    if (invoice.id) {
      setLoadingHistory(true);
      try {
        const res = await invoiceReviewAPI.getHistory(invoice.id);
        const data = Array.isArray(res.data) ? res.data : (res.data?.history || []);
        setReviewHistory(data);
      } catch (err) {
        console.error('Failed to load review history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const handleResubmit = async () => {
    if (!selectedInvoice?.id) return;
    setResubmitting(true);
    setResubmitError('');
    try {
      const res = await invoiceReviewAPI.resubmit(selectedInvoice.id, {
        remarks: agentCorrectionRemarks.trim() || undefined
      });
      toast.success('Invoice resubmitted for finance review successfully');
      setSelectedInvoice(res.data);
      if (fetchInvoices) await fetchInvoices();
    } catch (err) {
      console.error('Failed to resubmit invoice:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to resubmit invoice';
      setResubmitError(msg);
      toast.error('Resubmission failed', { description: msg });
    } finally {
      setResubmitting(false);
    }
  };

  const InvoiceList = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Invoice #</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Applications</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Gross Amount</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Financial Lifecycle</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Payoff Status</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Raised At</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-20 text-[#6B7280]">
                <div className="flex flex-col items-center gap-3">
                  <FileText className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">No invoices found in this view.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((invoice) => {
              const appCount = invoice.applications?.length || invoice.studentIds?.length || 0;
              const linkedPayoff = (payoffs || []).find(
                p => (p.invoiceId?._id || p.invoiceId?.id || p.invoiceId) === (invoice._id || invoice.id)
              );

              return (
                <TableRow key={invoice.id} className="hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0">
                  <TableCell className="px-6 py-4 font-bold text-[#111827]">
                    <span className="font-mono text-xs whitespace-nowrap">{invoice.invoiceNumber}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold text-[#4B5563] text-center">
                    {appCount} {appCount === 1 ? 'Application' : 'Applications'}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-[#111827] text-center font-['Outfit'] tabular-nums">
                    {invoice.amount > 0 ? (
                      formatCurrency(invoice.amount, invoice.currency)
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">Pending Review</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <FinancialStatusBadge
                      status={invoice.financeReviewStatus || 'PendingReview'}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {linkedPayoff ? (
                      <div className="flex flex-col items-center gap-1">
                        <FinancialStatusBadge status={linkedPayoff.status} size="sm" />
                        <span className="text-[10px] text-gray-500 font-mono">{linkedPayoff.payoffNumber}</span>
                        {linkedPayoff.status === 'SETTLED' && linkedPayoff.settledAt && (
                          <span className="text-[10px] text-[#27500A] font-semibold font-['Outfit'] tabular-nums">
                            Settled {formatFinancialDate(linkedPayoff.settledAt)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">Pre-Payoff</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs text-[#6B7280] text-center font-['Outfit'] tabular-nums">
                    {formatFinancialDate(invoice.raisedAt)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="btn-financial-action text-[#042C53] bg-[#E6F1FB]/60 border-[#C7D2FE] hover:bg-[#E6F1FB]"
                      onClick={() => handleOpenView(invoice)}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" /> View Invoice
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Invoice Management</h1>
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">Track your commission claims, review statuses, and offline payout milestones.</p>
        </div>
        <div className="flex gap-3">
          <Button
            size="sm"
            onClick={() => setIsRaiseModalOpen(true)}
            className="inline-flex items-center text-xs font-semibold h-10 px-4 bg-[#042C53] hover:bg-[#03213F] text-white"
          >
            <FilePlus size={16} className="mr-2" /> Raise New Invoice
          </Button>
        </div>
      </div>

      {/* True Financial Lifecycle KPI Cards (FA-4.3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Invoices', val: stats.total, sub: 'All submitted claims', color: '#0C447C', highlight: false },
          { label: 'In Review', val: stats.inReviewCount, sub: 'Finance triage queue', color: '#1D4ED8', highlight: false },
          { label: 'Action Required', val: stats.actionRequiredCount, sub: 'Finance requested changes', color: '#B45309', highlight: stats.actionRequiredCount > 0 },
          { label: 'Pending Payout', val: formatCurrency(stats.pendingPayoutAmount), sub: `${stats.pendingPayoutCount} approved payoffs`, color: '#633806', highlight: false },
          { label: 'Total Settled', val: formatCurrency(stats.settledPayoutAmount), sub: `${stats.settledPayoutCount} offline payouts`, color: '#27500A', highlight: false }
        ].map((kpi, i) => (
          <Card key={i} className={`border-[#E5E7EB] bg-white shadow-none ${kpi.highlight ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-400/20' : ''}`}>
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-[#111827] mt-1 font-['Outfit'] tabular-nums">{kpi.val}</p>
              <p className="text-[10px] font-semibold mt-1" style={{ color: kpi.color }}>{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
        <Input
          placeholder="Search by invoice # or remarks..."
          className="pl-9 h-10 border-[#E5E7EB] text-sm focus-visible:ring-[#042C53]/10 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs Aligned to Financial Lifecycle (FA-4.3) */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-6 border-b border-[#E5E7EB] w-full justify-start rounded-none">
          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            All Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger
            value="action_required"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#B45309] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#B45309] transition-all capitalize flex items-center gap-1.5"
          >
            Action Required
            {stats.actionRequiredCount > 0 && (
              <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {stats.actionRequiredCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="in_review"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            In Review ({stats.inReviewCount})
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            Approved ({stats.approvedCount})
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            Rejected ({invoices.filter(i => i.financeReviewStatus === 'Rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <InvoiceList list={filteredInvoices} />
        </TabsContent>

        <TabsContent value="action_required" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.financeReviewStatus === 'CorrectionRequired')} />
        </TabsContent>

        <TabsContent value="in_review" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => ['PendingReview', 'Resubmitted', 'UnderReview'].includes(i.financeReviewStatus))} />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.financeReviewStatus === 'Approved')} />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.financeReviewStatus === 'Rejected')} />
        </TabsContent>
      </Tabs>

      {/* Invoice Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
          {selectedInvoice && (() => {
            const inv = selectedInvoice;
            const review = inv.financeReviewStatus || 'PendingReview';
            const payoff = selectedAssociatedPayoff;
            const money = (v) => formatCurrency(v, inv.currency);
            const hasAmount = Number(inv.amount) > 0;
            const applications = inv.applications || [];
            const Row = ({ label, children }) => (
              <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs font-semibold text-gray-900 text-right break-words">{children}</span>
              </div>
            );
            const summaries = {
              PendingReview: ['bg-gray-50 border-gray-200 text-gray-800', 'Your invoice has been submitted and is waiting in the Finance queue. Nothing more is needed from you right now.'],
              UnderReview: ['bg-indigo-50 border-indigo-200 text-indigo-900', 'Finance is checking your invoice right now. Nothing more is needed from you.'],
              Resubmitted: ['bg-blue-50 border-blue-200 text-blue-900', 'You resubmitted this invoice. Finance will review it again.'],
              CorrectionRequired: ['bg-amber-50 border-amber-300 text-amber-950', 'Finance needs a change before it can approve this invoice. Read their note below, reply, and resubmit.'],
              Approved: ['bg-emerald-50 border-emerald-200 text-emerald-900', payoff?.status === 'SETTLED'
                ? `Approved and paid. ${money(payoff.netAmount ?? payoff.grossCommission)} was transferred to you.`
                : 'Approved by Finance. Your commission will be paid by bank transfer, and you can follow it on the Payoffs page.'],
              Rejected: ['bg-red-50 border-red-200 text-red-900', 'Finance rejected this invoice. No commission will be paid for it. The reason is below.']
            };
            const [tone, summary] = summaries[review] || summaries.PendingReview;

            return (
              <div className="flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#042C53] px-6 py-5 text-white flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-lg font-bold font-['Outfit'] text-white">Invoice Details</DialogTitle>
                    <DialogDescription className="text-xs text-blue-200 mt-1">
                      <span className="font-mono">{inv.invoiceNumber}</span>
                      {inv.raisedAt && <> &middot; Submitted {formatFinancialDate(inv.raisedAt)}</>}
                    </DialogDescription>
                  </div>
                  <FinancialStatusBadge status={review} size="md" />
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto">
                  {/* Plain-language summary */}
                  <div className={`p-4 rounded-xl border text-sm leading-relaxed ${tone}`}>{summary}</div>

                  {/* Correction: finance note + agent reply */}
                  {review === 'CorrectionRequired' && (
                    <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">What Finance asked for</span>
                        <p className="text-xs text-amber-950 bg-white p-3 rounded-lg border border-amber-200 whitespace-pre-wrap leading-relaxed">
                          {inv.financeReviewNotes || inv.financeRejectionReason || inv.remarks || 'Finance asked for clarification on this claim.'}
                        </p>
                      </div>
                      {resubmitError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{resubmitError}</span>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label htmlFor="agentRemarksInput" className="text-xs font-bold text-amber-950 block">Your reply to Finance</Label>
                        <Textarea
                          id="agentRemarksInput"
                          rows={3}
                          value={agentCorrectionRemarks}
                          onChange={(e) => setAgentCorrectionRemarks(e.target.value)}
                          placeholder="Explain what you fixed or clarify the question..."
                          className="text-xs bg-white resize-none border-amber-300 focus-visible:ring-amber-500 rounded-lg p-3"
                        />
                        <p className="text-[11px] text-amber-800">Tuition amounts and the commission rate are set by QStudy and cannot be edited.</p>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleResubmit}
                          disabled={resubmitting}
                          className="h-9 px-5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {resubmitting ? 'Resubmitting...' : 'Resubmit to Finance'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Rejection reason */}
                  {review === 'Rejected' && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Reason for rejection</h3>
                      <div className="rounded-xl border border-red-200 bg-red-50/40 px-4 py-3 text-xs text-gray-800 space-y-1">
                        <p className="font-medium">{inv.financeRejectionReason || 'The invoice did not meet the requirements.'}</p>
                        {inv.financeReviewNotes && <p className="text-gray-600">{inv.financeReviewNotes}</p>}
                      </div>
                    </div>
                  )}

                  {/* Amount */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Your commission</h3>
                    <div className="rounded-xl border border-gray-200 px-4">
                      <Row label="Commission rate">{Number(inv.commissionRate) > 0 ? formatPercentage(inv.commissionRate) : 'Set by Finance on approval'}</Row>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm font-bold text-gray-900">Commission amount</span>
                        <span className="text-xl font-bold text-[#042C53] font-['Outfit'] tabular-nums">
                          {hasAmount ? money(inv.amount) : 'Not calculated yet'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment status */}
                  {review === 'Approved' && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Payment</h3>
                      <div className="rounded-xl border border-gray-200 px-4">
                        <Row label="Payoff number"><span className="font-mono">{payoff?.payoffNumber || 'Being prepared'}</span></Row>
                        <Row label="Status">
                          {payoff?.status === 'SETTLED' ? 'Paid' : payoff?.status === 'CANCELLED' ? 'Cancelled' : 'Waiting for bank transfer'}
                        </Row>
                        {payoff?.status === 'SETTLED' && (
                          <>
                            <Row label="Date paid">{payoff.settledAt ? formatFinancialDate(payoff.settledAt) : 'N/A'}</Row>
                            <Row label="Bank reference (UTR)"><span className="font-mono">{payoff.settlementReference || 'N/A'}</span></Row>
                          </>
                        )}
                      </div>
                      <Link to="/agent/payoffs" className="text-xs font-semibold text-[#042C53] hover:underline inline-block mt-2">
                        Go to Payoffs &rarr;
                      </Link>
                    </div>
                  )}

                  {/* What the invoice covers */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Students on this invoice</h3>
                    <div className="rounded-xl border border-gray-200 overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-[#F9FAFB]">
                          <TableRow>
                            <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 whitespace-nowrap">Student</TableHead>
                            <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 whitespace-nowrap">University / Course</TableHead>
                            <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 text-right whitespace-nowrap">Tuition</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications.length > 0 ? applications.map((app, idx) => {
                            const studentId = app.studentId || app.student?.id;
                            const universityId = app.universityId || app.university?.id;
                            return (
                              <TableRow key={app.id || idx} className="border-b border-[#F3F4F6] last:border-0">
                                <TableCell className="px-4 py-3 text-xs">
                                  {studentId ? (
                                    <Link to={`/agent/students/${studentId}`} className="font-semibold text-[#042C53] hover:underline block">
                                      {app.student?.name || 'Student'}
                                    </Link>
                                  ) : (
                                    <span className="font-semibold text-gray-900 block">{app.student?.name || 'Student'}</span>
                                  )}
                                  {app.id ? (
                                    <Link to={`/agent/applications/${app.id}`} className="text-[11px] text-blue-600 hover:underline">
                                      {app.applicationNumber}
                                    </Link>
                                  ) : (
                                    <span className="text-[11px] text-gray-500">{app.applicationNumber}</span>
                                  )}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-xs">
                                  {universityId ? (
                                    <Link to={`/agent/universities/${universityId}`} className="font-medium text-[#042C53] hover:underline block">
                                      {app.university?.name || 'University'}
                                    </Link>
                                  ) : (
                                    <span className="font-medium text-gray-900 block">{app.university?.name || 'University'}</span>
                                  )}
                                  <span className="text-[11px] text-gray-500">{app.courseName}</span>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-right text-xs font-bold text-gray-900 tabular-nums">
                                  {app.tuitionFee ? money(app.tuitionFee) : 'N/A'}
                                </TableCell>
                              </TableRow>
                            );
                          }) : (inv.studentIds || []).map((student, idx) => (
                            <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0">
                              <TableCell className="px-4 py-3 text-xs font-semibold text-gray-900">{student.name || 'Student'}</TableCell>
                              <TableCell className="px-4 py-3 text-xs text-gray-500">{student.email}</TableCell>
                              <TableCell className="px-4 py-3 text-right text-xs text-gray-500">N/A</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Remarks & document */}
                  {inv.remarks && review !== 'CorrectionRequired' && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Your remarks</h3>
                      <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700 whitespace-pre-wrap">{inv.remarks}</p>
                    </div>
                  )}
                  {inv.invoiceUrl && (
                    <a
                      href={inv.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs font-bold text-[#042C53] hover:underline"
                    >
                      <span>Attached invoice document</span>
                      <span className="flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Open</span>
                    </a>
                  )}

                  {/* History */}
                  {reviewHistory.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-gray-500" /> History
                      </h3>
                      <ul className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                        {reviewHistory.map((item, idx) => (
                          <li key={idx} className="flex items-start justify-between gap-3 px-4 py-2.5 text-xs">
                            <div>
                              <span className="font-semibold text-gray-900">{item.action}</span>
                              {item.notes && <p className="text-[11px] text-gray-600 mt-0.5">{item.notes}</p>}
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                              {item.changedAt ? formatFinancialDateTime(item.changedAt) : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setIsViewOpen(false)} className="h-9 px-5 text-xs font-bold">
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Raise Invoice Modal */}
      <InvoiceModal
        open={isRaiseModalOpen}
        onOpenChange={setIsRaiseModalOpen}
        onSuccess={fetchInvoices}
      />
    </div>
  );
};

export default InvoicesPage;
