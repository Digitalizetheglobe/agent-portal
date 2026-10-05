import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent } from '../../components/ui/dialog';
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
                    <span className="font-mono text-xs">{invoice.invoiceNumber}</span>
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
                    <FinancialStateHierarchy
                      reviewStatus={invoice.financeReviewStatus || 'PendingReview'}
                      payoffStatus={linkedPayoff?.status}
                      settledAt={linkedPayoff?.settledAt}
                      orientation="horizontal"
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {linkedPayoff ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <FinancialStatusBadge status={linkedPayoff.status} size="sm" />
                        <span className="text-[10px] text-gray-500 font-mono">{linkedPayoff.payoffNumber}</span>
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
          <InvoiceList list={filteredInvoices.filter(i => i.financeReviewStatus === 'Approved' || i.status === 'Paid')} />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.financeReviewStatus === 'Rejected')} />
        </TabsContent>
      </Tabs>

      {/* Invoice View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
          {selectedInvoice && (
            <div className="relative min-h-[600px] flex flex-col">
              {/* Header */}
              <div className="bg-[#042C53] p-8 text-white flex justify-between items-start">
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded-xl inline-block">
                    <img src="/assets/QStudylogo(blue).png" alt="QStudy" className="h-8 object-contain" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-['Outfit']">COMMISSION INVOICE</h2>
                    <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mt-1">Agency Settlement</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-bold">QStudy International</p>
                  <p className="text-[11px] text-blue-100">Partner Operations</p>
                  <p className="text-[11px] text-blue-100">finance@qstudy.edu</p>
                </div>
              </div>

              <div className="p-8 space-y-6 flex-1 max-h-[70vh] overflow-y-auto">
                {/* Status-specific Top LifeCycle Banners */}

                {/* 1. Correction Required Hero Banner */}
                {selectedInvoice.financeReviewStatus === 'CorrectionRequired' && (
                  <div className="p-5 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>ACTION REQUIRED: Finance Requested Corrections</span>
                      </div>
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        Action Needed
                      </Badge>
                    </div>

                    <div className="text-xs text-amber-950 bg-white/80 p-3.5 rounded-lg border border-amber-200 space-y-1">
                      <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] block">
                        Finance Review Instructions / Notes:
                      </span>
                      <p className="leading-relaxed whitespace-pre-wrap font-medium">
                        {selectedInvoice.financeReviewNotes || selectedInvoice.financeRejectionReason || selectedInvoice.remarks || 'Finance requested clarification on the submitted claim. Please update your response below and resubmit for review.'}
                      </p>
                    </div>

                    {resubmitError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{resubmitError}</span>
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <Label htmlFor="agentRemarksInput" className="text-xs font-bold text-amber-950 block">
                        Your Response / Clarification Memo for Finance:
                      </Label>
                      <Textarea
                        id="agentRemarksInput"
                        rows={3}
                        value={agentCorrectionRemarks}
                        onChange={(e) => setAgentCorrectionRemarks(e.target.value)}
                        placeholder="Explain the corrections made or clarify any discrepancies..."
                        className="text-xs bg-white resize-none border-amber-300 focus-visible:ring-amber-500 rounded-lg p-3"
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <p className="text-[11px] text-amber-800">
                          * Institutional commission rates and tuition values remain authoritative and locked.
                        </p>
                        <Button
                          size="sm"
                          onClick={handleResubmit}
                          disabled={resubmitting}
                          className="h-8 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm shrink-0 self-end sm:self-auto"
                        >
                          {resubmitting ? 'Resubmitting...' : 'Resubmit for Review'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Approved Commission Claim Card */}
                {selectedInvoice.financeReviewStatus === 'Approved' && (
                  <div className="p-5 bg-[#F4F9F2] border border-[#C0DD97] rounded-xl space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D8ECCE]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950">Approved Commission Claim</h4>
                          <p className="text-[11px] text-emerald-800 font-medium">Verified by Finance compliance and scheduled for offline settlement</p>
                        </div>
                      </div>
                      <FinancialStateHierarchy
                        reviewStatus="Approved"
                        payoffStatus={selectedAssociatedPayoff?.status}
                        settledAt={selectedAssociatedPayoff?.settledAt}
                        settlementReference={selectedAssociatedPayoff?.settlementReference}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white/90 p-3 rounded-lg border border-[#D8ECCE]">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Contractual Commission Rate</span>
                        <span className="text-base font-bold text-emerald-900 financial-numeral">
                          {formatPercentage(selectedInvoice.commissionRate)}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">Institutional verified rate</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-lg border border-[#D8ECCE]">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Approved Gross Amount</span>
                        <span className="text-base font-bold text-emerald-900 financial-numeral">
                          {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">Authoritative financial snapshot</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-lg border border-[#D8ECCE]">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Linked Payoff Stage</span>
                        <span className="text-xs font-mono font-bold text-gray-900 block truncate">
                          {selectedAssociatedPayoff?.payoffNumber || 'Payoff Pending'}
                        </span>
                        {selectedAssociatedPayoff?.status === 'SETTLED' ? (
                          <span className="text-[11px] font-semibold text-emerald-700 block mt-0.5">
                            Settled offline {selectedAssociatedPayoff.settledAt ? `on ${formatFinancialDate(selectedAssociatedPayoff.settledAt)}` : ''}
                            {selectedAssociatedPayoff.settlementReference ? ` • Ref: ${selectedAssociatedPayoff.settlementReference}` : ''}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-700 block mt-0.5">
                            Awaiting offline settlement confirmation
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Resubmitted Status Banner */}
                {selectedInvoice.financeReviewStatus === 'Resubmitted' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 shadow-sm">
                    <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-blue-900">Claim Resubmitted & Queued for Re-Review</h4>
                      <p className="text-xs text-blue-700 leading-relaxed font-medium">
                        Your corrections and response note have been registered. Institutional Finance will re-evaluate the claim against institutional records.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. Under Review Status Banner */}
                {selectedInvoice.financeReviewStatus === 'UnderReview' && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3 shadow-sm">
                    <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-indigo-900">Finance Review in Progress</h4>
                      <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                        Finance auditors are currently cross-checking student tuition deposits, verifying course completion milestones, and verifying commission eligibility.
                      </p>
                    </div>
                  </div>
                )}

                {/* 5. Pending Review Status Banner */}
                {selectedInvoice.financeReviewStatus === 'PendingReview' && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-3 shadow-sm">
                    <Clock className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-gray-900">Queued for Finance Review</h4>
                      <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        This invoice claim has been placed in the review queue. Finance will inspect student eligibility and assign the applicable contractual rate.
                      </p>
                    </div>
                  </div>
                )}

                {/* 6. Rejection Banner */}
                {selectedInvoice.financeReviewStatus === 'Rejected' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Claim Rejected by Finance</span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-lg border border-red-200 text-xs text-red-900 space-y-1">
                      <span className="font-bold block text-[10px] uppercase text-red-800 tracking-wider">Reason for Rejection:</span>
                      <p className="font-medium">{selectedInvoice.financeRejectionReason || 'Institutional criteria not met.'}</p>
                      {selectedInvoice.financeReviewNotes && (
                        <p className="text-[11px] text-red-700 italic pt-1 border-t border-red-100">
                          Notes: {selectedInvoice.financeReviewNotes}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Meta Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gray-50/70 p-5 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Invoice & Financial State</p>
                    <div className="mt-2 space-y-1.5">
                      <p className="text-sm font-bold text-[#111827] font-mono">{selectedInvoice.invoiceNumber}</p>
                      <p className="text-xs text-[#6B7280]">
                        Claim Date: {selectedInvoice.raisedAt ? formatFinancialDate(selectedInvoice.raisedAt) : 'N/A'}
                      </p>
                      <div className="pt-1">
                        <FinancialStateHierarchy
                          reviewStatus={selectedInvoice.financeReviewStatus}
                          payoffStatus={selectedAssociatedPayoff?.status}
                          settledAt={selectedAssociatedPayoff?.settledAt}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Payee Agency</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-bold text-[#111827]">{user?.name || selectedInvoice.agentId?.name}</p>
                      <p className="text-xs text-[#4B5563] font-semibold">{user?.agencyName || selectedInvoice.agentId?.agencyName}</p>
                      <p className="text-xs text-[#6B7280]">{user?.email || selectedInvoice.agentId?.email}</p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Total Settlement</p>
                    <div className="mt-2">
                      <p className="text-2xl font-bold text-[#042C53] font-['Outfit'] financial-numeral">
                        {selectedInvoice.amount > 0 ? (
                          formatCurrency(selectedInvoice.amount, selectedInvoice.currency)
                        ) : (
                          `${formatCurrency(0, selectedInvoice.currency)} (Pending)`
                        )}
                      </p>
                      <p className="text-[11px] font-semibold text-[#6B7280] mt-1">
                        Commission: {selectedInvoice.commissionRate > 0 ? formatPercentage(selectedInvoice.commissionRate) : 'Review Pending'}
                      </p>
                      {selectedAssociatedPayoff?.payoffNumber && (
                        <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                          Payoff: {selectedAssociatedPayoff.payoffNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Applications Breakdown */}
                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-[#F9FAFB]">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Application #</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Student Name</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">University & Course</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3 text-right">Commissionable Tuition</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.applications && selectedInvoice.applications.length > 0 ? (
                        selectedInvoice.applications.map((app, idx) => (
                          <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                            <TableCell className="px-6 py-3.5 text-xs font-bold text-[#111827] font-mono">
                              {app.applicationNumber}
                            </TableCell>
                            <TableCell className="px-6 py-3.5 text-xs text-[#4B5563]">
                              <span className="font-semibold text-gray-900 block">{app.student?.name || 'Student'}</span>
                              <span className="text-[11px] text-gray-500">{app.student?.email}</span>
                            </TableCell>
                            <TableCell className="px-6 py-3.5 text-xs text-[#4B5563]">
                              <span className="font-medium text-gray-900 block">{app.university?.name || 'University'}</span>
                              <span className="text-[11px] text-gray-500">{app.courseName}</span>
                            </TableCell>
                            <TableCell className="px-6 py-3.5 text-right text-xs font-bold text-gray-900 financial-numeral">
                              {app.tuitionFee ? formatCurrency(app.tuitionFee, selectedInvoice.currency) : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        selectedInvoice.studentIds?.map((student, idx) => (
                          <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0">
                            <TableCell className="px-6 py-3.5 text-xs font-bold text-[#111827] font-mono">LEGACY-CLAIM</TableCell>
                            <TableCell className="px-6 py-3.5 text-xs text-[#4B5563]">{student.name || 'Student'}</TableCell>
                            <TableCell className="px-6 py-3.5 text-xs text-[#4B5563]">{student.email}</TableCell>
                            <TableCell className="px-6 py-3.5 text-right text-xs font-bold text-gray-900">N/A</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Remarks & Document Link */}
                {selectedInvoice.remarks && (
                  <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Remarks</p>
                    <p className="text-xs text-[#4B5563] whitespace-pre-wrap">{selectedInvoice.remarks}</p>
                  </div>
                )}

                {selectedInvoice.invoiceUrl && (
                  <div className="flex items-center justify-between p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <span className="text-xs font-semibold text-[#042C53]">Attached Invoice Document</span>
                    <a
                      href={selectedInvoice.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#042C53] font-bold hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Uploaded Document
                    </a>
                  </div>
                )}

                {/* Review Audit History */}
                {reviewHistory.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-gray-500" /> Review Timeline
                    </span>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2.5 text-xs">
                      {reviewHistory.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between border-b border-gray-200/60 pb-2.5 last:border-0 last:pb-0">
                          <div className="space-y-0.5">
                            <span className="font-bold text-gray-900">{item.action}</span>
                            {item.notes && <p className="text-[11px] text-gray-600 font-medium leading-relaxed">{item.notes}</p>}
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-4">
                            {item.changedAt ? formatFinancialDateTime(item.changedAt) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center">
                <div className="text-[10px] text-[#9CA3AF] font-medium max-w-xs">
                  Institutional Settlement &bull; QStudy International Portal
                </div>
                <div className="flex items-center gap-2">
                  {selectedInvoice.financeReviewStatus === 'CorrectionRequired' && (
                    <Button
                      size="sm"
                      onClick={handleResubmit}
                      disabled={resubmitting}
                      className="h-9 px-5 text-xs font-bold bg-[#042C53] hover:bg-[#0C447C] text-white shadow-sm"
                    >
                      {resubmitting ? 'Resubmitting...' : 'Resubmit Invoice'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsViewOpen(false)}
                    className="h-9 px-6 text-xs font-bold"
                  >
                    Close View
                  </Button>
                </div>
              </div>
            </div>
          )}
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
