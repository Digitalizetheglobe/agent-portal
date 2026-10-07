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
  const { payoffs, fetchPayoffs, loading } = useData();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayoff, setSelectedPayoff] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (fetchPayoffs) {
      fetchPayoffs();
    }
  }, [fetchPayoffs]);

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

  const PayoffTable = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Payoff Ref #</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Invoice #</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Gross Commission</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Deductions</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Net Amount</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Settlement Status</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Settlement Details</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-20 text-[#6B7280]">
                <div className="flex flex-col items-center gap-3">
                  <CreditCard className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">No payoff records found in this view.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((payoff) => {
              const invoice = payoff.invoiceId || {};

              return (
                <TableRow key={payoff.id} className="hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0">
                  <TableCell className="px-6 py-4 font-bold text-[#111827]">
                    <span className="font-mono text-xs">{payoff.payoffNumber}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold text-[#4B5563]">
                    {invoice.invoiceNumber || 'N/A'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold text-[#4B5563] text-center font-['Outfit'] tabular-nums">
                    {formatCurrency(payoff.grossCommission, payoff.currency)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold text-[#4B5563] text-center font-['Outfit'] tabular-nums">
                    {formatCurrency(payoff.deductions || 0, payoff.currency)}
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
                      <span className="text-gray-400 italic">Pending Bank Transfer</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="btn-financial-action text-[#042C53] bg-[#E6F1FB]/60 border-[#C7D2FE] hover:bg-[#E6F1FB]"
                      onClick={() => handleOpenView(payoff)}
                    >
                      <Receipt className="w-3.5 h-3.5 mr-1" /> View Details
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
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
            Commission Payoff & Settlement Ledger
          </h1>
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">
            Track authorized payouts and verified bank wire settlements for your approved invoices.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Settled Payouts', val: `$${(stats.settledAmount / 1000).toFixed(1)}k`, sub: `${stats.settledCount} confirmed transfers`, color: '#27500A' },
          { label: 'Pending Settlement', val: `$${(stats.pendingAmount / 1000).toFixed(1)}k`, sub: `${stats.pendingCount} approved & queued`, color: '#633806' },
          { label: 'Total Volume', val: `$${(stats.totalEarnedAmount / 1000).toFixed(1)}k`, sub: `${stats.total} total payoffs`, color: '#0C447C' },
          { label: 'Cancelled Payoffs', val: stats.cancelledCount, sub: 'Voided records', color: '#791F1F' }
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
          placeholder="Search by payoff #, invoice #, or UTR..."
          className="pl-9 h-10 border-[#E5E7EB] text-sm focus-visible:ring-[#042C53]/10 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-6 border-b border-[#E5E7EB] w-full justify-start rounded-none">
          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            All Payoffs ({filteredPayoffs.length})
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#633806] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#633806] transition-all capitalize"
          >
            Pending Settlement ({filteredPayoffs.filter(p => p.status === 'PENDING').length})
          </TabsTrigger>
          <TabsTrigger
            value="settled"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#27500A] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#27500A] transition-all capitalize"
          >
            Settled ({filteredPayoffs.filter(p => p.status === 'SETTLED').length})
          </TabsTrigger>
          <TabsTrigger
            value="cancelled"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#791F1F] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#791F1F] transition-all capitalize"
          >
            Cancelled ({filteredPayoffs.filter(p => p.status === 'CANCELLED').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <PayoffTable list={filteredPayoffs} />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <PayoffTable list={filteredPayoffs.filter(p => p.status === 'PENDING')} />
        </TabsContent>

        <TabsContent value="settled" className="mt-6">
          <PayoffTable list={filteredPayoffs.filter(p => p.status === 'SETTLED')} />
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          <PayoffTable list={filteredPayoffs.filter(p => p.status === 'CANCELLED')} />
        </TabsContent>
      </Tabs>

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
                    ${Number(selectedPayoff.netAmount || 0).toLocaleString()}
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
                      {selectedPayoff.createdAt ? format(new Date(selectedPayoff.createdAt), 'MMMM dd, yyyy') : 'N/A'}
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
                        <span>{selectedPayoff.settledAt ? format(new Date(selectedPayoff.settledAt), 'MMMM dd, yyyy') : 'N/A'}</span>
                      </div>
                    </div>
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
                    <span className="text-xs font-bold text-gray-900 block">Enrolled Student Applications Linked to this Payoff</span>
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
