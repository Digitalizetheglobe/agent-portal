import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  ExternalLink,
  Building2,
  User,
  History,
  AlertCircle,
  Receipt,
  ShieldCheck
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { payoffAPI, invoiceReviewAPI } from '../../utils/api';
import { FinancialStatusBadge } from '../../components/common/FinancialStatusBadge';
import { formatCurrency, formatFinancialDate } from '../../utils/financialFormatters';

const AgentPayoffsPage = () => {
  const { payoffs, viewPayoffSlip, loading } = useData();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedPayoff, setSelectedPayoff] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleOpenView = async (item) => {
    setSelectedPayoff(item);
    setIsViewOpen(true);
    setReviewHistory([]);
    const invoiceId = item.invoiceId?.id || item.invoiceId;
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
      const pNum = (p.payoffNumber || '').toLowerCase();
      const invNum = (p.invoiceId?.invoiceNumber || p.invoiceNumber || '').toLowerCase();
      const ref = (p.settlementReference || '').toLowerCase();
      return pNum.includes(term) || invNum.includes(term) || ref.includes(term);
    });
  }, [payoffs, searchTerm]);

  // Financial summary metrics derived from authoritative payoffs
  const stats = useMemo(() => {
    const list = payoffs || [];
    const pending = list.filter(p => p.status === 'PENDING');
    const settled = list.filter(p => p.status === 'SETTLED');
    const cancelled = list.filter(p => p.status === 'CANCELLED');

    const totalEarnedAmount = list.filter(p => p.status !== 'CANCELLED').reduce((sum, p) => sum + Number(p.netAmount || p.grossCommission || 0), 0);
    const settledAmount = settled.reduce((sum, p) => sum + Number(p.netAmount || p.grossCommission || 0), 0);
    const pendingAmount = pending.reduce((sum, p) => sum + Number(p.netAmount || p.grossCommission || 0), 0);

    return {
      total: list.length,
      totalEarnedAmount,
      settledCount: settled.length,
      settledAmount,
      pendingCount: pending.length,
      pendingAmount,
      cancelledCount: cancelled.length
    };
  }, [payoffs]);

  const getPayoffBadge = (status) => (
    <FinancialStatusBadge status={status || 'PENDING'} size="md" />
  );

  // One plain-language status per payoff: what is happening and what the agent should expect
  const getStage = (payoff) => {
    if (payoff.status === 'SETTLED') {
      return {
        key: 'settled',
        label: 'Paid',
        hint: payoff.settledAt ? `Paid on ${formatFinancialDate(payoff.settledAt)}` : 'Money sent to you',
        tone: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      };
    }
    if (payoff.status === 'CANCELLED') {
      return { key: 'cancelled', label: 'Cancelled', hint: 'Contact Finance if unsure why', tone: 'bg-red-50 text-red-700 border-red-200' };
    }
    return {
      key: 'pending',
      label: 'Waiting for payment',
      hint: payoff.universityPaid || payoff.blockBypassed
        ? 'QStudy Accounts is preparing your transfer'
        : 'Waiting for the university to pay QStudy',
      tone: 'bg-amber-50 text-amber-800 border-amber-300'
    };
  };

  const FILTERS = [
    { key: 'all', label: 'All', count: filteredPayoffs.length },
    { key: 'pending', label: 'Waiting for payment', count: filteredPayoffs.filter(p => p.status === 'PENDING').length },
    { key: 'settled', label: 'Paid', count: filteredPayoffs.filter(p => p.status === 'SETTLED').length },
    { key: 'cancelled', label: 'Cancelled', count: filteredPayoffs.filter(p => p.status === 'CANCELLED').length },
  ];
  const visiblePayoffs = filteredPayoffs.filter((p) => filter === 'all' || getStage(p).key === filter);

  const summaryCards = [
    { filter: 'settled', title: 'Paid to you', value: formatCurrency(stats.settledAmount), hint: `${stats.settledCount} bank ${stats.settledCount === 1 ? 'transfer' : 'transfers'} received`, valueTone: 'text-[#27500A]' },
    { filter: 'pending', title: 'Waiting for payment', value: formatCurrency(stats.pendingAmount), hint: `${stats.pendingCount} approved, not paid yet`, valueTone: 'text-[#0C447C]' },
    { filter: 'all', title: 'Total commission', value: formatCurrency(stats.totalEarnedAmount), hint: 'Paid and waiting, together', valueTone: 'text-[#111827]' },
  ];

  const PayoffTable = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3">Payment</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3 text-right">You receive</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3">Status</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3">Bank reference</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3 text-right"><span className="sr-only">Action</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-16 text-[#6B7280]">
                <div className="flex flex-col items-center gap-2">
                  <CreditCard className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">{(payoffs || []).length === 0 ? 'No payments yet.' : 'No payments match this view.'}</p>
                  {(payoffs || []).length === 0 && <p className="text-xs">When Finance approves an invoice, your payment appears here.</p>}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((payoff) => {
              const invoice = payoff.invoiceId || {};
              const stage = getStage(payoff);
              const deductions = Number(payoff.deductions || 0);

              return (
                <TableRow key={payoff.id} className="hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0 cursor-pointer" onClick={() => handleOpenView(payoff)}>
                  <TableCell className="px-5 py-4">
                    <span className="font-mono text-xs font-semibold text-[#111827] block">{payoff.payoffNumber}</span>
                    <span className="text-[11px] text-[#6B7280]">For invoice {invoice.invoiceNumber || 'N/A'}</span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <span className="font-semibold text-[#042C53] text-base tabular-nums block">
                      {formatCurrency(payoff.netAmount || payoff.grossCommission, payoff.currency)}
                    </span>
                    {deductions > 0 && (
                      <span className="text-[11px] text-[#6B7280]">after {formatCurrency(deductions, payoff.currency)} deducted</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${stage.tone}`}>{stage.label}</span>
                    <span className="block text-[11px] text-[#6B7280] mt-1">{stage.hint}</span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    {payoff.status === 'SETTLED' && payoff.settlementReference ? (
                      <span className="font-mono text-xs font-semibold text-[#111827]">{payoff.settlementReference}</span>
                    ) : (
                      <span className="text-[#9CA3AF]">Not available yet</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={(e) => { e.stopPropagation(); handleOpenView(payoff); }}
                    >
                      View
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
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Payments</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">See what QStudy has paid you and what is still on its way.</p>
      </div>

      {/* Summary: each card opens the matching list */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {summaryCards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => setFilter(card.filter)}
            className={`text-left rounded-xl border border-[#E5E7EB] bg-white p-4 transition-shadow hover:shadow-md ${filter === card.filter && card.filter !== 'all' ? 'ring-2 ring-[#0C447C]/40' : ''}`}
          >
            <p className="text-sm font-semibold text-[#374151]">{card.title}</p>
            <p className={`text-2xl font-bold mt-1 font-['Outfit'] tabular-nums ${card.valueTone}`}>{card.value}</p>
            <p className="text-xs text-[#6B7280] mt-1">{card.hint}</p>
          </button>
        ))}
      </div>

      {/* Filters + search */}
      <div className="space-y-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search by payment number, invoice number or bank reference"
            className="pl-9 h-10 border-[#D1D5DB] text-sm bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2" role="tablist">
          {FILTERS.map((f) => {
            const selected = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-semibold border transition-colors ${selected ? 'bg-[#0C447C] text-white border-[#0C447C]' : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F3F4F6]'}`}
              >
                {f.label}
                <span className={`text-[11px] font-mono px-1.5 rounded-full ${selected ? 'bg-white/20' : 'bg-[#E5E7EB]'}`}>{f.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <PayoffTable list={visiblePayoffs} />

      {/* Payoff Inspection Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
          {selectedPayoff && (
            <div className="relative min-h-[500px] flex flex-col">
              <div className="bg-[#042C53] p-8 text-white flex justify-between items-start">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-blue-200" />
                    <h2 className="text-2xl font-bold font-['Outfit']">COMMISSION PAYOFF</h2>
                  </div>
                  <p className="text-blue-100 text-xs font-medium">
                    Payoff Ref: <span className="font-mono font-bold text-white">{selectedPayoff.payoffNumber}</span> &bull; Invoice: {selectedPayoff.invoiceId?.invoiceNumber || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider block">Net Payoff Amount</span>
                  <span className="text-3xl font-bold font-['Outfit'] block mt-0.5">
                    {formatCurrency(selectedPayoff.netAmount || selectedPayoff.grossCommission, selectedPayoff.currency)}
                  </span>
                  <span className="text-[11px] text-blue-200 block">
                    Currency: {selectedPayoff.currency || 'USD'}
                  </span>
                </div>
              </div>

              <div className="p-8 space-y-6 flex-1 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Disbursement Status</span>
                    <div className="mt-1">{getPayoffBadge(selectedPayoff.status)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Created On</span>
                    <span className="text-xs font-bold text-gray-900 mt-1 block">
                      {selectedPayoff.createdAt ? formatFinancialDate(selectedPayoff.createdAt) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Status Notice */}
                {selectedPayoff.status === 'SETTLED' && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Confirmed Bank Wire Transfer
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-emerald-900 pt-1">
                      <div>
                        <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Bank Reference / UTR</span>
                        <span className="font-mono font-bold">{selectedPayoff.settlementReference}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Transfer Confirmation Date</span>
                        <span>{selectedPayoff.settledAt ? formatFinancialDate(selectedPayoff.settledAt) : 'N/A'}</span>
                      </div>
                    </div>
                    {selectedPayoff.paymentSlip && (
                      <button
                        type="button"
                        onClick={() => viewPayoffSlip(selectedPayoff.id)}
                        className="text-xs font-semibold text-emerald-900 underline underline-offset-2"
                      >
                        View payment slip
                      </button>
                    )}
                    {selectedPayoff.settlementNotes && (
                      <p className="text-xs text-emerald-800 pt-1 border-t border-emerald-200/60 mt-1 italic">
                        Memo: {selectedPayoff.settlementNotes}
                      </p>
                    )}
                  </div>
                )}

                {selectedPayoff.status === 'PENDING' && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" /> Queued for Bank Settlement
                    </span>
                    <p className="text-xs text-amber-800">
                      Your commission claim has been verified and approved by Finance. Offline disbursement will be processed and the bank transfer reference (UTR) will appear here once confirmed.
                    </p>
                  </div>
                )}

                {selectedPayoff.status === 'CANCELLED' && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-1">
                    <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600" /> Cancelled Payoff Record
                    </span>
                    <p className="text-xs text-red-800">
                      This payoff was voided. Please contact the finance desk if you require clarification.
                    </p>
                  </div>
                )}

                {/* Linked Invoice Applications Breakdown */}
                {selectedPayoff.invoiceId?.applications && selectedPayoff.invoiceId.applications.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-900 block">Student Applications Linked to this Payoff</span>
                    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-[#F9FAFB]">
                          <TableRow>
                            <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Application #</TableHead>
                            <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Student Name</TableHead>
                            <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">University & Course</TableHead>
                            <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3 text-right">Tuition Fee</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPayoff.invoiceId.applications.map((app, idx) => (
                            <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0">
                              <TableCell className="px-6 py-4 text-xs font-bold text-[#111827]">
                                {app.applicationNumber}
                              </TableCell>
                              <TableCell className="px-6 py-4 text-xs text-[#4B5563]">
                                <span className="font-semibold text-gray-900 block">{app.student?.name || 'Student'}</span>
                                <span className="text-[11px] text-gray-500">{app.student?.email}</span>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-xs text-[#4B5563]">
                                <span className="font-medium text-gray-900 block">{app.university?.name || 'University'}</span>
                                <span className="text-[11px] text-gray-500">{app.courseName}</span>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right text-xs font-bold text-gray-900">
                                {app.tuitionFee ? `$${Number(app.tuitionFee).toLocaleString()}` : 'Unknown'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center">
                <div className="text-[10px] text-[#9CA3AF] font-medium">
                  Authoritative Payoff Record &bull; QStudy International Portal
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsViewOpen(false)}
                  className="h-9 px-6 text-xs font-bold"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentPayoffsPage;
