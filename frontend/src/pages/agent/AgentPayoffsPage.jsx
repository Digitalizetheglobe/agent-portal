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
  ArrowRight,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '../../components/ui/input';
import { invoiceReviewAPI } from '../../utils/api';

const AgentPayoffsPage = () => {
  const { invoices, fetchInvoices } = useData();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayoff, setSelectedPayoff] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);

  useEffect(() => {
    if (fetchInvoices) {
      fetchInvoices();
    }
  }, [fetchInvoices]);

  const handleOpenView = async (item) => {
    setSelectedPayoff(item);
    setIsViewOpen(true);
    setReviewHistory([]);
    if (item.id) {
      try {
        const res = await invoiceReviewAPI.getHistory(item.id);
        const data = Array.isArray(res.data) ? res.data : (res.data?.history || []);
        setReviewHistory(data);
      } catch (err) {
        console.error('Failed to load review history:', err);
      }
    }
  };

  const filteredPayoffs = useMemo(() => {
    return invoices.filter(inv =>
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  // Financial summary metrics
  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'Paid');
    const eligible = invoices.filter(i => i.financeReviewStatus === 'Approved' && i.status !== 'Paid');
    const inReview = invoices.filter(i => (i.financeReviewStatus === 'PendingReview' || i.financeReviewStatus === 'UnderReview') && i.status !== 'Paid');
    const rejected = invoices.filter(i => i.financeReviewStatus === 'Rejected' || i.status === 'Rejected');

    const totalEarnedAmount = invoices.filter(i => i.status !== 'Rejected' && i.financeReviewStatus !== 'Rejected').reduce((sum, i) => sum + (i.amount || 0), 0);
    const paidAmount = paid.reduce((sum, i) => sum + (i.amount || 0), 0);
    const eligibleAmount = eligible.reduce((sum, i) => sum + (i.amount || 0), 0);
    const inReviewAmount = inReview.reduce((sum, i) => sum + (i.amount || 0), 0);

    return {
      total,
      totalEarnedAmount,
      paidCount: paid.length,
      paidAmount,
      eligibleCount: eligible.length,
      eligibleAmount,
      inReviewCount: inReview.length,
      inReviewAmount,
      rejectedCount: rejected.length
    };
  }, [invoices]);

  const getPayoffBadge = (invoice) => {
    if (invoice.status === 'Paid') {
      return (
        <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Settled / Paid
        </Badge>
      );
    }
    if (invoice.financeReviewStatus === 'Approved') {
      return (
        <Badge className="bg-[#E6F1FB] text-[#042C53] border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Ready for Payout
        </Badge>
      );
    }
    if (invoice.financeReviewStatus === 'UnderReview') {
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
          <Clock className="w-3 h-3 mr-1" /> In Review
        </Badge>
      );
    }
    if (invoice.financeReviewStatus === 'Rejected' || invoice.status === 'Rejected') {
      return (
        <Badge className="bg-[#FCEBEB] text-[#791F1F] border-[#F7C1C1] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
          <XCircle className="w-3 h-3 mr-1" /> Action Required
        </Badge>
      );
    }
    return (
      <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
        <Clock className="w-3 h-3 mr-1" /> Pending Review
      </Badge>
    );
  };

  const PayoffList = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Payoff Ref #</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Applications</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Commission Rate</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Payoff Amount</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Settlement Status</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Settlement / Paid Date</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-20 text-[#6B7280]">
                <div className="flex flex-col items-center gap-3">
                  <CreditCard className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">No payoff records found matching this view.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((inv) => {
              const appCount = inv.applications?.length || inv.studentIds?.length || 0;
              return (
                <TableRow key={inv.id} className="hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0">
                  <TableCell className="px-6 py-4 font-bold text-[#111827]">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span>{inv.invoiceNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold text-[#4B5563] text-center">
                    {appCount} {appCount === 1 ? 'Application' : 'Applications'}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-semibold text-[#111827] text-center">
                    {inv.commissionRate ? `${inv.commissionRate}%` : 'Pending'}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-[#042C53] text-center font-['Outfit'] text-base">
                    ${Number(inv.amount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {getPayoffBadge(inv)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs text-[#6B7280] text-center">
                    {inv.paidAt
                      ? format(new Date(inv.paidAt), 'MMM dd, yyyy')
                      : inv.raisedAt
                      ? format(new Date(inv.raisedAt), 'MMM dd, yyyy')
                      : 'Pending'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] font-bold text-[#042C53] bg-[#E6F1FB]/60 border-[#C7D2FE] hover:bg-[#E6F1FB]"
                      onClick={() => handleOpenView(inv)}
                    >
                      <Receipt className="w-3.5 h-3.5 mr-1" /> View Breakdown
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
            Payoff & Commission Management
          </h1>
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">
            Track earned student enrollment commissions, review eligibility, and payment settlements.
          </p>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Commission Earned', val: `$${(stats.totalEarnedAmount / 1000).toFixed(1)}k`, sub: `${stats.total} total claims`, color: '#0C447C' },
          { label: 'Settled Payouts', val: `$${(stats.paidAmount / 1000).toFixed(1)}k`, sub: `${stats.paidCount} successfully paid`, color: '#27500A' },
          { label: 'Ready for Payoff', val: `$${(stats.eligibleAmount / 1000).toFixed(1)}k`, sub: `${stats.eligibleCount} approved & queued`, color: '#042C53' },
          { label: 'In Finance Review', val: `$${(stats.inReviewAmount / 1000).toFixed(1)}k`, sub: `${stats.inReviewCount} awaiting approval`, color: '#633806' }
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
          placeholder="Search by payoff reference # or remarks..."
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
            value="settled"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            Settled / Paid ({filteredPayoffs.filter(i => i.status === 'Paid').length})
          </TabsTrigger>
          <TabsTrigger
            value="ready"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            Ready for Payoff ({filteredPayoffs.filter(i => i.financeReviewStatus === 'Approved' && i.status !== 'Paid').length})
          </TabsTrigger>
          <TabsTrigger
            value="inReview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            In Review ({filteredPayoffs.filter(i => (i.financeReviewStatus === 'PendingReview' || i.financeReviewStatus === 'UnderReview') && i.status !== 'Paid').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <PayoffList list={filteredPayoffs} />
        </TabsContent>

        <TabsContent value="settled" className="mt-6">
          <PayoffList list={filteredPayoffs.filter(i => i.status === 'Paid')} />
        </TabsContent>

        <TabsContent value="ready" className="mt-6">
          <PayoffList list={filteredPayoffs.filter(i => i.financeReviewStatus === 'Approved' && i.status !== 'Paid')} />
        </TabsContent>

        <TabsContent value="inReview" className="mt-6">
          <PayoffList list={filteredPayoffs.filter(i => (i.financeReviewStatus === 'PendingReview' || i.financeReviewStatus === 'UnderReview') && i.status !== 'Paid')} />
        </TabsContent>
      </Tabs>

      {/* Payoff Breakdown Inspection Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
          {selectedPayoff && (
            <div className="relative min-h-[560px] flex flex-col">
              {/* Header */}
              <div className="bg-[#042C53] p-8 text-white flex justify-between items-start">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-blue-200" />
                    <h2 className="text-2xl font-bold font-['Outfit']">COMMISSION SETTLEMENT</h2>
                  </div>
                  <p className="text-blue-100 text-xs font-medium">
                    Settlement Reference: <span className="font-mono font-bold text-white">{selectedPayoff.invoiceNumber}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider block">Net Settlement</span>
                  <span className="text-3xl font-bold font-['Outfit'] block mt-0.5">
                    ${Number(selectedPayoff.amount || 0).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-blue-200 block">
                    Commission Rate: {selectedPayoff.commissionRate ? `${selectedPayoff.commissionRate}%` : 'Pending Review'}
                  </span>
                </div>
              </div>

              <div className="p-8 space-y-6 flex-1 max-h-[70vh] overflow-y-auto">
                {/* Status Bar */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Current Payoff State</span>
                    <div className="mt-1">{getPayoffBadge(selectedPayoff)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Settlement Date</span>
                    <span className="text-xs font-bold text-gray-900 mt-1 block">
                      {selectedPayoff.paidAt ? format(new Date(selectedPayoff.paidAt), 'MMMM dd, yyyy') : 'Pending Payout Execution'}
                    </span>
                  </div>
                </div>

                {/* Settlement remarks / Transaction Reference */}
                {selectedPayoff.remarks && (
                  <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1">
                    <span className="text-xs font-bold text-[#042C53] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#042C53]" /> Settlement Transaction Reference & Remarks
                    </span>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{selectedPayoff.remarks}</p>
                  </div>
                )}

                {/* Applications Table */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-900 block">Enrolled Applications Breakdown</span>
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
                        {selectedPayoff.applications && selectedPayoff.applications.length > 0 ? (
                          selectedPayoff.applications.map((app, idx) => (
                            <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0">
                              <TableCell className="px-6 py-4 text-xs font-bold text-[#111827]">
                                {app.applicationNumber}
                              </TableCell>
                              <TableCell className="px-6 py-4 text-xs text-[#4B5563]">
                                <span className="font-semibold text-gray-900 block">{app.student?.name || 'Applicant'}</span>
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
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-xs text-gray-500">
                              Student applications recorded.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Review Audit Timeline */}
                {reviewHistory.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-gray-500" /> Settlement & Verification Timeline
                    </span>
                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
                      {reviewHistory.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between border-b border-gray-200/60 pb-2 last:border-0 last:pb-0">
                          <div>
                            <span className="font-bold text-gray-900">{item.action}</span>
                            {item.notes && <p className="text-[11px] text-gray-600 mt-0.5">{item.notes}</p>}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {item.changedAt ? new Date(item.changedAt).toLocaleString() : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center">
                <div className="text-[10px] text-[#9CA3AF] font-medium">
                  Authoritative Payoff Settlement Record &bull; QStudy Portal
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsViewOpen(false)}
                  className="h-9 px-6 text-xs font-bold bg-[#042C53] hover:bg-[#0C447C] text-white"
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
