import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import PipelineSummary from '../../components/application/PipelineSummary';
import { getFunnelLabel } from '../../utils/studentProgress';
import { getRoleLabel } from '../../utils/staffRoles';
import { ONBOARDING_STATUS } from '../../utils/onboarding';
import { cn } from '../../lib/utils';
import {
  Users,
  GraduationCap,
  ClipboardList,
  FileText,
  Wallet,
  Clock,
  BadgeCheck,
  UserCheck,
  ShieldCheck,
  FileCheck,
  XCircle,
  AlertTriangle,
  Building2,
  Globe,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { agentAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/financialFormatters';
import { TodayPanel, HistoryPanel, FILTERS, isSameDay } from '../../components/dashboard/WorkTimeline';

const lower = (v) => (v || '').toString().toLowerCase();
const upper = (v) => (v || '').toString().toUpperCase();

function formatStatus(status) {
  if (!status) return 'Pending';
  return status.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase());
}

const toDate = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; };

const pick = (...keys) => FILTERS.filter(f => f.key === 'all' || keys.includes(f.key));

const AdminDashboard = () => {
  const { user } = useAuth();
  const {
    agents, students, applications, invoices, payoffs, verificationQueue, initialized,
    fetchVerificationQueue
  } = useData();

  // Agents, students, applications, invoices and payoffs are already loaded once by DataProvider
  // on login, so only the verification queue (not part of that load) is fetched, once.
  const queueRequested = useRef(false);
  useEffect(() => {
    if (!initialized || queueRequested.current) return;
    queueRequested.current = true;
    fetchVerificationQueue?.();
  }, [initialized, fetchVerificationQueue]);

  const [accountManagers, setAccountManagers] = useState([]);
  useEffect(() => {
    agentAPI.getAccountManagers?.()
      .then(res => setAccountManagers(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to load AMs for dashboard', err));
  }, []);

  const agentsByCountry = useMemo(() => {
    const map = {};
    agents.forEach(a => {
      const c = a.country?.trim() || 'Not specified';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .map(([country, count]) => ({
        country,
        count,
        percent: agents.length > 0 ? Math.round((count / agents.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [agents]);

  const agentsByManager = useMemo(() => {
    const counts = { unassigned: 0 };
    agents.forEach(a => {
      const id = a.accountManagerId || a.accountManager?.id;
      if (!id) {
        counts.unassigned++;
      } else {
        counts[id] = (counts[id] || 0) + 1;
      }
    });

    const list = accountManagers.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      count: counts[m.id] || 0,
      percent: agents.length > 0 ? Math.round(((counts[m.id] || 0) / agents.length) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    if (counts.unassigned > 0) {
      list.push({
        id: 'unassigned',
        name: 'Unassigned Agents',
        email: 'Requires manager assignment',
        count: counts.unassigned,
        percent: agents.length > 0 ? Math.round((counts.unassigned / agents.length) * 100) : 0,
        isUnassigned: true
      });
    }
    return list;
  }, [agents, accountManagers]);

  const staffRole = user?.staffRole || 'super_admin';
  const today = new Date();

  const getPayoffAmount = (p) => Number(p.netAmount ?? p.grossCommission ?? p.amount ?? 0);
  const agentLabel = (x) => x?.agencyName || x?.name || null;
  const madeToday = (list, getDate) => list.filter(x => { const d = toDate(getDate(x)); return d && isSameDay(d, today); }).length;

  // ═══ Shared facts ═══
  const activeAgents = agents.filter(a => lower(a.status) === 'active').length;
  const pendingAgents = agents.filter(a => lower(a.status) !== 'active').length;
  const activeApplications = applications.filter(app =>
    !['completed', 'rejected', 'withdrawn', 'cancelled'].includes(lower(app.status))
  ).length;

  const isInvoiceInReview = (inv) =>
    ['pendingreview', 'underreview', 'resubmitted'].includes(lower(inv.financeReviewStatus)) ||
    ['submitted', 'under_review', 'pending'].includes(lower(inv.status));
  const isInvoiceCorrection = (inv) =>
    lower(inv.financeReviewStatus) === 'correctionrequired' || lower(inv.status) === 'correction_required';
  const invoicesUnderReview = invoices.filter(isInvoiceInReview).length;
  const correctionRequired = invoices.filter(isInvoiceCorrection).length;

  const pendingPayoffs = payoffs.filter(p => ['PENDING', 'APPROVED'].includes(upper(p.status)));
  const pendingPayoffsAmount = pendingPayoffs.reduce((s, p) => s + getPayoffAmount(p), 0);
  const settledPayoffs = payoffs.filter(p => ['SETTLED', 'COMPLETED'].includes(upper(p.status)));
  const settledAmount = settledPayoffs.reduce((s, p) => s + getPayoffAmount(p), 0);
  const settledThisMonth = settledPayoffs
    .filter(p => { const d = toDate(p.settledAt || p.updatedAt); return d && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth(); })
    .reduce((s, p) => s + getPayoffAmount(p), 0);
  const readyToSettle = pendingPayoffs.filter(p => upper(p.status) === 'PENDING' && !p.paymentBlocked);
  const waitingForUniversity = pendingPayoffs.filter(p => upper(p.status) === 'PENDING' && p.paymentBlocked);

  const pendingVerifications = (verificationQueue || []).filter(s => ['pending', 'initiated'].includes(lower(s.verificationStatus))).length;
  const feeProofsToReview = applications.filter(a => a.feeStatus === 'ProofSubmitted').length;
  const applicationsToReview = applications.filter(a => ['submitted', 'under_review', 'underreview'].includes(lower(a.status))).length;

  const onboarding = (st) => agents.filter(a => a.onboardingStatus === st).length;
  const toRecommend = onboarding('submitted') + onboarding('under_review');
  const toVerify = onboarding('recommended');
  const toApprove = onboarding('verified');
  const changesRequested = onboarding('correction_required');
  const approvedAgents = onboarding('approved');
  const inReviewAgents = toRecommend + toVerify + toApprove;

  // ═══ Events (one row per record, at its latest update) ═══
  const events = [];
  const pushEvent = (e) => { if (e.time) events.push(e); };

  const studentEvents = () => students.forEach(s => pushEvent({
    id: `s-${s.id}`, type: 'student', time: toDate(s.updatedAt || s.createdAt),
    title: s.name || 'Student',
    detail: toDate(s.updatedAt) && toDate(s.createdAt) && toDate(s.updatedAt) - toDate(s.createdAt) > 60000
      ? `Student updated — ${getFunnelLabel(s)}` : 'New student registered',
    by: agents.find(a => a.id === s.agentId)?.name,
    icon: GraduationCap, iconBg: '#E6F1FB', iconColor: '#185FA5', to: `/admin/students/${s.id}`
  }));
  const applicationEvents = () => applications.forEach(app => pushEvent({
    id: `a-${app.id}`, type: 'application', time: toDate(app.updatedAt || app.createdAt || app.submittedAt),
    title: app.student?.name || app.studentName || 'Student',
    detail: `Application — ${formatStatus(app.status)}`,
    by: app.agentName || agentLabel(app.agent) || agents.find(a => a.id === app.agentId)?.name,
    icon: ClipboardList, iconBg: '#EEEDFE', iconColor: '#534AB7', to: '/admin/applications'
  }));
  const invoiceEvents = () => invoices.forEach(inv => pushEvent({
    id: `i-${inv.id || inv._id}`, type: 'invoice', time: toDate(inv.updatedAt || inv.raisedAt || inv.createdAt),
    title: `Invoice ${inv.invoiceNumber || 'Claim'}`,
    detail: formatStatus(inv.financeReviewStatus || inv.status || 'Submitted'),
    by: agentLabel(inv.agentId) || inv.agentName,
    icon: FileText, iconBg: '#E6F1FB', iconColor: '#0C447C', to: '/admin/invoices'
  }));
  const payoffEvents = () => payoffs.forEach(p => pushEvent({
    id: `p-${p.id || p._id}`, type: 'payoff', time: toDate(p.settledAt || p.updatedAt || p.createdAt),
    title: `Payoff ${p.payoffNumber || ''}`.trim(),
    detail: `${formatStatus(p.status)} — ${formatCurrency(getPayoffAmount(p))}`,
    by: agentLabel(p.agentId) || p.agentName,
    icon: Wallet, iconBg: '#ECFDF5', iconColor: '#047857', to: '/admin/payoffs'
  }));
  const agentEvents = () => agents.forEach(a => {
    const created = toDate(a.createdAt);
    const updated = toDate(a.updatedAt);
    pushEvent({
      id: `g-${a.id}`, type: 'agent', time: updated || created,
      title: a.agencyName || a.name || 'Agent',
      detail: created && updated && updated - created > 60000
        ? `Application — ${ONBOARDING_STATUS[a.onboardingStatus]?.label || formatStatus(a.onboardingStatus)}`
        : 'Agent registered',
      icon: Users, iconBg: '#FEF3C7', iconColor: '#92400E', to: `/admin/agents/${a.id}`
    });
  });

  // ═══ Per-role view: what this person needs to see first ═══
  const T = (label, value, hint, icon, color, bg, to) => ({ label, value, hint, icon, color, bg, to });
  const A = (icon, iconBg, iconColor, count, label, link) => ({ icon, iconBg, iconColor, count, label, link });
  const G = (title, value, subtitle, icon, color, bgColor, link, highlight) => ({ title, value, subtitle, icon, color, bgColor, link, highlight });

  let view;

  if (staffRole === 'accounts') {
    payoffEvents(); invoiceEvents();
    view = {
      subtitle: 'Payments to agents and money from universities',
      showVisa: false,
      filters: pick('payoff', 'invoice'),
      tiles: [
        T('New payoffs', madeToday(payoffs, p => p.createdAt), 'created today', Wallet, '#047857', '#ECFDF5', '/admin/payoffs'),
        T('University paid', madeToday(payoffs, p => p.universityPaymentRecordedAt), 'payments recorded today', Building2, '#0C447C', '#E6F1FB', '/admin/payoffs'),
        T('Paid to agents', madeToday(settledPayoffs, p => p.settledAt || p.updatedAt), 'settled today', BadgeCheck, '#047857', '#ECFDF5', '/admin/payoffs'),
        T('Cancelled', madeToday(payoffs.filter(p => upper(p.status) === 'CANCELLED'), p => p.updatedAt), 'payoffs cancelled today', XCircle, '#B91C1C', '#FCEBEB', '/admin/payoffs'),
        T('Invoices approved', madeToday(invoices.filter(i => ['approved', 'paid'].includes(lower(i.financeReviewStatus || i.status))), i => i.updatedAt), 'new work for you today', FileText, '#0C447C', '#E6F1FB', '/admin/invoices'),
      ],
      actions: [
        readyToSettle.length && A(Wallet, '#ECFDF5', '#047857', readyToSettle.length, 'payoffs ready to pay — university has paid', '/admin/payoffs'),
        waitingForUniversity.length && A(Clock, '#FFF7ED', '#B45309', waitingForUniversity.length, 'payoffs waiting for the university to pay us', '/admin/payoffs'),
      ],
      glance: [
        G('Ready to pay out', formatCurrency(readyToSettle.reduce((s, p) => s + getPayoffAmount(p), 0)), `${readyToSettle.length} payoff${readyToSettle.length !== 1 ? 's' : ''}`, Wallet, '#047857', '#ECFDF5', '/admin/payoffs', readyToSettle.length > 0),
        G('Waiting for university', waitingForUniversity.length, 'payments not received yet', Clock, '#B45309', '#FFF7ED', '/admin/payoffs'),
        G('Paid this month', formatCurrency(settledThisMonth), today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), BadgeCheck, '#534AB7', '#EEEDFE', '/admin/payoffs'),
        G('Total paid out', formatCurrency(settledAmount), `${settledPayoffs.length} settlement${settledPayoffs.length !== 1 ? 's' : ''}`, BadgeCheck, '#047857', '#ECFDF5', '/admin/payoffs'),
      ],
    };
  } else if (staffRole === 'head_recruitment') {
    agentEvents();
    view = {
      subtitle: 'Agent applications and your agent network',
      showVisa: false,
      filters: pick('agent'),
      tiles: [
        T('New agents', madeToday(agents, a => a.createdAt), 'registered today', Users, '#92400E', '#FEF3C7', '/admin/agents'),
        T('Submitted', madeToday(agents, a => a.onboardingSubmittedAt), 'applications sent in today', FileCheck, '#0C447C', '#E6F1FB', '/admin/agents'),
        T('Verified', madeToday(agents.filter(a => a.onboardingStatus === 'verified'), a => a.updatedAt), 'verified today', ShieldCheck, '#085041', '#E1F5EE', '/admin/agents'),
        T('Changes asked', madeToday(agents.filter(a => a.onboardingStatus === 'correction_required'), a => a.updatedAt), 'sent back today', AlertTriangle, '#8A4B08', '#FFF1E0', '/admin/agents'),
        T('Approved', madeToday(agents.filter(a => a.onboardingStatus === 'approved'), a => a.updatedAt), 'agents approved today', BadgeCheck, '#27500A', '#EAF3DE', '/admin/agents'),
      ],
      actions: [
        toVerify && A(ShieldCheck, '#E1F5EE', '#085041', toVerify, 'agent applications ready for you to verify', '/admin/agents'),
        toRecommend && A(Clock, '#E6F1FB', '#0C447C', toRecommend, 'agent applications still with the account manager', '/admin/agents'),
        changesRequested && A(AlertTriangle, '#FFF1E0', '#8A4B08', changesRequested, 'agents fixing requested changes', '/admin/agents'),
      ],
      glance: [
        G('Agents', agents.length, `${activeAgents} active`, Users, '#534AB7', '#EEEDFE', '/admin/agents'),
        G('Being reviewed', inReviewAgents, 'applications in the approval chain', Clock, '#B45309', '#FFF7ED', '/admin/agents', toVerify > 0),
        G('Approved agents', approvedAgents, 'fully approved', BadgeCheck, '#047857', '#ECFDF5', '/admin/agents'),
        G('Students', students.length, 'registered by agents', GraduationCap, '#185FA5', '#E6F1FB', '/admin/students'),
      ],
    };
  } else if (staffRole === 'head_admission') {
    studentEvents(); applicationEvents(); invoiceEvents(); agentEvents();
    view = {
      subtitle: 'Approvals, visa progress and invoices',
      showVisa: true,
      filters: pick('application', 'student', 'invoice', 'agent'),
      tiles: [
        T('New applications', madeToday(applications, a => a.createdAt || a.submittedAt), 'submitted today', ClipboardList, '#534AB7', '#EEEDFE', '/admin/applications'),
        T('Stage changes', madeToday(applications, a => a.pipelineUpdatedAt), 'students moved on today', FileCheck, '#0C447C', '#E6F1FB', '/admin/applications'),
        T('Fee proofs', madeToday(applications.filter(a => a.feeStatus === 'ProofSubmitted'), a => a.updatedAt), 'uploaded today', FileText, '#B45309', '#FFF7ED', '/admin/applications'),
        T('Invoices raised', madeToday(invoices, i => i.raisedAt || i.createdAt), 'sent for review today', FileText, '#0C447C', '#E6F1FB', '/admin/invoices'),
        T('New students', madeToday(students, s => s.createdAt), 'registered today', GraduationCap, '#185FA5', '#E6F1FB', '/admin/students'),
      ],
      actions: [
        toApprove && A(UserCheck, '#EAF3DE', '#27500A', toApprove, 'agent applications ready for your approval', '/admin/agents'),
        invoicesUnderReview && A(FileText, '#E6F1FB', '#0C447C', invoicesUnderReview, 'invoices waiting for your review', '/admin/invoices'),
        feeProofsToReview && A(FileCheck, '#FFF7ED', '#B45309', feeProofsToReview, 'fee payment proofs to accept or reject', '/admin/applications'),
        pendingVerifications && A(ShieldCheck, '#EEEDFE', '#534AB7', pendingVerifications, 'student documents waiting for verification', '/admin/students?tab=queue'),
        applicationsToReview && A(ClipboardList, '#EEEDFE', '#534AB7', applicationsToReview, 'applications to review', '/admin/applications'),
      ],
      glance: [
        G('Applications in progress', activeApplications, `${applications.length} in total`, ClipboardList, '#534AB7', '#EEEDFE', '/admin/applications'),
        G('Students', students.length, `${students.filter(s => s.feesPaid).length} have paid fees`, GraduationCap, '#185FA5', '#E6F1FB', '/admin/students'),
        G('Invoices to review', invoicesUnderReview, `${correctionRequired} sent back for correction`, FileText, '#0C447C', '#E6F1FB', '/admin/invoices', invoicesUnderReview > 0),
        G('Agents', agents.length, `${approvedAgents} approved · ${toApprove} awaiting approval`, Users, '#92400E', '#FEF3C7', '/admin/agents'),
      ],
    };
  } else if (staffRole === 'account_manager') {
    studentEvents(); applicationEvents(); invoiceEvents(); agentEvents();
    view = {
      subtitle: 'Your agents, their students and their invoices',
      showVisa: true,
      filters: pick('agent', 'student', 'application', 'invoice'),
      tiles: [
        T('Students added', madeToday(students, s => s.createdAt), 'by your agents today', GraduationCap, '#185FA5', '#E6F1FB', '/admin/students'),
        T('Applications', madeToday(applications, a => a.createdAt || a.submittedAt), 'submitted today', ClipboardList, '#534AB7', '#EEEDFE', '/admin/applications'),
        T('Invoices raised', madeToday(invoices, i => i.raisedAt || i.createdAt), 'by your agents today', FileText, '#0C447C', '#E6F1FB', '/admin/invoices'),
        T('Agent updates', madeToday(agents, a => a.updatedAt), 'agents active today', Users, '#92400E', '#FEF3C7', '/admin/agents'),
        T('Paid today', madeToday(settledPayoffs, p => p.settledAt || p.updatedAt), 'payoffs to your agents', BadgeCheck, '#047857', '#ECFDF5', '/admin/payoffs'),
      ],
      actions: [
        toRecommend && A(UserCheck, '#EEEDFE', '#534AB7', toRecommend, 'agent applications waiting for your recommendation', '/admin/agents'),
        changesRequested && A(AlertTriangle, '#FFF1E0', '#8A4B08', changesRequested, 'agents who need to fix their application', '/admin/agents'),
        correctionRequired && A(FileText, '#FCEBEB', '#791F1F', correctionRequired, 'invoices sent back — help your agent fix them', '/admin/invoices'),
        pendingAgents && A(Users, '#FEF3C7', '#92400E', pendingAgents, 'agents not active yet', '/admin/agents'),
      ],
      glance: [
        G('My agents', agents.length, `${activeAgents} active`, Users, '#534AB7', '#EEEDFE', '/admin/agents'),
        G('Students', students.length, `${students.filter(s => s.feesPaid).length} have paid fees`, GraduationCap, '#185FA5', '#E6F1FB', '/admin/students'),
        G('Applications in progress', activeApplications, `${applications.length} in total`, ClipboardList, '#B45309', '#FFF7ED', '/admin/applications'),
        G("Agents' earnings", formatCurrency(settledAmount), `${formatCurrency(pendingPayoffsAmount)} still to be paid`, Wallet, '#047857', '#ECFDF5', '/admin/payoffs'),
      ],
    };
  } else {
    // Super admin: the whole business
    studentEvents(); applicationEvents(); invoiceEvents(); payoffEvents(); agentEvents();
    view = {
      subtitle: 'Admin Portal',
      showVisa: true,
      filters: FILTERS,
      tiles: [
        T('New students', madeToday(students, s => s.createdAt), 'registered today', GraduationCap, '#185FA5', '#E6F1FB', '/admin/students'),
        T('New applications', madeToday(applications, a => a.createdAt || a.submittedAt), 'submitted today', ClipboardList, '#534AB7', '#EEEDFE', '/admin/applications'),
        T('Invoices raised', madeToday(invoices, i => i.raisedAt || i.createdAt), 'by agents today', FileText, '#0C447C', '#E6F1FB', '/admin/invoices'),
        T('Settled today', madeToday(settledPayoffs, p => p.settledAt || p.updatedAt), 'payoffs paid out', BadgeCheck, '#047857', '#ECFDF5', '/admin/payoffs'),
        T('New agents', madeToday(agents, a => a.createdAt), 'registered today', Users, '#92400E', '#FEF3C7', '/admin/agents'),
      ],
      actions: [
        correctionRequired && A(FileText, '#FCEBEB', '#791F1F', correctionRequired, 'invoices waiting for agents to correct', '/admin/invoices'),
        invoicesUnderReview && A(ClipboardList, '#E6F1FB', '#0C447C', invoicesUnderReview, 'invoices waiting for review', '/admin/invoices'),
        pendingPayoffs.length && A(Wallet, '#FFF7ED', '#B45309', pendingPayoffs.length, 'payoffs pending settlement', '/admin/payoffs'),
        pendingVerifications && A(UserCheck, '#EEEDFE', '#534AB7', pendingVerifications, 'student verifications pending', '/admin/students?tab=queue'),
        pendingAgents && A(Users, '#FEF3C7', '#92400E', pendingAgents, 'agents pending approval', '/admin/agents'),
      ],
      glance: [
        G('Agents', agents.length, `${activeAgents} active`, Users, '#534AB7', '#EEEDFE', '/admin/agents'),
        G('Students', students.length.toLocaleString(), `${students.filter(s => s.feesPaid).length} have paid fees`, GraduationCap, '#185FA5', '#E6F1FB', '/admin/students'),
        G('Invoices to review', invoicesUnderReview, `${invoices.length} invoices in total`, FileText, '#0C447C', '#E6F1FB', '/admin/invoices', invoicesUnderReview > 0),
        G('Money to pay out', formatCurrency(pendingPayoffsAmount), `${formatCurrency(settledAmount)} already paid`, Wallet, '#B45309', '#FFF7ED', '/admin/payoffs', pendingPayoffs.length > 0),
      ],
    };
  }

  events.sort((a, b) => b.time - a.time);
  const actions = view.actions.filter(Boolean);
  const roleLabel = user?.staffRole ? getRoleLabel(user) : 'Admin Portal';

  return (
    <div className="bg-[#FDFDFF] min-h-screen font-sans" data-testid="admin-dashboard">
      <div className="p-5 md:p-7">
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Operations Overview</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {roleLabel} · {view.subtitle}
          </p>
        </div>

        <div className="h-[0.5px] bg-slate-200 my-5" />

        {view.showVisa && (
          <div className="mb-6">
            <PipelineSummary applications={applications} to="/admin/applications" />
          </div>
        )}

        <TodayPanel tiles={view.tiles} actions={actions} events={events} />

        <div className="mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">At a glance</span>
        </div>
        <div className="stat-grid grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {view.glance.map(g => <KpiCard key={g.title} {...g} />)}
        </div>

        {/* ── At a Glance Breakdown: Agents by Country & Agents by Account Manager ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Card 1: Agents by Country */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#E6F1FB] flex items-center justify-center text-[#0C447C]">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-['Outfit']">Agents by Country</h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    {agentsByCountry.length} {agentsByCountry.length === 1 ? 'country' : 'countries'} · {agents.length} total agents
                  </p>
                </div>
              </div>
              <Link
                to="/admin/agents"
                className="text-xs font-semibold text-[#0C447C] hover:underline flex items-center gap-1 group"
              >
                View all <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {agentsByCountry.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No agents registered yet.</div>
            ) : (
              <div className="space-y-3">
                {agentsByCountry.slice(0, 5).map((item) => (
                  <Link
                    key={item.country}
                    to={`/admin/agents?country=${encodeURIComponent(item.country)}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 group-hover:text-[#0C447C] transition-colors flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0C447C]" />
                        {item.country}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono">{item.count}</span>
                        <span className="text-[10px] text-slate-400">({item.percent}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#0C447C] h-1.5 rounded-full transition-all duration-500 group-hover:bg-[#185FA5]"
                        style={{ width: `${Math.max(item.percent, 4)}%` }}
                      />
                    </div>
                  </Link>
                ))}
                {agentsByCountry.length > 5 && (
                  <Link
                    to="/admin/agents"
                    className="block text-center text-[11px] font-semibold text-slate-500 hover:text-[#0C447C] pt-2"
                  >
                    + {agentsByCountry.length - 5} more countries in filter
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Agents by Account Manager */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#EEEDFE] flex items-center justify-center text-[#534AB7]">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-['Outfit']">Agents by Account Manager</h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    Dedicated managers for global agent partners
                  </p>
                </div>
              </div>
              <Link
                to="/admin/team"
                className="text-xs font-semibold text-[#534AB7] hover:underline flex items-center gap-1 group"
              >
                Team <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {agentsByManager.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No account managers configured yet.</div>
            ) : (
              <div className="space-y-3">
                {agentsByManager.slice(0, 5).map((am) => (
                  <Link
                    key={am.id}
                    to={am.isUnassigned ? '/admin/agents?accountManagerId=unassigned' : `/admin/agents?accountManagerId=${am.id}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={cn(
                        "font-medium transition-colors flex items-center gap-1.5",
                        am.isUnassigned
                          ? "text-amber-700 font-semibold"
                          : "text-slate-700 group-hover:text-[#534AB7]"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          am.isUnassigned ? "bg-amber-500" : "bg-[#534AB7]"
                        )} />
                        {am.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono">{am.count}</span>
                        <span className="text-[10px] text-slate-400">({am.percent}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-500",
                          am.isUnassigned
                            ? "bg-amber-500"
                            : "bg-[#534AB7] group-hover:bg-[#3C3489]"
                        )}
                        style={{ width: `${Math.max(am.percent, 4)}%` }}
                      />
                    </div>
                  </Link>
                ))}
                {agentsByManager.length > 5 && (
                  <Link
                    to="/admin/team"
                    className="block text-center text-[11px] font-semibold text-slate-500 hover:text-[#534AB7] pt-2"
                  >
                    + {agentsByManager.length - 5} more team members
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <HistoryPanel events={events} filters={view.filters} />
      </div>
    </div>
  );
};

/* ── Reusable KPI Card ── */
const KpiCard = ({ title, value, subtitle, icon: Icon, color, bgColor, link, highlight }) => {
  const inner = (
    <div className={`bg-white border rounded-xl p-5 transition-all duration-200 group ${
      highlight
        ? 'border-amber-300 shadow-sm shadow-amber-50 hover:shadow-md hover:shadow-amber-100'
        : 'border-slate-200 hover:shadow-md hover:border-slate-300'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
          style={{ backgroundColor: bgColor }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 font-['Outfit']">{value}</div>
      <div className="text-[11px] mt-1.5 font-medium text-slate-500">{subtitle}</div>
    </div>
  );

  return link ? <Link to={link} className="block">{inner}</Link> : inner;
};

export default AdminDashboard;
