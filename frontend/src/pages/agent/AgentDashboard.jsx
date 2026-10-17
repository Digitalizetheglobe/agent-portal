import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  Clock,
  ClipboardList,
  Building2,
  XCircle,
  AlertCircle,
  GraduationCap,
  BadgeCheck,
  IndianRupee,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import ComplianceStatus from '../../components/agent/ComplianceStatus';
import PipelineSummary from '../../components/application/PipelineSummary';
import { formatCurrency } from '../../utils/financialFormatters';
import { getFunnelLabel } from '../../utils/studentProgress';
import { TodayPanel, HistoryPanel, isSameDay } from '../../components/dashboard/WorkTimeline';

const AgentDashboard = () => {
  const { user } = useAuth();
  const {
    getStudentsByAgent,
    invoices,
    applications,
    payoffs,
    reviewQueue
  } = useData();

  // Invoices, payoffs and applications are already loaded once by DataProvider on login.

  // Helper for payoff amounts (backend uses netAmount, grossCommission, or amount)
  const getPayoffAmount = (p) => Number(p.netAmount ?? p.grossCommission ?? p.amount ?? 0);

  // ── Scoped data for this agent ──
  const userId = user?.id || user?._id;
  const myStudents = useMemo(() => getStudentsByAgent(userId) || [], [getStudentsByAgent, userId]);

  // If user is logged in as agent, backend data is already scoped to them
  const myInvoices = useMemo(() => (invoices || []).filter(inv => {
    if (user?.role === 'agent') return true;
    const invAgentId = inv.agentId?.id || inv.agentId?._id || inv.agentId;
    return String(invAgentId) === String(userId);
  }), [invoices, user?.role, userId]);

  const myApplications = useMemo(() => (applications || []).filter(app => {
    if (user?.role === 'agent') return true;
    const appAgentId = app.agentId?.id || app.agentId?._id || app.agentId;
    return String(appAgentId) === String(userId);
  }), [applications, user?.role, userId]);

  const myPayoffs = useMemo(() => (payoffs || []).filter(p => {
    if (user?.role === 'agent') return true;
    const pAgentId = p.agentId?.id || p.agentId?._id || p.agentId;
    return String(pAgentId) === String(userId);
  }), [payoffs, user?.role, userId]);

  // ── KPI Calculations ──
  const totalStudents = myStudents.length;
  const activeApplications = myApplications.filter(app =>
    !['completed', 'rejected', 'withdrawn', 'cancelled'].includes(app.status?.toLowerCase())
  ).length;

  // Action required: invoices needing correction + applications needing attention + documents requested
  const invoicesNeedingCorrection = myInvoices.filter(inv => {
    const rev = (inv.financeReviewStatus || '').toLowerCase();
    const st = (inv.status || '').toLowerCase();
    return rev === 'correctionrequired' || st === 'correction_required' || st === 'rejected';
  });

  const applicationsNeedingAction = myApplications.filter(app => {
    const st = (app.status || '').toLowerCase();
    return st === 'documents_required' || st === 'action_required' || st === 'correction_needed';
  });

  const documentsRequested = myStudents.filter(s =>
    s.documentRequests?.some(dr => dr.status === 'pending')
  );
  const actionRequiredCount = invoicesNeedingCorrection.length + applicationsNeedingAction.length + documentsRequested.length;

  const pendingPayoffsList = myPayoffs.filter(p => {
    const st = (p.status || '').toUpperCase();
    return st === 'PENDING' || st === 'APPROVED';
  });
  const pendingPayout = pendingPayoffsList.reduce((sum, p) => sum + getPayoffAmount(p), 0);

  const settledPayoffsList = myPayoffs.filter(p => {
    const st = (p.status || '').toUpperCase();
    return st === 'SETTLED' || st === 'COMPLETED';
  });
  const totalSettled = settledPayoffsList.reduce((sum, p) => sum + getPayoffAmount(p), 0);

  const glanceCards = [
    { title: 'My students', value: totalStudents, subtitle: `${myStudents.filter(s => s.feesPaid).length} have paid fees`, icon: GraduationCap, color: '#185FA5', bgColor: '#E6F1FB', link: '/agent/students' },
    { title: 'Applications in progress', value: activeApplications, subtitle: `${myApplications.length} submitted in total`, icon: ClipboardList, color: '#534AB7', bgColor: '#EEEDFE', link: '/agent/applications' },
    { title: 'Waiting to be paid', value: formatCurrency(pendingPayout), subtitle: `${pendingPayoffsList.length} payout${pendingPayoffsList.length !== 1 ? 's' : ''} pending`, icon: Clock, color: '#B45309', bgColor: '#FFF7ED', link: '/agent/payoffs' },
    { title: 'Total received', value: formatCurrency(totalSettled), subtitle: `${settledPayoffsList.length} payout${settledPayoffsList.length !== 1 ? 's' : ''} received`, icon: BadgeCheck, color: '#047857', bgColor: '#ECFDF5', link: '/agent/payoffs' },
  ];

  // ── Action items aggregation ──
  const actionItems = [];

  if (invoicesNeedingCorrection.length > 0) {
    actionItems.push({
      type: 'invoice',
      icon: FileText,
      iconBg: '#FCEBEB',
      iconColor: '#791F1F',
      title: `${invoicesNeedingCorrection.length} Invoice${invoicesNeedingCorrection.length > 1 ? 's' : ''} require${invoicesNeedingCorrection.length === 1 ? 's' : ''} correction`,
      description: invoicesNeedingCorrection.length === 1
        ? `${invoicesNeedingCorrection[0].invoiceNumber} — Finance has requested changes`
        : `Multiple invoices need your attention before approval`,
      link: '/agent/invoices',
      linkText: 'Fix Now',
      urgency: 'high'
    });
  }

  if (applicationsNeedingAction.length > 0) {
    actionItems.push({
      type: 'application',
      icon: ClipboardList,
      iconBg: '#FEF3C7',
      iconColor: '#92400E',
      title: `${applicationsNeedingAction.length} Application${applicationsNeedingAction.length > 1 ? 's' : ''} need${applicationsNeedingAction.length === 1 ? 's' : ''} your attention`,
      description: 'Documents or information required to proceed',
      link: '/agent/applications',
      linkText: 'Review',
      urgency: 'medium'
    });
  }

  if (documentsRequested.length > 0) {
    actionItems.push({
      type: 'document',
      icon: AlertCircle,
      iconBg: '#FFF7ED',
      iconColor: '#B45309',
      title: `${documentsRequested.length} Student${documentsRequested.length > 1 ? 's' : ''} — documents requested`,
      description: 'Admin has requested additional documents for verification',
      link: '/agent/students',
      linkText: 'Upload',
      urgency: 'medium'
    });
  }

  // ── Work events (feeds "Today's work" and "Work history") ──
  const toDate = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; };
  const events = [];
  const pushEvent = (e) => { if (e.time) events.push(e); };
  myStudents.forEach(s => {
    const created = toDate(s.createdAt);
    const updated = toDate(s.updatedAt);
    pushEvent({
      id: `s-${s.id || s._id}`, type: 'student', time: updated || created,
      title: s.name || 'Student',
      detail: created && updated && updated - created > 60000 ? `Student updated — ${getFunnelLabel(s)}` : 'Student registered',
      icon: GraduationCap, iconBg: '#E6F1FB', iconColor: '#185FA5', to: `/agent/students/${s.id || s._id}`
    });
  });
  myApplications.forEach(app => pushEvent({
    id: `a-${app.id || app._id}`, type: 'application', time: toDate(app.updatedAt || app.createdAt || app.submittedAt),
    title: app.studentName || app.student?.name || 'Student',
    detail: `Application — ${formatStatus(app.status)}`,
    icon: ClipboardList, iconBg: '#EEEDFE', iconColor: '#534AB7', to: '/agent/applications'
  }));
  myInvoices.forEach(inv => pushEvent({
    id: `i-${inv.id || inv._id}`, type: 'invoice', time: toDate(inv.updatedAt || inv.raisedAt || inv.createdAt),
    title: `Invoice ${inv.invoiceNumber || ''}`.trim(),
    detail: formatStatus(inv.financeReviewStatus || inv.status || 'Submitted'),
    icon: FileText, iconBg: '#E6F1FB', iconColor: '#0C447C', to: '/agent/invoices'
  }));
  myPayoffs.forEach(p => pushEvent({
    id: `p-${p.id || p._id}`, type: 'payoff', time: toDate(p.settledAt || p.updatedAt || p.createdAt),
    title: `Payoff ${p.payoffNumber || ''}`.trim(),
    detail: `${formatStatus(p.status)} — ${formatCurrency(getPayoffAmount(p))}`,
    icon: Wallet, iconBg: '#ECFDF5', iconColor: '#047857', to: '/agent/payoffs'
  }));
  events.sort((a, b) => b.time - a.time);

  const now = new Date();
  const madeToday = (list, getDate) => list.filter(x => { const d = toDate(getDate(x)); return d && isSameDay(d, now); }).length;
  const todayTiles = [
    { label: 'Students added', value: madeToday(myStudents, s => s.createdAt), hint: 'registered today', icon: GraduationCap, color: '#185FA5', bg: '#E6F1FB', to: '/agent/students' },
    { label: 'Applications', value: madeToday(myApplications, a => a.createdAt || a.submittedAt), hint: 'submitted today', icon: ClipboardList, color: '#534AB7', bg: '#EEEDFE', to: '/agent/applications' },
    { label: 'Invoices raised', value: madeToday(myInvoices, i => i.raisedAt || i.createdAt), hint: 'sent to finance today', icon: FileText, color: '#0C447C', bg: '#E6F1FB', to: '/agent/invoices' },
    { label: 'Status changes', value: events.filter(e => isSameDay(e.time, now) && ['application', 'invoice'].includes(e.type)).length, hint: 'applications & invoices', icon: Clock, color: '#B45309', bg: '#FFF7ED' },
    { label: 'Paid today', value: madeToday(settledPayoffsList, p => p.settledAt || p.updatedAt), hint: 'payouts received', icon: BadgeCheck, color: '#047857', bg: '#ECFDF5', to: '/agent/payoffs' },
  ];
  const todayActions = actionItems.map(i => ({
    icon: i.icon, iconBg: i.iconBg, iconColor: i.iconColor, link: i.link,
    count: i.type === 'invoice' ? invoicesNeedingCorrection.length : i.type === 'application' ? applicationsNeedingAction.length : documentsRequested.length,
    label: i.title.replace(/^\d+\s+/, '') + ` — ${i.description}`,
  }));

  function formatStatus(status) {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 p-4 md:p-8 bg-[#F9FAFB] min-h-screen" data-testid="agent-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Partner'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Here's what's happening with your students and applications
          </p>
        </div>
      </div>

      <div className="w-full h-px bg-gray-200" />

      {/* Compliance Warning */}
      <ComplianceStatus />

      {/* Visa progress for your students */}
      <PipelineSummary applications={myApplications} to="/agent/applications" />

      <TodayPanel tiles={todayTiles} actions={todayActions} events={events} />

      {/* At a glance */}
      <div>
        <div className="mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">At a glance</span>
        </div>
        <div className="stat-grid grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {glanceCards.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.title} to={c.link} className="block">
                <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition-all group h-full">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{c.title}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.bgColor }}>
                      <Icon className="w-4 h-4" style={{ color: c.color }} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#111827] font-['Outfit']">{c.value}</div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">{c.subtitle}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <HistoryPanel events={events} />
    </div>
  );
};

export default AgentDashboard;
