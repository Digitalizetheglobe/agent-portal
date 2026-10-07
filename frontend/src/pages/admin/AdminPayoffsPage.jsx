import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  ExternalLink,
  ShieldCheck,
  Building2,
  User,
  History,
  Receipt,
  Download,
  AlertCircle,
  Ban
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import PayoffSettlementModal from '../../components/modals/PayoffSettlementModal';
import { payoffAPI, invoiceReviewAPI, formatApiError } from '../../utils/api';
import { FinancialStatusBadge } from '../../components/common/FinancialStatusBadge';
import { formatCurrency, formatFinancialDate } from '../../utils/financialFormatters';
import { toast } from 'sonner';

const AdminPayoffsPage = () => {
  const { payoffs, fetchPayoffs, cancelPayoff, loading } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayoff, setSelectedPayoff] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  
  // Settle modal state
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [payoffToSettle, setPayoffToSettle] = useState(null);

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [payoffToCancel, setPayoffToCancel] = useState(null);
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [payoffDetail, setPayoffDetail] = useState(null);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (fetchPayoffs) {
      fetchPayoffs();
    }
  }, [fetchPayoffs]);

  const handleOpenSettlement = (payoff) => {
    setPayoffToSettle(payoff);
    setSettlementModalOpen(true);
  };

  const handleOpenCancel = (payoff) => {
    setPayoffToCancel(payoff);
    setCancelNotes('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!payoffToCancel?.id) return;
    setCancelling(true);
    try {
      if (cancelPayoff) {
        await cancelPayoff(payoffToCancel.id, { notes: cancelNotes.trim() || undefined });
      } else {
        await payoffAPI.cancel(payoffToCancel.id, { notes: cancelNotes.trim() || undefined });
        if (fetchPayoffs) await fetchPayoffs();
      }
      toast.success('Payoff cancelled successfully');
      setCancelModalOpen(false);
      setPayoffToCancel(null);
      if (selectedPayoff?.id === payoffToCancel.id) {
        setIsViewOpen(false);
      }
    } catch (err) {
      console.error('Cancel payoff error:', err);
      toast.error('Failed to cancel payoff', { description: formatApiError(err) });
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenView = async (payoff) => {
    setSelectedPayoff(payoff);
    setIsViewOpen(true);
    setReviewHistory([]);
    setPayoffDetail(null);
    payoffAPI.getById(payoff.id)
      .then(res => setPayoffDetail(res.data))
      .catch(err => console.error('Failed to load payoff detail:', err));
    const invoiceId = payoff.invoiceId?.id || payoff.invoiceId;
    if (invoiceId && typeof invoiceId === 'string') {
      setLoadingHistory(true);
      try {
        const res = await invoiceReviewAPI.getHistory(invoiceId);
        const data = Array.isArray(res.data) ? res.data : (res.data?.history || []);
        setReviewHistory(data);
      } catch (err) {
        console.error('Failed to load review history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const filteredPayoffs = useMemo(() => {
    return (payoffs || []).filter(p => {
      const term = searchTerm.toLowerCase();
      const pNum = p.payoffNumber?.toLowerCase() || '';
      const invNum = (p.invoiceId?.invoiceNumber || p.invoiceNumber || '')?.toLowerCase();
      const agentName = (p.agentId?.name || '')?.toLowerCase();
      const agencyName = (p.agentId?.agencyName || '')?.toLowerCase();
      const ref = (p.settlementReference || '')?.toLowerCase();
      return pNum.includes(term) || invNum.includes(term) || agentName.includes(term) || agencyName.includes(term) || ref.includes(term);
    });
  }, [payoffs, searchTerm]);

  const stats = useMemo(() => {
    const list = payoffs || [];
    const pending = list.filter(p => p.status === 'PENDING');
    const settled = list.filter(p => p.status === 'SETTLED');
    const cancelled = list.filter(p => p.status === 'CANCELLED');

    const totalVolume = list.reduce((sum, p) => sum + Number(p.netAmount || p.grossCommission || 0), 0);
    const pendingVolume = pending.reduce((sum, p) => sum + Number(p.netAmount || p.grossCommission || 0), 0);
    const settledVolume = settled.reduce((sum, p) => sum + Number(p.netAmount || p.grossCommission || 0), 0);

    return {
      total: list.length,
      totalVolume,
      pendingCount: pending.length,
      pendingVolume,
      settledCount: settled.length,
      settledVolume,
      cancelledCount: cancelled.length
    };
  }, [payoffs]);

  const getPayoffBadge = (status) => (
    <FinancialStatusBadge status={status || 'PENDING'} size="md" />
  );

  const PayoffTable = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider whitespace-nowrap">Payoff #</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider whitespace-nowrap">Invoice #</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider whitespace-nowrap">Payee / Agent</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider whitespace-nowrap">Gross Commission</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider whitespace-nowrap">Net Amount</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider whitespace-nowrap">Status</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider whitespace-nowrap">Settlement Details</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider whitespace-nowrap">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-20 text-[#6B7280]">
                <div className="flex flex-col items-center gap-3">
                  <CreditCard className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">No payoffs found in this view.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((payoff) => {
              const invoice = payoff.invoiceId || {};
              const agent = payoff.agentId || invoice.agentId || {};
              const isPending = payoff.status === 'PENDING';

              return (
                <TableRow key={payoff.id} className="hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0">
                  <TableCell className="px-6 py-4 font-bold text-[#111827]">
                    <span className="font-mono text-xs whitespace-nowrap">{payoff.payoffNumber}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold text-[#4B5563]">
                    <span className="whitespace-nowrap">{invoice.invoiceNumber || 'N/A'}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className="font-semibold text-[#111827] text-center truncate">{agent.agencyName || agent.name || 'Unknown agent'}</span>
                      <span className="text-[11px] text-[#6B7280] text-center truncate">{agent.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold text-[#4B5563] text-center font-['Outfit'] tabular-nums">
                    {formatCurrency(payoff.grossCommission, payoff.currency)}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-[#042C53] text-center font-['Outfit'] text-base tabular-nums">
                    {formatCurrency(payoff.netAmount || payoff.grossCommission, payoff.currency)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {getPayoffBadge(payoff.status)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs text-[#6B7280] text-center">
                    {payoff.status === 'SETTLED' ? (
                      <div>
                        <span className="font-mono text-[11px] text-gray-800 font-bold block">{payoff.settlementReference}</span>
                        <span className="text-[10px] text-gray-500 font-['Outfit'] tabular-nums">{formatFinancialDate(payoff.settledAt)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Not Settled</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            className="btn-financial-action text-white bg-[#27500A] hover:bg-[#1E3D07]"
                            onClick={() => handleOpenSettlement(payoff)}
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" /> Settle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="btn-financial-action text-red-700 border-red-200 hover:bg-red-50"
                            onClick={() => handleOpenCancel(payoff)}
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="btn-financial-action text-[#042C53] bg-[#E6F1FB]/60 border-[#C7D2FE] hover:bg-[#E6F1FB]"
                        onClick={() => handleOpenView(payoff)}
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1" /> Inspect
                      </Button>
                    </div>
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
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
            Payoff & Offline Settlement Queue
          </h1>
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">
            Authoritative financial settlement records for approved agent invoices. Record offline bank transfers.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Settlement', val: `$${(stats.pendingVolume / 1000).toFixed(1)}k`, sub: `${stats.pendingCount} pending payoffs`, color: '#633806' },
          { label: 'Settled Commission', val: `$${(stats.settledVolume / 1000).toFixed(1)}k`, sub: `${stats.settledCount} confirmed wire transfers`, color: '#27500A' },
          { label: 'Cancelled Payoffs', val: stats.cancelledCount, sub: 'Voided liabilities', color: '#791F1F' },
          { label: 'Total Volume', val: `$${(stats.totalVolume / 1000).toFixed(1)}k`, sub: `${stats.total} total payoffs`, color: '#111827' }
        ].map((kpi, i) => (
          <Card key={i} className="border-[#E5E7EB] bg-white shadow-none">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-[#111827] mt-1 font-['Outfit']">{kpi.val}</p>
              <p className="text-[10px] font-semibold mt-1" style={{ color: kpi.color }}>{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
        <Input
          placeholder="Search by payoff #, invoice #, agency, or UTR..."
          className="pl-9 h-10 border-[#E5E7EB] text-sm focus-visible:ring-[#042C53]/10 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-6 border-b border-[#E5E7EB] w-full justify-start rounded-none">
          <TabsTrigger
            value="pending"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#27500A] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#27500A] transition-all capitalize flex items-center gap-1.5"
          >
            Pending Settlement ({filteredPayoffs.filter(p => p.status === 'PENDING').length})
            {stats.pendingCount > 0 && (
              <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] px-1.5 py-0 font-bold">
                Action Required
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="settled"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            Settled Offline ({filteredPayoffs.filter(p => p.status === 'SETTLED').length})
          </TabsTrigger>
          <TabsTrigger
            value="cancelled"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            Cancelled ({filteredPayoffs.filter(p => p.status === 'CANCELLED').length})
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            All Payoffs ({filteredPayoffs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PayoffTable list={filteredPayoffs.filter(p => p.status === 'PENDING')} />
        </TabsContent>

        <TabsContent value="settled" className="mt-6">
          <PayoffTable list={filteredPayoffs.filter(p => p.status === 'SETTLED')} />
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          <PayoffTable list={filteredPayoffs.filter(p => p.status === 'CANCELLED')} />
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <PayoffTable list={filteredPayoffs} />
        </TabsContent>
      </Tabs>

      {/* Payoff Settlement Execution Modal */}
      <PayoffSettlementModal
        open={settlementModalOpen}
        onOpenChange={setSettlementModalOpen}
        payoff={payoffToSettle}
        onSuccess={fetchPayoffs}
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-700">
              <Ban className="w-5 h-5" />
              <DialogTitle className="text-lg font-bold">Cancel Payoff Liability</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-600 mt-1">
              Are you sure you want to void payoff <span className="font-mono font-bold text-gray-900">{payoffToCancel?.payoffNumber}</span>? This action is terminal and cannot be undone once confirmed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3">
            <Label htmlFor="cancelNotes" className="text-xs font-semibold text-gray-700">
              Cancellation Reason / Internal Memo
            </Label>
            <Textarea
              id="cancelNotes"
              rows={2}
              placeholder="e.g. Agency agreement revised, duplicate claim voided."
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.target.value)}
              className="text-xs bg-gray-50 resize-none"
            />
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
              disabled={cancelling}
              className="text-xs"
            >
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="text-xs bg-red-700 hover:bg-red-800 text-white font-semibold"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payoff Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
          {selectedPayoff && (() => {
            const p = payoffDetail || selectedPayoff;
            const agent = p.agent || p.agentId || {};
            const invoice = p.invoice || p.invoiceId || {};
            const snapshots = invoice.commissionSnapshots || [];
            const gross = Number(p.grossCommission || 0);
            const deductions = Number(p.deductions || 0);
            const net = Number(p.netAmount ?? gross - deductions);
            const money = (v) => formatCurrency(v, p.currency);
            const payee = agent.agencyName || agent.name || 'the agent';
            const Row = ({ label, children }) => (
              <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs font-semibold text-gray-900 text-right break-words">{children}</span>
              </div>
            );
            const summary = {
              PENDING: `Finance approved the invoice, so ${payee} is owed ${money(net)}. Pay them by bank transfer, then click "Mark as Paid" and enter the bank reference.`,
              SETTLED: `This payoff has been paid. ${money(net)} was transferred to ${payee}.`,
              CANCELLED: 'This payoff was cancelled. No money is owed and it can no longer be paid.'
            }[p.status] || '';
            const tone = {
              PENDING: 'bg-amber-50 border-amber-200 text-amber-900',
              SETTLED: 'bg-emerald-50 border-emerald-200 text-emerald-900',
              CANCELLED: 'bg-red-50 border-red-200 text-red-900'
            }[p.status] || 'bg-gray-50 border-gray-200 text-gray-800';

            return (
              <div className="flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#042C53] px-6 py-5 text-white flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-lg font-bold font-['Outfit'] text-white">Payoff Details</DialogTitle>
                    <DialogDescription className="text-xs text-blue-200 mt-1">
                      <span className="font-mono">{p.payoffNumber}</span> &middot; Invoice {invoice.invoiceNumber || 'N/A'}
                    </DialogDescription>
                  </div>
                  {getPayoffBadge(p.status)}
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto">
                  {/* Plain-language summary */}
                  <div className={`p-4 rounded-xl border text-sm leading-relaxed ${tone}`}>{summary}</div>

                  {/* Money */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Amount</h3>
                    <div className="rounded-xl border border-gray-200 px-4">
                      <Row label="Commission earned">{money(gross)}</Row>
                      <Row label="Deductions">{deductions > 0 ? `- ${money(deductions)}` : 'None'}</Row>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm font-bold text-gray-900">Amount to pay</span>
                        <span className="text-xl font-bold text-[#042C53] font-['Outfit'] tabular-nums">{money(net)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Who */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Pay to</h3>
                    <div className="rounded-xl border border-gray-200 px-4">
                      <Row label="Agency">{agent.agencyName || 'N/A'}</Row>
                      <Row label="Agent">{agent.name || 'N/A'}</Row>
                      <Row label="Email">{agent.email || 'N/A'}</Row>
                      {agent.phone && <Row label="Phone">{agent.phone}</Row>}
                    </div>
                  </div>

                  {/* Payment record */}
                  {p.status === 'SETTLED' && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Payment record</h3>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4">
                        <Row label="Bank reference (UTR)"><span className="font-mono">{p.settlementReference || 'N/A'}</span></Row>
                        <Row label="Date paid">{p.settledAt ? format(new Date(p.settledAt), 'dd MMM yyyy') : 'N/A'}</Row>
                        {p.batchReference && <Row label="Batch reference"><span className="font-mono">{p.batchReference}</span></Row>}
                        {p.settler?.name && <Row label="Recorded by">{p.settler.name}</Row>}
                        {p.settlementNotes && <Row label="Notes">{p.settlementNotes}</Row>}
                      </div>
                    </div>
                  )}
                  {p.status === 'CANCELLED' && p.settlementNotes && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Reason for cancelling</h3>
                      <p className="rounded-xl border border-red-200 bg-red-50/40 px-4 py-3 text-xs text-gray-800">{p.settlementNotes}</p>
                    </div>
                  )}

                  {/* What the commission is for */}
                  {snapshots.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">What this commission is for</h3>
                      <div className="rounded-xl border border-gray-200 overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-[#F9FAFB]">
                            <TableRow>
                              <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 whitespace-nowrap">Student</TableHead>
                              <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 whitespace-nowrap">University / Course</TableHead>
                              <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 text-right whitespace-nowrap">Tuition</TableHead>
                              <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 text-right whitespace-nowrap">Rate</TableHead>
                              <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 text-right whitespace-nowrap">Commission</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {snapshots.map((s) => (
                              <TableRow key={s.id} className="border-b border-[#F3F4F6] last:border-0">
                                <TableCell className="px-4 py-3 text-xs">
                                  {s.application?.student?.id ? (
                                    <Link to={`/admin/students/${s.application.student.id}`} className="font-semibold text-[#042C53] hover:underline block">
                                      {s.application.student.name || 'Student'}
                                    </Link>
                                  ) : (
                                    <span className="font-semibold text-gray-900 block">{s.application?.student?.name || 'Student'}</span>
                                  )}
                                  {s.application?.id ? (
                                    <Link to={`/admin/applications/${s.application.id}`} className="text-[11px] text-blue-600 hover:underline">
                                      {s.application.applicationNumber}
                                    </Link>
                                  ) : (
                                    <span className="text-[11px] text-gray-500">{s.application?.applicationNumber}</span>
                                  )}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-xs">
                                  {s.application?.university?.id ? (
                                    <Link to={`/admin/universities/${s.application.university.id}`} className="font-medium text-[#042C53] hover:underline block">
                                      {s.application.university.name || 'University'}
                                    </Link>
                                  ) : (
                                    <span className="font-medium text-gray-900 block">{s.application?.university?.name || 'University'}</span>
                                  )}
                                  <span className="text-[11px] text-gray-500">{s.application?.courseName}</span>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-right text-xs tabular-nums">{money(s.commissionableTuition)}</TableCell>
                                <TableCell className="px-4 py-3 text-right text-xs tabular-nums">{Number(s.commissionRate)}%</TableCell>
                                <TableCell className="px-4 py-3 text-right text-xs font-bold text-gray-900 tabular-nums">{money(s.grossAmount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* History */}
                  {reviewHistory.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-gray-500" /> Invoice history
                      </h3>
                      <ul className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                        {reviewHistory.map((item, idx) => (
                          <li key={idx} className="flex items-start justify-between gap-3 px-4 py-2.5 text-xs">
                            <div>
                              <span className="font-semibold text-gray-900">{item.action}</span>
                              {item.notes && <p className="text-[11px] text-gray-600 mt-0.5">{item.notes}</p>}
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                              {item.changedAt ? format(new Date(item.changedAt), 'dd MMM yyyy, HH:mm') : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setIsViewOpen(false)} className="h-9 px-5 text-xs font-bold">
                    Close
                  </Button>
                  {p.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-4 text-xs font-bold text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => handleOpenCancel(selectedPayoff)}
                      >
                        <Ban className="w-3.5 h-3.5 mr-1.5" /> Cancel payoff
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 px-4 text-xs font-bold text-white bg-[#27500A] hover:bg-[#1E3D07]"
                        onClick={() => {
                          setIsViewOpen(false);
                          handleOpenSettlement(selectedPayoff);
                        }}
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Mark as Paid
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayoffsPage;
