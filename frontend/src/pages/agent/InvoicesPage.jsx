import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../components/ui/dialog';
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
  const { invoices, fetchInvoices, payoffs, loading } = useData();
  const { user } = useAuth();

  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Correction and resubmission state
  const [agentCorrectionRemarks, setAgentCorrectionRemarks] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState('');

  // Unique student names covered by an invoice (from applications, falling back to studentIds)
  const getStudentNames = (inv) => {
    const fromApps = (inv.applications || []).map(a => a.student?.name).filter(Boolean);
    const names = fromApps.length > 0
      ? fromApps
      : (inv.studentIds || []).map(s => s?.name).filter(Boolean);
    return [...new Set(names)];
  };

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return invoices.filter(inv =>
      inv.invoiceNumber?.toLowerCase().includes(term) ||
      inv.remarks?.toLowerCase().includes(term) ||
      getStudentNames(inv).some(n => n.toLowerCase().includes(term))
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

  const payoffFor = (inv) =>
    (payoffs || []).find(p => (p.invoiceId?._id || p.invoiceId?.id || p.invoiceId) === (inv._id || inv.id));

  // One plain-language status per invoice: what is happening and whether the agent has to do anything
  const getStage = (inv) => {
    const review = inv.financeReviewStatus || 'PendingReview';
    const payoff = payoffFor(inv);
    // A problem invoice is never "rejected" to the agent: it needs an amendment, with a note
    if (review === 'CorrectionRequired' || review === 'Rejected') {
      return { key: 'amendment', label: 'Needs amendment', hint: 'See the note from Finance', tone: 'bg-amber-50 text-amber-800 border-amber-300' };
    }
    if (review === 'Approved') {
      if (payoff?.status === 'SETTLED') {
        return { key: 'paid', label: 'Invoice paid', hint: payoff.settledAt ? `Paid on ${formatFinancialDate(payoff.settledAt)}` : 'Money sent to you', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      }
      if (payoff?.universityPaid) {
        return { key: 'university', label: 'University payment received', hint: 'Your commission is being paid', tone: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      }
      return { key: 'processing', label: 'Invoice processing', hint: 'Waiting for the university payment', tone: 'bg-blue-50 text-blue-800 border-blue-200' };
    }
    return { key: 'submitted', label: 'Invoice submitted', hint: 'Received by QStudy', tone: 'bg-gray-50 text-gray-700 border-gray-200' };
  };

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'submitted', label: 'Invoice submitted' },
    { key: 'processing', label: 'Invoice processing' },
    { key: 'university', label: 'University payment received' },
    { key: 'paid', label: 'Invoice paid' },
    { key: 'amendment', label: 'Needs amendment' },
  ];
  const stageCounts = useMemo(() => {
    const counts = { all: invoices.length, submitted: 0, processing: 0, university: 0, paid: 0, amendment: 0 };
    invoices.forEach((inv) => { counts[getStage(inv).key] += 1; });
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, payoffs]);

  const visibleInvoices = filteredInvoices.filter((inv) => filter === 'all' || getStage(inv).key === filter);

  const summaryCards = [
    { filter: 'amendment', title: 'Needs amendment', value: stageCounts.amendment, hint: stageCounts.amendment ? 'Finance left a note for you' : 'Nothing to amend', tone: stageCounts.amendment ? 'border-amber-300 bg-amber-50' : 'border-[#E5E7EB] bg-white', valueTone: stageCounts.amendment ? 'text-amber-800' : 'text-[#111827]' },
    { filter: 'submitted', title: 'Invoice submitted', value: stageCounts.submitted, hint: 'Received by QStudy', tone: 'border-[#E5E7EB] bg-white', valueTone: 'text-[#111827]' },
    { filter: 'processing', title: 'Invoice processing', value: stageCounts.processing + stageCounts.university, hint: `${stageCounts.university} with university payment received`, tone: 'border-[#E5E7EB] bg-white', valueTone: 'text-[#0C447C]' },
    { filter: 'paid', title: 'Invoice paid', value: formatCurrency(stats.settledPayoutAmount), hint: `${stats.settledPayoutCount} paid by bank transfer`, tone: 'border-[#E5E7EB] bg-white', valueTone: 'text-[#27500A]' },
  ];

  const InvoiceList = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3">Invoice</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3">Students</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3 text-right">Your commission</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3">Status</TableHead>
            <TableHead className="text-xs text-[#374151] font-semibold px-5 py-3 text-right"><span className="sr-only">Action</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-16 text-[#6B7280]">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">{invoices.length === 0 ? 'You have not raised any invoice yet.' : 'No invoices match this view.'}</p>
                  {invoices.length === 0 && <p className="text-xs">Use "Raise New Invoice" to claim your commission.</p>}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((invoice) => {
              const appCount = invoice.applications?.length || invoice.studentIds?.length || 0;
              const studentNames = getStudentNames(invoice);
              const stage = getStage(invoice);

              return (
                <TableRow key={invoice.id} className="hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0 cursor-pointer" onClick={() => handleOpenView(invoice)}>
                  <TableCell className="px-5 py-4">
                    <span className="font-mono text-xs font-semibold text-[#111827] whitespace-nowrap block">{invoice.invoiceNumber}</span>
                    <span className="text-[11px] text-[#6B7280]">Raised {formatFinancialDate(invoice.raisedAt)}</span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    {studentNames.length > 0 ? (
                      <span className="font-medium text-[#111827]">
                        {studentNames.slice(0, 2).join(', ')}
                        {studentNames.length > 2 && <span className="text-[#6B7280]"> +{studentNames.length - 2} more</span>}
                      </span>
                    ) : (
                      <span className="text-[#6B7280]">{appCount} {appCount === 1 ? 'application' : 'applications'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right font-semibold text-[#111827] tabular-nums">
                    {invoice.amount > 0 ? (
                      formatCurrency(invoice.amount, invoice.currency)
                    ) : (
                      <span className="text-xs text-[#6B7280] font-medium">Finance will calculate</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${stage.tone}`}>{stage.label}</span>
                    <span className="block text-[11px] text-[#6B7280] mt-1">{stage.hint}</span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      variant={stage.key === 'action' ? 'default' : 'outline'}
                      className={stage.key === 'action' ? 'h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white' : 'h-8 text-xs'}
                      onClick={(e) => { e.stopPropagation(); handleOpenView(invoice); }}
                    >
                      {stage.key === 'action' ? 'Reply to Finance' : 'View'}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Invoices</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Claim your commission and follow it until it is paid.</p>
        </div>
        <Button
          onClick={() => setIsRaiseModalOpen(true)}
          className="inline-flex items-center text-sm font-semibold h-10 px-4 bg-[#042C53] hover:bg-[#03213F] text-white w-fit"
        >
          <FilePlus size={16} className="mr-2" /> Raise New Invoice
        </Button>
      </div>

      {/* Summary: four things an agent wants to know, each opens the matching list */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {summaryCards.map((card) => (
          <button
            key={card.filter}
            type="button"
            onClick={() => setFilter(card.filter)}
            className={`text-left rounded-xl border p-4 transition-shadow hover:shadow-md ${card.tone} ${filter === card.filter ? 'ring-2 ring-[#0C447C]/40' : ''}`}
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
            placeholder="Search by student, invoice number or remarks"
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
                <span className={`text-[11px] font-mono px-1.5 rounded-full ${selected ? 'bg-white/20' : 'bg-[#E5E7EB]'}`}>{stageCounts[f.key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <InvoiceList list={visibleInvoices} />

      {/* Invoice Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
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
              Rejected: ['bg-amber-50 border-amber-300 text-amber-950', 'This invoice needs an amendment. Read the note from Finance below.']
            };
            const [tone, summary] = summaries[review] || summaries.PendingReview;
            const studentNames = getStudentNames(inv);

            return (
              <div className="flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#042C53] px-6 py-5 text-white flex items-center justify-between gap-4">
                  <div className="bg-white p-2.5 rounded-xl shrink-0 hidden sm:block">
                    <img src="/assets/QStudylogo(blue).png" alt="QStudy" className="h-7 object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Invoice</p>
                    <DialogTitle className="text-xl font-bold font-mono text-white mt-0.5">{inv.invoiceNumber}</DialogTitle>
                    <DialogDescription className="text-xs text-blue-100 mt-1 truncate">
                      {studentNames.length > 0 ? `For ${studentNames.join(', ')}` : 'Commission claim'}
                    </DialogDescription>
                  </div>
                  <FinancialStatusBadge status={review} size="md" />
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto">
                  {/* Plain-language summary */}
                  <div className={`p-4 rounded-xl border text-sm leading-relaxed ${tone}`}>{summary}</div>

                  {/* Key facts */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Submitted on', value: inv.raisedAt ? formatFinancialDate(inv.raisedAt) : 'N/A' },
                      { label: 'Students', value: studentNames.length || applications.length || 0 },
                      { label: 'Commission rate', value: Number(inv.commissionRate) > 0 ? formatPercentage(inv.commissionRate) : 'Set on approval' },
                      { label: 'Your commission', value: hasAmount ? money(inv.amount) : 'Not calculated yet', strong: true }
                    ].map((f) => (
                      <div key={f.label} className="rounded-xl border border-gray-200 bg-[#F9FAFB] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{f.label}</p>
                        <p className={`mt-1 font-bold tabular-nums ${f.strong ? 'text-lg text-[#042C53]' : 'text-sm text-gray-900'}`}>{f.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Students & applications covered */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Students on this invoice</h3>
                    <div className="rounded-xl border border-gray-200 overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-[#F9FAFB]">
                          <TableRow>
                            <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 whitespace-nowrap">Student / Application</TableHead>
                            <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 whitespace-nowrap">University &amp; Course</TableHead>
                            <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-4 py-2.5 text-right whitespace-nowrap">Tuition Fee</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications.length > 0 ? applications.map((app, idx) => {
                            const studentId = app.studentId || app.student?.id;
                            const legacyStudent = (inv.studentIds || []).find(st => st?.id === studentId) || (inv.studentIds || [])[0];
                            const studentName = app.student?.name || legacyStudent?.name || 'Student';
                            const studentEmail = app.student?.email || legacyStudent?.email;
                            const universityId = app.universityId || app.university?.id;
                            return (
                              <TableRow key={app.id || idx} className="border-b border-[#F3F4F6] last:border-0 align-top">
                                <TableCell className="px-4 py-3 text-xs">
                                  {studentId ? (
                                    <Link to={`/agent/students/${studentId}`} className="text-sm font-semibold text-[#042C53] hover:underline block">
                                      {studentName}
                                    </Link>
                                  ) : (
                                    <span className="text-sm font-semibold text-gray-900 block">{studentName}</span>
                                  )}
                                  {studentEmail && <span className="text-[11px] text-gray-500 block">{studentEmail}</span>}
                                  {app.id ? (
                                    <Link to={`/agent/applications/${app.id}`} className="text-[11px] font-mono text-blue-600 hover:underline">
                                      {app.applicationNumber}
                                    </Link>
                                  ) : (
                                    <span className="text-[11px] font-mono text-gray-500">{app.applicationNumber}</span>
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
                                <TableCell className="px-4 py-3 text-right text-xs font-bold text-gray-900 tabular-nums whitespace-nowrap">
                                  {app.tuitionFee ? money(app.tuitionFee) : 'N/A'}
                                </TableCell>
                              </TableRow>
                            );
                          }) : (inv.studentIds || []).map((student, idx) => (
                            <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0 align-top">
                              <TableCell className="px-4 py-3 text-xs">
                                <span className="text-sm font-semibold text-gray-900 block">{student.name || 'Student'}</span>
                                {student.email && <span className="text-[11px] text-gray-500">{student.email}</span>}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-xs text-gray-400">&mdash;</TableCell>
                              <TableCell className="px-4 py-3 text-right text-xs text-gray-400">N/A</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

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
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Note from Finance</h3>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 text-xs text-gray-800 space-y-1">
                        <p className="font-medium">{inv.financeRejectionReason || 'The invoice did not meet the requirements.'}</p>
                        {inv.financeReviewNotes && <p className="text-gray-600">{inv.financeReviewNotes}</p>}
                      </div>
                    </div>
                  )}

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
