import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { hasStaffRole } from '../../utils/staffRoles';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
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
  const { user } = useAuth();
  // Reviewing and approving invoices belongs to the Head of Admission
  const canReview = hasStaffRole(user, 'head_admission');

  const [searchTerm, setSearchTerm] = useState('');
  // The selected section lives in the URL so a link or a refresh keeps it
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all';
  const setTab = (key) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('tab', key); return next; }, { replace: true });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const payoffFor = (inv) =>
    (payoffs || []).find(p => (p.invoiceId?._id || p.invoiceId?.id || p.invoiceId) === (inv._id || inv.id));

  // One plain-language status per invoice: where it is and who has to act next
  const getStage = (inv) => {
    const review = inv.financeReviewStatus || 'PendingReview';
    const payoff = payoffFor(inv);
    if (review === 'Rejected') {
      return { key: 'rejected', label: 'Rejected', hint: 'No commission payable', tone: 'bg-red-50 text-red-700 border-red-200' };
    }
    if (review === 'CorrectionRequired') {
      return { key: 'correction', label: 'Needs amendment', hint: 'Agent must amend and resubmit', tone: 'bg-amber-50 text-amber-800 border-amber-300' };
    }
    if (review === 'UnderReview') {
      return { key: 'under', label: 'Under review', hint: 'Audit in progress', tone: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
    }
    if (review === 'Approved') {
      if (payoff?.status === 'SETTLED') {
        return { key: 'paid', label: 'Paid to agent', hint: payoff.settledAt ? `Paid on ${formatFinancialDate(payoff.settledAt)}` : 'Settled', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      }
      const ready = payoff && (payoff.universityPaid || payoff.blockBypassed);
      return {
        key: 'approved',
        label: 'Approved',
        hint: !payoff ? 'Payment record being prepared' : ready ? 'Ready to pay the agent' : 'Waiting for the university to pay QStudy',
        tone: 'bg-blue-50 text-blue-800 border-blue-200'
      };
    }
    return {
      key: 'needs_review',
      label: 'Needs review',
      hint: review === 'Resubmitted' ? 'Agent resubmitted it' : 'New claim from an agent',
      tone: 'bg-blue-50 text-blue-800 border-blue-300'
    };
  };

  const counts = useMemo(() => {
    const c = { all: invoices.length, needs_review: 0, under: 0, correction: 0, approved: 0, paid: 0, rejected: 0 };
    let approvedAmount = 0;
    invoices.forEach((inv) => {
      const key = getStage(inv).key;
      c[key] += 1;
      if (key === 'approved') approvedAmount += Number(inv.amount) || 0;
    });
    return { ...c, approvedAmount };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, payoffs]);

  const tabs = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'needs_review', label: 'Needs review', count: counts.needs_review },
    { key: 'under', label: 'Under review', count: counts.under },
    { key: 'correction', label: 'Needs amendment', count: counts.correction },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'paid', label: 'Paid', count: counts.paid },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
  ];
  const visibleInvoices = filteredInvoices.filter((inv) => activeTab === 'all' || getStage(inv).key === activeTab);

  // The first thing anyone wants to know, before any detail
  const facts = [
    { label: 'Needs review', value: counts.needs_review, hint: counts.needs_review ? 'waiting for a decision' : 'all caught up', tab: 'needs_review', tone: counts.needs_review ? 'warn' : 'plain' },
    { label: 'With the agent', value: counts.correction, hint: 'amendment note sent', tab: 'correction', tone: 'plain' },
    { label: 'Approved, not paid', value: formatCurrency(counts.approvedAmount), hint: `${counts.approved} ${counts.approved === 1 ? 'invoice' : 'invoices'}`, tab: 'approved', tone: 'plain' },
    { label: 'Paid to agents', value: counts.paid, hint: counts.paid === 1 ? 'invoice settled' : 'invoices settled', tab: 'paid', tone: 'good' },
  ];

  const InvoiceList = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-x-auto shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3">Invoice</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3">Agent</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3 text-right">Amount</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3">Status</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3 text-right"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-16 text-[#6B7280]">
                <FileText size={40} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">{invoices.length === 0 ? 'No invoices have been raised yet.' : 'No invoices match this view.'}</p>
              </TableCell>
            </TableRow>
          ) : (
            list.map((invoice) => {
              const appCount = invoice.applications?.length || invoice.studentIds?.length || 0;
              const stage = getStage(invoice);
              const needsMyReview = canReview && ['needs_review', 'under'].includes(stage.key);
              const openView = () => { setSelectedInvoice(invoice); setIsViewOpen(true); };

              return (
                <TableRow key={invoice.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors cursor-pointer" onClick={openView}>
                  <TableCell className="px-5 py-4">
                    <span className="font-mono text-xs font-semibold text-[#111827] whitespace-nowrap block">{invoice.invoiceNumber}</span>
                    <span className="text-[11px] text-[#6B7280]">
                      {appCount} {appCount === 1 ? 'application' : 'applications'} &middot; raised {formatFinancialDate(invoice.raisedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className="text-sm font-semibold text-[#111827] block">{invoice.agentId?.agencyName || invoice.agentId?.name || 'Agency'}</span>
                    <span className="text-[11px] text-[#6B7280]">{invoice.agentId?.name}</span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right font-semibold text-[#111827] tabular-nums">
                    {invoice.amount > 0 ? (
                      formatCurrency(invoice.amount, invoice.currency)
                    ) : (
                      <span className="text-xs text-[#6B7280] font-medium">Not set yet</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${stage.tone}`}>{stage.label}</span>
                    <span className="block text-[11px] text-[#6B7280] mt-1">{stage.hint}</span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      {needsMyReview ? (
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-[#042C53] hover:bg-[#0C447C] text-white"
                          onClick={(e) => { e.stopPropagation(); openReviewModal(invoice.id); }}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Review
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); openView(); }}>
                          View
                        </Button>
                      )}
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
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-5" data-testid="admin-invoices-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] font-['Outfit']">Invoices</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Check agent commission claims and follow them until the agent is paid.</p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsRaiseModalOpen(true)}
          className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs h-9 px-4 gap-1.5 w-fit"
        >
          <Plus size={14} /> Raise Invoice
        </Button>
      </div>

      {/* Things that need attention come before anything else */}
      {canReview && counts.needs_review > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#B5D4F4] bg-[#E6F1FB] px-4 py-3 text-xs text-[#0C447C]">
          <span className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span><strong>{counts.needs_review}</strong> {counts.needs_review === 1 ? 'invoice is' : 'invoices are'} waiting for your review.</span>
          </span>
          <Button size="sm" variant="outline" className="h-8 text-xs border-[#0C447C]/30 text-[#0C447C]" onClick={() => setTab('needs_review')}>
            Show them
          </Button>
        </div>
      )}

      {/* Key facts */}
      <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="h-1.5 bg-[#042C53]" />
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {facts.map((fact) => (
              <button
                key={fact.label}
                type="button"
                onClick={() => setTab(fact.tab)}
                className="text-left rounded-xl border border-gray-100 bg-[#F9FAFB] p-3.5 hover:border-[#042C53]/30 hover:bg-white transition-colors"
              >
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{fact.label}</p>
                <p className={cn(
                  'text-xl font-bold mt-1 font-[\'Outfit\']',
                  fact.tone === 'warn' ? 'text-[#0C447C]' : fact.tone === 'good' ? 'text-[#27500A]' : 'text-[#042C53]'
                )}>
                  {fact.value}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">{fact.hint}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
        <Input
          placeholder="Search by invoice number, agent or remarks"
          className="pl-9 h-10 border-[#D1D5DB] text-sm bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Sections */}
      <div className="flex items-center gap-1 border-b border-[#D1D5DB] overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(tab.key)}
              className={cn(
                'flex items-center gap-2 py-3 px-4 -mb-px text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap rounded-t-lg',
                selected
                  ? 'border-[#0C447C] text-[#0C447C] bg-[#E6F1FB]'
                  : 'border-transparent text-[#374151] hover:text-[#111827] hover:bg-[#F3F4F6]'
              )}
            >
              {tab.label}
              <span className={cn(
                'px-1.5 py-0.5 text-[11px] font-mono rounded-full font-semibold',
                selected ? 'bg-[#0C447C] text-white' : 'bg-[#E5E7EB] text-[#374151]'
              )}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <InvoiceList list={visibleInvoices} />

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
                  {canReview && (
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
                  )}
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
