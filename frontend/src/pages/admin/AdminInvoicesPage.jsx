import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Download,
  Plus,
  ShieldCheck,
  Building2,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import InvoiceModal from '../../components/modals/InvoiceModal';
import FinanceReviewModal from '../../components/modals/FinanceReviewModal';
import { invoiceReviewAPI, formatApiError } from '../../utils/api';
import { toast } from 'sonner';

const AdminInvoicesPage = () => {
  const { invoices, updateInvoiceStatus, fetchInvoices, loading } = useData();

  const [activeMainTab, setActiveMainTab] = useState('invoices'); // 'invoices' | 'reviewQueue'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Modals state
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewInvoiceId, setReviewInvoiceId] = useState(null);

  // Review queue data
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const loadReviewQueue = async () => {
    setLoadingReviews(true);
    try {
      const res = await invoiceReviewAPI.getAll({ all: 'true' });
      const reviews = Array.isArray(res.data) ? res.data : (res.data?.reviews || []);
      setReviewQueue(reviews);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadReviewQueue();
  }, []);

  const handleRefresh = async () => {
    await Promise.all([
      fetchInvoices ? fetchInvoices() : Promise.resolve(),
      loadReviewQueue()
    ]);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv =>
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.agentId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.agentId?.agencyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  const filteredReviews = useMemo(() => {
    return reviewQueue.filter(inv =>
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.agentId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.agentId?.agencyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reviewQueue, searchTerm]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateInvoiceStatus(id, { status });
      await handleRefresh();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const openReviewModal = (invId) => {
    setReviewInvoiceId(invId);
    setReviewModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'Pending':
        return <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'Rejected':
        return <Badge className="bg-[#FCEBEB] text-[#791F1F] border-[#F7C1C1] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">{status}</Badge>;
    }
  };

  const getReviewStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'UnderReview':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"><Clock className="w-3 h-3 mr-1" /> Under Review</Badge>;
      case 'Rejected':
        return <Badge className="bg-[#FCEBEB] text-[#791F1F] border-[#F7C1C1] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'PendingReview':
      default:
        return <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
    }
  };

  const stats = useMemo(() => {
    const total = invoices.length;
    const pending = invoices.filter(i => i.status === 'Pending');
    const paid = invoices.filter(i => i.status === 'Paid');
    const rejected = invoices.filter(i => i.status === 'Rejected');

    const pendingAmount = pending.reduce((sum, i) => sum + (i.amount || 0), 0);
    const paidAmount = paid.reduce((sum, i) => sum + (i.amount || 0), 0);

    const pendingReviewsCount = reviewQueue.filter(r => r.financeReviewStatus === 'PendingReview').length;
    const underReviewCount = reviewQueue.filter(r => r.financeReviewStatus === 'UnderReview').length;

    return {
      total,
      pendingCount: pending.length,
      pendingAmount,
      paidAmount,
      rejectedCount: rejected.length,
      pendingReviewsCount,
      underReviewCount
    };
  }, [invoices, reviewQueue]);

  const InvoiceList = ({ list, isReviewQueueView = false }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Invoice #</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Agent / Agency</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Applications</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Amount</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Finance Review</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Payment Status</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Raised Date</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-16 text-[#6B7280]">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p>No invoices found matching your criteria.</p>
              </TableCell>
            </TableRow>
          ) : (
            list.map((invoice) => {
              const appCount = invoice.applications?.length || invoice.studentIds?.length || 0;
              return (
                <TableRow key={invoice.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                  <TableCell className="px-6 py-4 font-bold text-[#111827]">
                    <div className="flex items-center gap-1.5">
                      <span>{invoice.invoiceNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col min-w-0 items-center">
                      <span className="font-semibold text-[#111827] text-center truncate">{invoice.agentId?.name || 'Agent'}</span>
                      <span className="text-[11px] text-[#6B7280] text-center truncate">{invoice.agentId?.agencyName || 'Agency'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-medium text-[#4B5563] text-center">
                    {appCount} {appCount === 1 ? 'Application' : 'Applications'}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-[#111827] text-center">
                    {invoice.amount > 0 ? `$${Number(invoice.amount).toLocaleString()}` : <span className="text-xs text-amber-600 font-medium">Pending Review</span>}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {getReviewStatusBadge(invoice.financeReviewStatus || 'PendingReview')}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {getStatusBadge(invoice.status || 'Pending')}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs text-[#6B7280] text-center">
                    {invoice.raisedAt ? format(new Date(invoice.raisedAt), 'MMM dd, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] font-bold text-[#042C53] bg-[#E6F1FB]/60 border-[#C7D2FE] hover:bg-[#E6F1FB] hover:text-[#042C53]"
                        onClick={() => openReviewModal(invoice.id)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Review
                      </Button>

                      {invoice.financeReviewStatus === 'Approved' && invoice.status === 'Pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] font-bold text-[#27500A] bg-[#EAF3DE] border-[#C0DD97] hover:bg-[#DCEFC0]"
                          onClick={() => handleUpdateStatus(invoice.id, 'Paid')}
                          disabled={loading}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pay
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[11px] font-semibold text-[#4B5563] hover:text-[#111827]"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setIsViewOpen(true);
                        }}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" /> View
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
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Financial & Invoice Management</h1>
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">Review agent invoices, conduct finance verifications, and settle commissions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => setIsRaiseModalOpen(true)}
            className="inline-flex items-center text-xs font-semibold h-10 px-4 bg-[#042C53] hover:bg-[#03213F] text-white"
          >
            <Plus size={14} className="mr-1.5" /> Raise Invoice
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Invoices', val: stats.total, sub: 'All volume', color: '#0C447C' },
          { label: 'Pending Reviews', val: stats.pendingReviewsCount, sub: `${stats.underReviewCount} in progress`, color: '#633806' },
          { label: 'Pending Payout', val: `$${(stats.pendingAmount / 1000).toFixed(1)}k`, sub: `${stats.pendingCount} unpaid`, color: '#0C447C' },
          { label: 'Total Settled', val: `$${(stats.paidAmount / 1000).toFixed(1)}k`, sub: 'Paid to agents', color: '#27500A' },
          { label: 'Rejected', val: stats.rejectedCount, sub: 'Needs correction', color: '#791F1F' }
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

      {/* Main Mode Toggle: Invoices vs Finance Review Queue */}
      <div className="flex border-b border-[#E5E7EB] gap-6">
        <button
          onClick={() => setActiveMainTab('invoices')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeMainTab === 'invoices'
              ? 'border-[#042C53] text-[#042C53]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <FileText className="w-4 h-4" /> All Invoices ({invoices.length})
        </button>

        <button
          onClick={() => setActiveMainTab('reviewQueue')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeMainTab === 'reviewQueue'
              ? 'border-[#042C53] text-[#042C53]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Finance Review Queue
          {stats.pendingReviewsCount > 0 && (
            <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] px-1.5 py-0 font-bold ml-1">
              {stats.pendingReviewsCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search by invoice #, agent, or remarks..."
            className="pl-9 h-10 border-[#E5E7EB] text-sm focus-visible:ring-[#042C53]/10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Tab 1: Invoices Directory */}
      {activeMainTab === 'invoices' && (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-transparent h-auto p-0 gap-6 border-b border-[#E5E7EB] w-full justify-start rounded-none">
            {['all', 'pending', 'paid', 'rejected'].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
              >
                {tab} Invoices
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <InvoiceList list={filteredInvoices} />
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <InvoiceList list={filteredInvoices.filter(i => i.status === 'Pending')} />
          </TabsContent>

          <TabsContent value="paid" className="mt-6">
            <InvoiceList list={filteredInvoices.filter(i => i.status === 'Paid')} />
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            <InvoiceList list={filteredInvoices.filter(i => i.status === 'Rejected')} />
          </TabsContent>
        </Tabs>
      )}

      {/* Main Tab 2: Finance Review Queue */}
      {activeMainTab === 'reviewQueue' && (
        <Tabs defaultValue="allReviews" className="w-full">
          <TabsList className="bg-transparent h-auto p-0 gap-6 border-b border-[#E5E7EB] w-full justify-start rounded-none">
            <TabsTrigger
              value="allReviews"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all"
            >
              All Reviews ({filteredReviews.length})
            </TabsTrigger>
            <TabsTrigger
              value="pendingReview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all"
            >
              Pending Review ({filteredReviews.filter(r => r.financeReviewStatus === 'PendingReview').length})
            </TabsTrigger>
            <TabsTrigger
              value="underReview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all"
            >
              Under Review ({filteredReviews.filter(r => r.financeReviewStatus === 'UnderReview').length})
            </TabsTrigger>
            <TabsTrigger
              value="approvedReviews"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all"
            >
              Approved ({filteredReviews.filter(r => r.financeReviewStatus === 'Approved').length})
            </TabsTrigger>
            <TabsTrigger
              value="rejectedReviews"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all"
            >
              Rejected ({filteredReviews.filter(r => r.financeReviewStatus === 'Rejected').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="allReviews" className="mt-6">
            <InvoiceList list={filteredReviews} isReviewQueueView={true} />
          </TabsContent>

          <TabsContent value="pendingReview" className="mt-6">
            <InvoiceList list={filteredReviews.filter(r => r.financeReviewStatus === 'PendingReview')} isReviewQueueView={true} />
          </TabsContent>

          <TabsContent value="underReview" className="mt-6">
            <InvoiceList list={filteredReviews.filter(r => r.financeReviewStatus === 'UnderReview')} isReviewQueueView={true} />
          </TabsContent>

          <TabsContent value="approvedReviews" className="mt-6">
            <InvoiceList list={filteredReviews.filter(r => r.financeReviewStatus === 'Approved')} isReviewQueueView={true} />
          </TabsContent>

          <TabsContent value="rejectedReviews" className="mt-6">
            <InvoiceList list={filteredReviews.filter(r => r.financeReviewStatus === 'Rejected')} isReviewQueueView={true} />
          </TabsContent>
        </Tabs>
      )}

      {/* Invoice Document View Modal */}
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
                    <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mt-1">Institutional Settlement</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-bold">QStudy International</p>
                  <p className="text-[11px] text-blue-100">Global Agent Operations</p>
                  <p className="text-[11px] text-blue-100">finance@qstudy.edu</p>
                </div>
              </div>

              <div className="p-8 space-y-8 flex-1">
                {/* Meta Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Invoice Details</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-bold text-[#111827]">{selectedInvoice.invoiceNumber}</p>
                      <p className="text-xs text-[#6B7280]">
                        {selectedInvoice.raisedAt ? format(new Date(selectedInvoice.raisedAt), 'MMMM dd, yyyy') : 'N/A'}
                      </p>
                      <div className="pt-2 flex flex-wrap gap-2">
                        {getStatusBadge(selectedInvoice.status)}
                        {getReviewStatusBadge(selectedInvoice.financeReviewStatus)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Billed To (Agent)</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-bold text-[#111827]">{selectedInvoice.agentId?.name || 'Agent'}</p>
                      <p className="text-xs text-[#4B5563] font-semibold">{selectedInvoice.agentId?.agencyName || 'Agency'}</p>
                      <p className="text-xs text-[#6B7280]">{selectedInvoice.agentId?.email}</p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Settlement Amount</p>
                    <div className="mt-2">
                      <p className="text-3xl font-bold text-[#042C53] font-['Outfit']">
                        {selectedInvoice.amount > 0 ? `$${Number(selectedInvoice.amount).toLocaleString()}` : '$0.00 (Pending)'}
                      </p>
                      <p className="text-[10px] font-semibold text-[#6B7280] mt-1">
                        Commission Rate: {selectedInvoice.commissionRate > 0 ? `${selectedInvoice.commissionRate}%` : 'Pending Determination'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Applications Table */}
                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#F9FAFB]">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Application #</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Applicant / Student</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">University / Course</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3 text-right">Tuition Fee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.applications && selectedInvoice.applications.length > 0 ? (
                        selectedInvoice.applications.map((app, idx) => (
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
                        selectedInvoice.studentIds?.map((student, idx) => (
                          <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0">
                            <TableCell className="px-6 py-4 text-sm font-bold text-[#111827]">LEGACY-APP</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-[#4B5563]">{student.name || 'Student'}</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-[#4B5563]">{student.email || 'N/A'}</TableCell>
                            <TableCell className="px-6 py-4 text-right text-sm font-bold text-gray-900">N/A</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {selectedInvoice.remarks && (
                  <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Remarks</p>
                    <p className="text-sm text-[#4B5563] italic">"{selectedInvoice.remarks}"</p>
                  </div>
                )}

                {selectedInvoice.invoiceUrl && (
                  <div className="flex items-center justify-between p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <span className="text-xs font-semibold text-[#042C53]">Attached Supporting Document</span>
                    <a
                      href={selectedInvoice.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#042C53] font-bold hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View PDF
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-8 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center">
                <div className="text-[10px] text-[#9CA3AF] font-medium max-w-xs">
                  This is an electronically generated institutional settlement document. QStudy Portal.
                </div>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsViewOpen(false);
                      openReviewModal(selectedInvoice.id);
                    }}
                    className="h-9 px-4 text-xs font-bold bg-[#042C53] hover:bg-[#0C447C] text-white"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Review Actions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsViewOpen(false)}
                    className="h-9 px-4 text-xs font-bold border-[#D1D5DB]"
                  >
                    Close
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
        onSuccess={handleRefresh}
      />

      {/* Finance Review Modal */}
      <FinanceReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        invoiceId={reviewInvoiceId}
        onSuccess={handleRefresh}
      />
    </div>
  );
};

export default AdminInvoicesPage;
