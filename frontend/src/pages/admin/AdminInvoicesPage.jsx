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
import { Link } from 'react-router-dom';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import InvoiceModal from '../../components/modals/InvoiceModal';
import FinanceReviewModal from '../../components/modals/FinanceReviewModal';
import { invoiceReviewAPI, formatApiError } from '../../utils/api';
import { FinancialStatusBadge, FinancialStateHierarchy } from '../../components/common/FinancialStatusBadge';
import {
  formatCurrency,
  formatFinancialDate,
  formatFinancialDateTime,
  formatPercentage
} from '../../utils/financialFormatters';
import { toast } from 'sonner';

const AdminInvoicesPage = () => {
  const { invoices, fetchInvoices, payoffs, fetchPayoffs, loading } = useData();

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
    if (fetchPayoffs) fetchPayoffs();
    if (fetchInvoices) fetchInvoices();
  }, []);

  const handleRefresh = async () => {
    await Promise.all([
      fetchInvoices ? fetchInvoices() : Promise.resolve(),
      fetchPayoffs ? fetchPayoffs() : Promise.resolve(),
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

  const openReviewModal = (invId) => {
    setReviewInvoiceId(invId);
    setReviewModalOpen(true);
  };

  // Authoritative payoff associated with the modal's selected invoice
  const selectedAssociatedPayoff = useMemo(() => {
    if (!selectedInvoice) return null;
    return (payoffs || []).find(
      p => (p.invoiceId?._id || p.invoiceId?.id || p.invoiceId) === (selectedInvoice?._id || selectedInvoice?.id)
    );
  }, [selectedInvoice, payoffs]);

  // Operational Lifecycle KPIs (FA-4.4)
  const stats = useMemo(() => {
    const total = invoices.length;
    // 1. Needs Review: PendingReview or Resubmitted
    const needsReviewInvoices = invoices.filter(i =>
      ['PendingReview', 'Resubmitted'].includes(i.financeReviewStatus)
    );
    // 2. Under Review: UnderReview
    const underReviewInvoices = invoices.filter(i => i.financeReviewStatus === 'UnderReview');
    // 3. Correction Active: CorrectionRequired
    const correctionInvoices = invoices.filter(i => i.financeReviewStatus === 'CorrectionRequired');
    // 4. Resolved: Approved or Rejected
    const approvedInvoices = invoices.filter(i => i.financeReviewStatus === 'Approved');
    const rejectedInvoices = invoices.filter(i => i.financeReviewStatus === 'Rejected');

    const approvedGrossTotal = approvedInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    return {
      total,
      needsReviewCount: needsReviewInvoices.length,
      underReviewCount: underReviewInvoices.length,
      correctionCount: correctionInvoices.length,
      approvedCount: approvedInvoices.length,
      rejectedCount: rejectedInvoices.length,
      approvedGrossTotal
    };
  }, [invoices]);

  const InvoiceList = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-x-auto shadow-sm">
      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Invoice #</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Agent / Agency</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Applications</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Gross Amount</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Financial Lifecycle</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Payoff Status</TableHead>
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
              const linkedPayoff = (payoffs || []).find(
                p => (p.invoiceId?._id || p.invoiceId?.id || p.invoiceId) === (invoice._id || invoice.id)
              );

              return (
                <TableRow key={invoice.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                  <TableCell className="px-4 py-4 font-bold text-[#111827] whitespace-nowrap">
                    <span className="font-mono text-xs">{invoice.invoiceNumber}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[#111827] truncate">{invoice.agentId?.agencyName || invoice.agentId?.name || 'Agency'}</span>
                      <span className="text-[11px] text-[#6B7280] truncate">{invoice.agentId?.name} &bull; {invoice.agentId?.email}</span>
                    </div>
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
                  <TableCell className="px-4 py-4 text-center whitespace-nowrap">
                    <FinancialStatusBadge status={invoice.financeReviewStatus || 'PendingReview'} size="sm" />
                  </TableCell>
                  <TableCell className="px-4 py-4 text-center whitespace-nowrap">
                    {linkedPayoff ? (
                      <div className="flex flex-col items-center gap-1">
                        <FinancialStatusBadge status={linkedPayoff.status} size="sm" />
                        <span className="text-[10px] text-gray-500 font-mono">{linkedPayoff.payoffNumber}</span>
                        {linkedPayoff.status === 'SETTLED' && linkedPayoff.settledAt && (
                          <span className="text-[10px] text-[#27500A] font-medium tabular-nums">
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
                    <div className="flex justify-center items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] font-bold text-[#042C53] bg-[#E6F1FB]/60 border-[#C7D2FE] hover:bg-[#E6F1FB] hover:text-[#042C53]"
                        onClick={() => openReviewModal(invoice.id)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Review
                      </Button>
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
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">Audit agent commission claims, assign contractual rates, and supervise institutional settlements.</p>
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

      {/* True Operational Lifecycle KPIs (FA-4.4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Invoices', val: stats.total, sub: 'All volume in portal', color: '#0C447C', highlight: false },
          { label: 'Needs Review', val: stats.needsReviewCount, sub: 'Pending triage / resubmitted', color: '#1D4ED8', highlight: stats.needsReviewCount > 0 },
          { label: 'Under Review', val: stats.underReviewCount, sub: 'Active audit in progress', color: '#4338CA', highlight: false },
          { label: 'Correction Active', val: stats.correctionCount, sub: 'Awaiting agent changes', color: '#B45309', highlight: stats.correctionCount > 0 },
          { label: 'Approved Claims', val: stats.approvedCount, sub: `${formatCurrency(stats.approvedGrossTotal)} gross payout`, color: '#27500A', highlight: false }
        ].map((kpi, i) => (
          <Card key={i} className={`border-[#E5E7EB] bg-white shadow-none ${kpi.highlight ? 'border-blue-400 bg-blue-50/20 ring-1 ring-blue-400/20' : ''}`}>
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-[#111827] mt-1 font-['Outfit'] tabular-nums">{kpi.val}</p>
              <p className="text-[10px] font-semibold mt-1" style={{ color: kpi.color }}>{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search by invoice #, agency, or remarks..."
            className="pl-9 h-10 border-[#E5E7EB] text-sm focus-visible:ring-[#042C53]/10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Unified Operational Lifecycle Tabs (FA-4.4) */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-6 border-b border-[#E5E7EB] w-full justify-start rounded-none">
          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
          >
            All Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger
            value="needs_review"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1D4ED8] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#1D4ED8] transition-all capitalize flex items-center gap-1.5"
          >
            Needs Review
            {stats.needsReviewCount > 0 && (
              <span className="bg-blue-100 text-blue-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {stats.needsReviewCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="under_review"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#4338CA] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#4338CA] transition-all capitalize"
          >
            Under Review ({stats.underReviewCount})
          </TabsTrigger>
          <TabsTrigger
            value="correction_active"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#B45309] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#B45309] transition-all capitalize flex items-center gap-1.5"
          >
            Correction Active
            {stats.correctionCount > 0 && (
              <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {stats.correctionCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#27500A] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#27500A] transition-all capitalize"
          >
            Approved ({stats.approvedCount})
          </TabsTrigger>
          <TabsTrigger
            value="rejected"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#791F1F] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#791F1F] transition-all capitalize"
          >
            Rejected ({stats.rejectedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <InvoiceList list={filteredInvoices} />
        </TabsContent>
        <TabsContent value="needs_review" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => ['PendingReview', 'Resubmitted'].includes(i.financeReviewStatus))} />
        </TabsContent>
        <TabsContent value="under_review" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.financeReviewStatus === 'UnderReview')} />
        </TabsContent>
        <TabsContent value="correction_active" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.financeReviewStatus === 'CorrectionRequired')} />
        </TabsContent>
        <TabsContent value="approved" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.financeReviewStatus === 'Approved')} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.financeReviewStatus === 'Rejected')} />
        </TabsContent>
      </Tabs>

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
                      <p className="text-3xl font-bold text-[#042C53] font-['Outfit'] tabular-nums">
                        {selectedInvoice.amount > 0 ? (
                          formatCurrency(selectedInvoice.amount, selectedInvoice.currency)
                        ) : (
                          `${formatCurrency(0, selectedInvoice.currency)} (Pending)`
                        )}
                      </p>
                      <p className="text-[10px] font-semibold text-[#6B7280] mt-1">
                        Commission Rate: {selectedInvoice.commissionRate > 0 ? formatPercentage(selectedInvoice.commissionRate) : 'Pending Determination'}
                      </p>
                      {selectedAssociatedPayoff?.payoffNumber && (
                        <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                          Payoff: {selectedAssociatedPayoff.payoffNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Applications Table */}
                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-[#F9FAFB]">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Application #</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Applicant / Student</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">University / Course</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3 text-right">Commissionable Tuition</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.applications && selectedInvoice.applications.length > 0 ? (
                        selectedInvoice.applications.map((app, idx) => (
                          <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                            <TableCell className="px-6 py-3.5 text-xs font-bold font-mono">
                              {app.id ? (
                                <Link to={`/admin/applications/${app.id}`} className="text-blue-600 hover:underline">
                                  {app.applicationNumber}
                                </Link>
                              ) : (
                                <span className="text-[#111827]">{app.applicationNumber}</span>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-3.5 text-xs text-[#4B5563]">
                              {(app.studentId || app.student?.id) ? (
                                <Link to={`/admin/students/${app.studentId || app.student.id}`} className="font-semibold text-[#042C53] hover:underline block">
                                  {app.student?.name || 'Applicant'}
                                </Link>
                              ) : (
                                <span className="font-semibold text-gray-900 block">{app.student?.name || 'Applicant'}</span>
                              )}
                              <span className="text-[11px] text-gray-500">{app.student?.email}</span>
                            </TableCell>
                            <TableCell className="px-6 py-3.5 text-xs text-[#4B5563]">
                              {(app.universityId || app.university?.id) ? (
                                <Link to={`/admin/universities/${app.universityId || app.university.id}`} className="font-medium text-[#042C53] hover:underline block">
                                  {app.university?.name || 'University'}
                                </Link>
                              ) : (
                                <span className="font-medium text-gray-900 block">{app.university?.name || 'University'}</span>
                              )}
                              <span className="text-[11px] text-gray-500">{app.courseName}</span>
                            </TableCell>
                            <TableCell className="px-6 py-3.5 text-right text-xs font-bold text-gray-900 tabular-nums">
                              {app.tuitionFee ? formatCurrency(app.tuitionFee, selectedInvoice.currency) : 'N/A'}
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
