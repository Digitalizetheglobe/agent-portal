import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Mail,
  Phone,
  FileText,
  Eye,
  Check,
  X,
  GraduationCap,
  Compass,
  UserCheck,
  Building2,
  Globe,
  Search,
  ExternalLink,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Clock,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';
import AgentApplicationDetails from '../../components/agent/AgentApplicationDetails';
import AgentReviewDialog from '../../components/modals/AgentReviewDialog';
import ReviewActionButtons from '../../components/agent/ReviewActionButtons';
import AgentContractPanel from '../../components/agent/AgentContractPanel';
import UniversityAccessPanel, { getAccessLabel } from '../../components/agent/UniversityAccessPanel';
import {
  getOnboardingStatus,
  canReviewDocuments,
  getDocChecklist,
  hasSufficientDocs,
  HISTORY_LABELS,
  IN_REVIEW_STATUSES,
  getWaitingFor
} from '../../utils/onboarding';
import {
  getStudentStageInfo,
  getFunnelLabel,
  hasFeesPaid,
  isBeyondApplication,
  STUDENT_JOURNEY
} from '../../utils/studentProgress';
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_HEADINGS,
  DISPLAY_STAGE_INFO
} from '../../utils/pipeline';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return `$${Number(amount).toLocaleString('en-US')}`;
};

const docBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (['approved', 'verified'].includes(s)) return 'bg-[#EAF3DE] text-[#27500A]';
  if (s === 'rejected') return 'bg-[#FCEBEB] text-[#791F1F]';
  if (['pending', 'submitted'].includes(s)) return 'bg-[#FAEEDA] text-[#633806]';
  return 'bg-[#F3F4F6] text-[#4B5563]';
};

const SectionHeader = ({ title, hint }) => (
  <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2">
    <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">{title}</h3>
    {hint && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{hint}</p>}
  </div>
);

const getStudentName = (s) => {
  if (!s) return 'N/A';
  if (s.name && s.name !== 'N/A') return s.name;
  const cf = s.customFields || {};
  if (cf.name) return cf.name;
  const entries = cf instanceof Map ? Array.from(cf.entries()) : Object.entries(cf);
  for (const [k, v] of entries) {
    if (typeof v === 'string' && k.toLowerCase().includes('name')) return v;
  }
  return 'Student';
};

const AgentDetailPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    agents,
    fetchAgents,
    students,
    fetchStudents,
    invoices,
    fetchInvoices,
    viewAgentDocument,
    verifyAgent,
    reviewAgentOnboarding
  } = useData();
  const { user } = useAuth();
  const canReviewDocs = canReviewDocuments(user);
  const [reviewAction, setReviewAction] = useState(null);

  // Filter state for students tab
  const [studentSearch, setStudentSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Filter state for visa tracking tab
  const [visaStageFilter, setVisaStageFilter] = useState('all');

  // Load agents, students and invoices on mount
  useEffect(() => {
    fetchAgents();
    fetchStudents?.();
    fetchInvoices?.();
  }, [fetchAgents, fetchStudents, fetchInvoices]);

  const agent = useMemo(() => agents.find(a => a.id === agentId), [agents, agentId]);

  // Tab management (query parameter sync)
  const activeTab = searchParams.get('tab') || (agent?.status === 'active' ? 'students' : 'profile');

  const setTab = (tabName) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabName);
      return next;
    });
  };

  // Filtered Students for this agent
  const agentStudents = useMemo(() => {
    if (!agent) return [];
    return students.filter(s => (s.agentId?.id || s.agentId?._id || s.agentId) === agent.id);
  }, [students, agent]);

  // Filtered Invoices for this agent
  const agentInvoices = useMemo(() => {
    if (!agent) return [];
    return invoices.filter(inv => (inv.agentId?.id || inv.agentId?._id || inv.agentId) === agent.id);
  }, [invoices, agent]);

  // Tab 1: Filtered student rows
  const displayedStudents = useMemo(() => {
    return agentStudents.filter(s => {
      const q = studentSearch.toLowerCase().trim();
      const sName = getStudentName(s).toLowerCase();
      const sEmail = (s.email || '').toLowerCase();
      const sUniv = (s.university || s.universityName || '').toLowerCase();
      const matchesSearch = !q || sName.includes(q) || sEmail.includes(q) || sUniv.includes(q);

      const sStage = s.pipelineStage || 'Application';
      const matchesStage = stageFilter === 'all' || sStage === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [agentStudents, studentSearch, stageFilter]);

  // Tab 3: Visa stage distribution
  const visaCounts = useMemo(() => {
    const counts = {};
    PIPELINE_STAGES.forEach(st => { counts[st] = 0; });
    agentStudents.forEach(s => {
      const st = s.pipelineStage || 'Application';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [agentStudents]);

  // Tab 3: Visa filtered students
  const visaStudents = useMemo(() => {
    if (visaStageFilter === 'all') return agentStudents;
    return agentStudents.filter(s => (s.pipelineStage || 'Application') === visaStageFilter);
  }, [agentStudents, visaStageFilter]);

  // Invoices summary metrics
  const invoiceMetrics = useMemo(() => {
    const total = agentInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    const paid = agentInvoices
      .filter(inv => (inv.status || '').toLowerCase() === 'paid')
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    const pending = total - paid;
    return { total, paid, pending, count: agentInvoices.length };
  }, [agentInvoices]);

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 font-medium">Agent not found or data still loading...</p>
        <Button onClick={() => navigate('/admin/agents')}>Back to Agents</Button>
      </div>
    );
  }

  const isVerified = agent.isVerified || agent.verificationStatus === 'approved';
  const docs = agent.verificationDocuments || [];
  const status = getOnboardingStatus(agent);
  const inReview = IN_REVIEW_STATUSES.includes(agent.onboardingStatus);
  const missing = getDocChecklist(agent).filter(c => !c.doc);

  const reviewDocument = async (doc, documentStatus) => {
    let remarks;
    if (documentStatus === 'rejected') {
      remarks = window.prompt('Reason for rejecting this document:');
      if (!remarks) return;
    }
    try {
      await verifyAgent(agent.id, { documentId: doc.id || doc._id, documentStatus, remarks });
      toast.success(`Document ${documentStatus}`, { description: doc.docType });
    } catch {
      // error toast already shown
    }
  };

  // The facts anyone opening an agent needs first: who they are, how to reach them, who looks after them
  const keyFacts = [
    ['Agency', agent.agencyName || agent.name],
    ['Agent type', agent.agentType ? agent.agentType.charAt(0).toUpperCase() + agent.agentType.slice(1) : null],
    ['Contact person', [agent.contactPerson, agent.contactDesignation].filter(Boolean).join(' · ')],
    ['Email', agent.email],
    ['Phone', agent.phone],
    ['Account manager', agent.accountManager?.name || 'Unassigned'],
    ['Country / Region', [agent.country, agent.region].filter(Boolean).join(' / ')],
    ['Registration #', agent.businessRegistrationNumber],
    ['Joined', agent.createdAt ? formatDate(agent.createdAt) : null],
    ['Address', agent.fullAddress, true],
  ];

  return (
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen font-['Inter']">
      <button
        onClick={() => navigate('/admin/agents')}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#042C53] hover:underline mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </button>

      {/* ── Top Header: Agent Identity ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">{agent.name}</h1>
            {agent.agentCode && (
              <span className="text-xs font-mono font-semibold text-[#0C447C] bg-[#E6F1FB] px-2 py-0.5 rounded border border-[#0C447C]/20">
                {agent.agentCode}
              </span>
            )}
            <Badge className={cn('border-none text-[10px] font-medium h-5', agent.status === 'active' ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-[#F3F4F6] text-[#4B5563]')}>
              {agent.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
            <Badge className="border-none text-[10px] font-medium h-5 bg-[#EEEDFE] text-[#3C3489]">
              Access: {getAccessLabel(agent)}
            </Badge>
          </div>
          <p className="text-sm text-[#6B7280] mt-1 flex items-center gap-2">
            <span>{agent.agencyName || 'Independent agent'}</span>
            {agent.country && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Globe className="w-3.5 h-3.5 text-slate-400" /> {agent.country}
                </span>
              </>
            )}
            {agent.accountManager && (
              <>
                <span>·</span>
                <span className="text-xs bg-purple-50 text-purple-700 font-medium px-2 py-0.5 rounded">
                  AM: {agent.accountManager.name}
                </span>
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-xs text-[#111827]">
            <span className="flex items-center gap-1.5 break-all"><Mail className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" /> {agent.email}</span>
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" /> {agent.phone || 'No phone'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/agents/${agent.id}/report`)}
            className="h-9 px-3.5 text-xs font-semibold border-slate-200 bg-white"
          >
            <BarChart3 className="w-4 h-4 mr-1.5" /> Performance Report
          </Button>
        </div>
      </div>

      {/* ── Status & Onboarding Banner (if pending review) ── */}
      {(!isVerified || inReview) && (
        <Card className="border-[#E5E7EB] shadow-none bg-white mb-5 p-4 space-y-3" data-testid="onboarding-review-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge className={cn('border-none text-xs font-medium h-6', status.style)}>
                {isVerified ? 'Verified' : status.label}
              </Badge>
              <p className="text-sm text-[#4B5563]">{getWaitingFor(agent)}</p>
            </div>
            <ReviewActionButtons agent={agent} onOpenDialog={setReviewAction} />
          </div>
          {['rejected', 'correction_required'].includes(agent.onboardingStatus) && agent.verificationRemarks && (
            <div className={cn('text-sm border p-3 rounded-lg', agent.onboardingStatus === 'rejected' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-orange-50 border-orange-100 text-orange-900')}>
              <span className="font-semibold">{agent.onboardingStatus === 'rejected' ? 'Reason for rejection: ' : 'Changes requested: '}</span>
              {agent.verificationRemarks}
            </div>
          )}
        </Card>
      )}

      {/* ── Navigation Tabs: Students Inside Agents (Vijay requirement) ── */}
      <div className="flex items-center gap-1.5 border-b border-[#E5E7EB] mb-6 overflow-x-auto">
        <button
          onClick={() => setTab('students')}
          className={cn(
            "flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
            activeTab === 'students'
              ? "border-[#0C447C] text-[#0C447C] bg-white rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          )}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Students</span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-slate-100 text-slate-700 font-semibold">
            {agentStudents.length}
          </span>
        </button>

        <button
          onClick={() => setTab('invoices')}
          className={cn(
            "flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
            activeTab === 'invoices'
              ? "border-[#0C447C] text-[#0C447C] bg-white rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Invoices</span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-slate-100 text-slate-700 font-semibold">
            {agentInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setTab('visa')}
          className={cn(
            "flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
            activeTab === 'visa'
              ? "border-[#0C447C] text-[#0C447C] bg-white rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          )}
        >
          <Compass className="w-4 h-4" />
          <span>Visa Tracking</span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-indigo-50 text-indigo-700 font-semibold">
            {agentStudents.filter(isBeyondApplication).length}
          </span>
        </button>

        <button
          onClick={() => setTab('profile')}
          className={cn(
            "flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
            activeTab === 'profile'
              ? "border-[#0C447C] text-[#0C447C] bg-white rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
          )}
        >
          <UserCheck className="w-4 h-4" />
          <span>Profile & Verification</span>
          {docs.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-emerald-50 text-emerald-700 font-semibold">
              {docs.length} docs
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: STUDENTS ── */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-['Outfit']">{agentStudents.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">All student applications</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Visa Process</p>
              <p className="text-2xl font-bold text-[#534AB7] mt-1 font-['Outfit']">
                {agentStudents.filter(s => ['Visa15', 'Visa35', 'Visa70', 'Arrival', 'Medical', 'Registration'].includes(s.pipelineStage)).length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">15% through Registration</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fees Paid</p>
              <p className="text-2xl font-bold text-[#047857] mt-1 font-['Outfit']">
                {agentStudents.filter(hasFeesPaid).length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Tuition verified</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Visa 100%</p>
              <p className="text-2xl font-bold text-[#0C447C] mt-1 font-['Outfit']">
                {agentStudents.filter(s => s.pipelineStage === 'Visa100').length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Commission eligible</p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students by name, email, or university..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0C447C]"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#0C447C]"
              >
                <option value="all">All Visa Stages</option>
                {PIPELINE_STAGES.map(stage => (
                  <option key={stage} value={stage}>
                    {PIPELINE_STAGE_LABELS[stage] || stage} ({visaCounts[stage] || 0})
                  </option>
                ))}
              </select>
              {(studentSearch || stageFilter !== 'all') && (
                <button
                  onClick={() => { setStudentSearch(''); setStageFilter('all'); }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline px-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Students Table */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Student Name</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">University & Course</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Visa Stage</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Fees Paid</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Applied Date</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                        <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-semibold text-slate-700">No students found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {agentStudents.length === 0
                            ? 'This agent has not registered any students yet.'
                            : 'No students match your search criteria.'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedStudents.map((st) => {
                      const stageInfo = getStudentStageInfo(st);
                      const sName = getStudentName(st);
                      return (
                        <TableRow key={st.id || st._id} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="py-3">
                            <div className="font-semibold text-xs text-slate-900">{sName}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">{st.email || 'No email provided'}</div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="font-medium text-xs text-slate-800">{st.university || st.universityName || '—'}</div>
                            <div className="text-[11px] text-slate-500">{st.course || st.courseInterested || '—'}</div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge className={cn('border-none text-[10px] h-5 font-semibold', stageInfo.style)}>
                              {stageInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            {hasFeesPaid(st) ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#047857]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Pending</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-xs text-slate-600">
                            {formatDate(st.createdAt || st.submittedAt)}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Link
                              to={`/admin/students/${st.id || st._id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0C447C] hover:underline"
                            >
                              View <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: INVOICES ── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Milestone Pipeline Flow Notice (Vijay requirement) */}
          <div className="bg-[#E6F1FB]/60 border border-[#B5D4F4] rounded-xl p-4">
            <h4 className="text-xs font-bold text-[#0C447C] uppercase tracking-wider mb-2">
              Invoice Progression Pipeline
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#0C447C]">
              <span className="px-2.5 py-1 rounded bg-white font-semibold shadow-sm border border-slate-200">
                1. Invoice Submitted
              </span>
              <span>➔</span>
              <span className="px-2.5 py-1 rounded bg-white font-semibold shadow-sm border border-slate-200">
                2. University Payment In
              </span>
              <span>➔</span>
              <span className="px-2.5 py-1 rounded bg-[#EAF3DE] text-[#27500A] font-semibold shadow-sm border border-emerald-200">
                3. Payment Released to Agent (Slip Uploaded)
              </span>
            </div>
          </div>

          {/* Invoice Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-['Outfit']">{formatCurrency(invoiceMetrics.total)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{invoiceMetrics.count} invoices submitted</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Released to Agent</p>
              <p className="text-2xl font-bold text-[#047857] mt-1 font-['Outfit']">{formatCurrency(invoiceMetrics.paid)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Settled commission payout</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending / Due</p>
              <p className="text-2xl font-bold text-[#92400E] mt-1 font-['Outfit']">{formatCurrency(invoiceMetrics.pending)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Awaiting university payment</p>
            </div>
          </div>

          {/* Invoices Table */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Invoice #</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Amount</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Submitted Date</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">University Payment</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3">Payout Status</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase py-3 text-right">Payment Slip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-semibold text-slate-700">No invoices submitted</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Agent can submit invoices once student visas reach 100% and tuition fees are verified.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    agentInvoices.map((inv) => {
                      const isPaid = (inv.status || '').toLowerCase() === 'paid';
                      return (
                        <TableRow key={inv.id || inv._id} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="py-3 font-semibold text-xs text-slate-900 font-mono">
                            {inv.invoiceNumber || `INV-${inv.id?.slice(0, 8)}`}
                          </TableCell>
                          <TableCell className="py-3 text-xs font-bold text-slate-900">
                            {formatCurrency(inv.amount)}
                          </TableCell>
                          <TableCell className="py-3 text-xs text-slate-600">
                            {formatDate(inv.submissionDate || inv.createdAt)}
                          </TableCell>
                          <TableCell className="py-3">
                            {inv.universityPaid || inv.universityPaymentReceivedAt ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-none text-[10px] font-semibold">
                                Received {inv.universityPaymentReceivedAt ? formatDate(inv.universityPaymentReceivedAt) : ''}
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border-none text-[10px] font-semibold">
                                Awaiting University
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge className={cn(
                              "border-none text-[10px] font-semibold capitalize",
                              isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            )}>
                              {inv.status || 'Submitted'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            {inv.paymentSlipUrl || inv.receiptUrl ? (
                              <a
                                href={inv.paymentSlipUrl || inv.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#047857] hover:underline"
                              >
                                View Slip <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 3: VISA TRACKING ── */}
      {activeTab === 'visa' && (
        <div className="space-y-4">
          {/* Progression Stepper Bar */}
          <Card className="p-5 bg-white border-[#E5E7EB] shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              EMGS Visa Progression Funnel (Vijay Sequential Stages)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2">
              {PIPELINE_STAGES.map((stage, idx) => {
                const count = visaCounts[stage] || 0;
                const isSelected = visaStageFilter === stage;
                return (
                  <button
                    key={stage}
                    onClick={() => setVisaStageFilter(isSelected ? 'all' : stage)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      isSelected
                        ? "border-[#0C447C] bg-[#E6F1FB]/60 shadow-sm ring-1 ring-[#0C447C]"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-400">Step {idx + 1}</span>
                      <span className="text-xs font-bold font-mono text-slate-800 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                        {count}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {PIPELINE_STAGE_LABELS[stage] || stage}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {PIPELINE_STAGE_HEADINGS[stage]}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Filter Notice */}
          {visaStageFilter !== 'all' && (
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">
                Filtering by: <strong>{PIPELINE_STAGE_LABELS[visaStageFilter] || visaStageFilter}</strong> ({visaStudents.length} students)
              </span>
              <button
                onClick={() => setVisaStageFilter('all')}
                className="text-xs font-semibold text-[#0C447C] hover:underline"
              >
                Show all stages
              </button>
            </div>
          )}

          {/* Students at this stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visaStudents.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                <Compass className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold text-slate-700">No students currently in this stage</p>
                <p className="text-xs text-slate-400 mt-0.5">Students advance through each step sequentially.</p>
              </div>
            ) : (
              visaStudents.map(st => {
                const sName = getStudentName(st);
                const stageInfo = getStudentStageInfo(st);
                return (
                  <div key={st.id || st._id} className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={cn('border-none text-[10px] font-semibold', stageInfo.style)}>
                          {stageInfo.label}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{formatDate(st.createdAt)}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{sName}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{st.university || st.universityName || 'University unassigned'}</p>
                      <p className="text-[11px] text-slate-400">{st.course || st.courseInterested || 'Course pending'}</p>

                      {/* Stage Specific Nuances */}
                      {st.pipelineStage === 'Arrival' && st.flightDetails && (
                        <div className="mt-2.5 p-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-800">
                          <p className="font-semibold">Flight Logistics:</p>
                          <p>{st.flightDetails.flightNumber} · {st.flightDetails.airport} · {formatDate(st.flightDetails.arrivalDate)}</p>
                        </div>
                      )}

                      {st.pipelineStage === 'Medical' && (
                        <div className="mt-2.5 p-2 bg-blue-50 rounded-lg text-[11px] text-blue-800">
                          Post-arrival medical check within 7 days of landing.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">
                        {hasFeesPaid(st) ? '✓ Tuition Paid' : 'Tuition Pending'}
                      </span>
                      <Link
                        to={`/admin/students/${st.id || st._id}`}
                        className="text-xs font-semibold text-[#0C447C] hover:underline flex items-center gap-1"
                      >
                        Manage <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: PROFILE & ONBOARDING (Existing Components Preserved) ── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main: documents, then application */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
              <SectionHeader title="Agent Summary" hint="Key details at a glance" />
              <dl className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {keyFacts.map(([label, val, wide]) => (
                  <div key={label} className={cn('min-w-0', wide && 'sm:col-span-2')}>
                    <dt className="text-[11px] font-medium text-[#6B7280]">{label}</dt>
                    <dd className="text-sm font-medium text-[#111827] break-words mt-0.5">
                      {val || <span className="text-[#9CA3AF] font-normal">Not provided</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
              <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between">
                <div>
                  <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Verification Documents</h3>
                  <p className="text-[11px] text-[#9CA3AF]">Official legal documents uploaded by the agent</p>
                </div>
                {hasSufficientDocs(agent) ? (
                  <Badge className="border-none text-[10px] bg-emerald-50 text-emerald-700 font-medium">
                    ✓ Policy Met (1+ Doc Provided)
                  </Badge>
                ) : (
                  <Badge className="border-none text-[10px] bg-amber-50 text-amber-700 font-medium">
                    Awaiting 1 Required Document
                  </Badge>
                )}
              </div>
              <div className="px-4 py-2 bg-slate-50/60 border-b border-slate-100 text-[11px] text-slate-500">
                <strong>QStudy Policy:</strong> Uploading <strong>ANY ONE</strong> of Company Profile, Business Registration, or Director Passport is sufficient for approval.
              </div>
              {docs.length === 0 && missing.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <FileText className="w-10 h-10 text-gray-200" />
                  <p className="text-sm text-[#6B7280] font-medium">No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F3F4F6]">
                  {docs.map((doc, i) => (
                    <div key={doc.id || doc._id || i} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#111827]">{doc.docType}</p>
                          <p className="text-[11px] text-[#6B7280] truncate">{doc.fileName}{doc.uploadedAt ? ` · ${formatDate(doc.uploadedAt)}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={cn('border-none text-[10px] font-medium h-5 capitalize', docBadge(doc.status))}>{doc.status}</Badge>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => viewAgentDocument(agent.id, doc.id || doc._id)}>
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                          </Button>
                        </div>
                      </div>
                      {canReviewDocs && inReview && doc.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => reviewDocument(doc, 'approved')}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => reviewDocument(doc, 'rejected')}>
                            <X className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                      {doc.remarks && <p className="text-[11px] text-[#6B7280] bg-[#F9FAFB] rounded p-2 mt-2"><strong>Remarks:</strong> {doc.remarks}</p>}
                    </div>
                  ))}
                  {missing.map(({ type }) => (
                    <div key={type} className="px-4 py-3 flex items-center justify-between gap-3">
                      <p className="text-[13px] font-medium text-[#111827]">{type}</p>
                      <Badge className={cn(
                        "border-none text-[10px] h-5",
                        hasSufficientDocs(agent)
                          ? "bg-[#F3F4F6] text-[#6B7280]"
                          : "bg-amber-50 text-amber-700 font-semibold"
                      )}>
                        {hasSufficientDocs(agent) ? 'Not Uploaded (Optional)' : 'Pending Upload (Any 1)'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div>
              <h3 className="text-sm font-semibold text-[#111827] mb-3">Application Details</h3>
              <AgentApplicationDetails agent={agent} />
            </div>
          </div>

          {/* Side: contract, profile, history */}
          <div className="space-y-6">
            <AgentContractPanel agent={agent} />
            <UniversityAccessPanel agent={agent} />

            {(agent.onboardingHistory || []).length > 0 && (
              <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
                <SectionHeader title="Review Trail" />
                <ol className="divide-y divide-[#F3F4F6] px-4">
                  {[...agent.onboardingHistory].reverse().map((h, i) => (
                    <li key={i} className="py-2.5 text-xs">
                      <p className="font-semibold text-[#111827]">{HISTORY_LABELS[h.action] || h.action}</p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                        {h.byName || 'Staff'} · {new Date(h.at).toLocaleString()}
                      </p>
                      {h.remarks && <p className="text-[11px] text-[#4B5563] mt-1 bg-slate-50 p-1.5 rounded">"{h.remarks}"</p>}
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <AgentReviewDialog agent={agent} action={reviewAction} onClose={() => setReviewAction(null)} />
    </div>
  );
};

export default AgentDetailPage;
