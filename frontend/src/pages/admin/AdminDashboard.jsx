import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  ClipboardList,
  FileText,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowRight,
  Building2,
  ShieldCheck,
  IndianRupee,
  TrendingUp,
  BadgeCheck,
  Activity,
  UserCheck,
  XCircle
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../utils/financialFormatters';

const AdminDashboard = () => {
  const {
    agents,
    students,
    applications,
    invoices,
    payoffs,
    reviewQueue,
    verificationQueue,
    fetchAgents,
    fetchStudents,
    fetchApplications,
    fetchInvoices,
    fetchPayoffs,
    fetchVerificationQueue
  } = useData();

  useEffect(() => {
    fetchAgents?.();
    fetchStudents?.();
    fetchApplications?.();
    fetchInvoices?.();
    fetchPayoffs?.();
    fetchVerificationQueue?.();
  }, [fetchAgents, fetchStudents, fetchApplications, fetchInvoices, fetchPayoffs, fetchVerificationQueue]);

  // Helper for payoff amounts (backend uses netAmount, grossCommission, or amount)
  const getPayoffAmount = (p) => Number(p.netAmount ?? p.grossCommission ?? p.amount ?? 0);

  // ═══ OPERATIONS KPIs ═══
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => (a.status || '').toLowerCase() === 'active').length;
  const pendingAgents = agents.filter(a => (a.status || '').toLowerCase() !== 'active').length;

  const totalStudents = students.length;

  const activeApplications = applications.filter(app =>
    !['completed', 'rejected', 'withdrawn', 'cancelled'].includes(app.status?.toLowerCase())
  ).length;

  const admissions = applications.filter(app =>
    ['admitted', 'enrolled', 'completed'].includes(app.status?.toLowerCase())
  ).length;

  // ═══ FINANCE KPIs ═══
  const invoicesUnderReview = invoices.filter(inv => {
    const rev = (inv.financeReviewStatus || '').toLowerCase();
    const st = (inv.status || '').toLowerCase();
    return ['pendingreview', 'underreview', 'resubmitted'].includes(rev) ||
           ['submitted', 'under_review', 'pending'].includes(st);
  }).length;

  const correctionRequired = invoices.filter(inv => {
    const rev = (inv.financeReviewStatus || '').toLowerCase();
    const st = (inv.status || '').toLowerCase();
    return rev === 'correctionrequired' || st === 'correction_required';
  }).length;

  const approvedInvoices = invoices.filter(inv => {
    const rev = (inv.financeReviewStatus || '').toLowerCase();
    const st = (inv.status || '').toLowerCase();
    return rev === 'approved' || st === 'approved' || st === 'paid';
  }).length;

  const pendingPayoffs = payoffs.filter(p => {
    const st = (p.status || '').toUpperCase();
    return st === 'PENDING' || st === 'APPROVED';
  });
  const pendingPayoffsAmount = pendingPayoffs.reduce(
    (sum, p) => sum + getPayoffAmount(p), 0
  );

  // ═══ SETTLEMENT KPIs ═══
  const pendingSettlementCount = payoffs.filter(p => (p.status || '').toUpperCase() === 'PENDING').length;

  const settledPayoffs = payoffs.filter(p => {
    const st = (p.status || '').toUpperCase();
    return st === 'SETTLED' || st === 'COMPLETED';
  });
  const settledAmount = settledPayoffs.reduce(
    (sum, p) => sum + getPayoffAmount(p), 0
  );

  // Settled this month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const settledThisMonth = settledPayoffs
    .filter(p => {
      const dateVal = p.settledAt || p.updatedAt || p.createdAt;
      return dateVal ? new Date(dateVal) >= thisMonthStart : false;
    })
    .reduce((sum, p) => sum + getPayoffAmount(p), 0);

  // ═══ VERIFICATION ═══
  const pendingVerifications = verificationQueue?.filter(s => {
    const st = (s.verificationStatus || '').toLowerCase();
    return st === 'pending' || st === 'initiated';
  }).length || 0;

  // ═══ ACTION QUEUE ═══
  const actionQueue = [];

  if (correctionRequired > 0) {
    actionQueue.push({
      icon: FileText,
      iconBg: '#FCEBEB',
      iconColor: '#791F1F',
      count: correctionRequired,
      label: `Invoice${correctionRequired > 1 ? 's' : ''} awaiting correction from agents`,
      link: '/admin/invoices',
      urgency: 'high'
    });
  }

  if (invoicesUnderReview > 0) {
    actionQueue.push({
      icon: ClipboardList,
      iconBg: '#E6F1FB',
      iconColor: '#0C447C',
      count: invoicesUnderReview,
      label: `Invoice${invoicesUnderReview > 1 ? 's' : ''} waiting for your review`,
      link: '/admin/invoices',
      urgency: 'medium'
    });
  }

  if (pendingPayoffs.length > 0) {
    actionQueue.push({
      icon: Wallet,
      iconBg: '#FFF7ED',
      iconColor: '#B45309',
      count: pendingPayoffs.length,
      label: `Payoff${pendingPayoffs.length > 1 ? 's' : ''} pending settlement`,
      link: '/admin/payoffs',
      urgency: 'medium'
    });
  }

  if (pendingVerifications > 0) {
    actionQueue.push({
      icon: UserCheck,
      iconBg: '#EEEDFE',
      iconColor: '#534AB7',
      count: pendingVerifications,
      label: `Student verification${pendingVerifications > 1 ? 's' : ''} pending review`,
      link: '/admin/verification',
      urgency: 'low'
    });
  }

  if (pendingAgents > 0) {
    actionQueue.push({
      icon: Users,
      iconBg: '#FEF3C7',
      iconColor: '#92400E',
      count: pendingAgents,
      label: `Agent registration${pendingAgents > 1 ? 's' : ''} pending approval`,
      link: '/admin/agents',
      urgency: 'low'
    });
  }

  // ═══ RECENT ACTIVITY ═══
  const recentActivity = [];

  // Merge recent invoices, applications, payoffs into a timeline
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt || b.raisedAt) - new Date(a.createdAt || a.raisedAt))
    .slice(0, 3);

  const recentApps = [...applications]
    .sort((a, b) => new Date(b.createdAt || b.submittedAt) - new Date(a.createdAt || a.submittedAt))
    .slice(0, 3);

  const recentPayoffsList = [...payoffs]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 3);

  recentInvoices.forEach(inv => {
    const st = inv.financeReviewStatus || inv.status || 'Submitted';
    recentActivity.push({
      agent: inv.agentId?.agencyName || inv.agentId?.name || inv.agentName || 'Agent',
      action: `Invoice ${inv.invoiceNumber || 'Claim'} — ${st}`,
      time: inv.raisedAt || inv.createdAt,
      icon: FileText,
      iconBg: '#E6F1FB',
      iconColor: '#0C447C'
    });
  });

  recentApps.forEach(app => {
    recentActivity.push({
      agent: app.agentName || app.agent?.name || 'Agent',
      action: `Application for ${app.studentName || app.student?.name || 'student'} — ${formatStatus(app.status)}`,
      time: app.createdAt || app.submittedAt,
      icon: ClipboardList,
      iconBg: '#EEEDFE',
      iconColor: '#534AB7'
    });
  });

  recentPayoffsList.forEach(p => {
    const amount = getPayoffAmount(p);
    const st = (p.status || '').toUpperCase();
    recentActivity.push({
      agent: p.agentId?.agencyName || p.agentId?.name || p.agentName || 'Agent',
      action: `Payoff ${p.payoffNumber || ''} ${st === 'SETTLED' ? 'settled' : 'created'} — ${formatCurrency(amount)}`,
      time: p.settledAt || p.updatedAt || p.createdAt,
      icon: Wallet,
      iconBg: '#ECFDF5',
      iconColor: '#047857'
    });
  });

  // Sort by time descending
  recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));

  // ── Helpers ──
  function formatStatus(status) {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatTimeAgo(date) {
    if (!date) return 'Recently';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (isNaN(seconds) || seconds < 0) return 'Just now';
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 172800) return 'Yesterday';
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <div className="bg-[#FDFDFF] min-h-screen font-sans" data-testid="admin-dashboard">
      <div className="p-5 md:p-7">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
              Operations Overview
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Admin Portal
            </p>
          </div>
        </div>

        <div className="h-[0.5px] bg-slate-200 my-5" />

        {/* ═══ OPERATIONS KPIs ═══ */}
        <div className="mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operations</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Total Agents"
            value={totalAgents}
            subtitle={`${activeAgents} active · ${pendingAgents} pending`}
            icon={Users}
            color="#534AB7"
            bgColor="#EEEDFE"
            link="/admin/agents"
          />
          <KpiCard
            title="Total Students"
            value={totalStudents.toLocaleString()}
            subtitle={`${students.filter(s => s.status === 'Converted').length} converted`}
            icon={GraduationCap}
            color="#185FA5"
            bgColor="#E6F1FB"
            link="/admin/students"
          />
          <KpiCard
            title="Active Applications"
            value={activeApplications}
            subtitle={`${applications.length} total submitted`}
            icon={ClipboardList}
            color="#B45309"
            bgColor="#FFF7ED"
            link="/admin/applications"
          />
          <KpiCard
            title="Admissions"
            value={admissions}
            subtitle={applications.length > 0 ? `${((admissions / applications.length) * 100).toFixed(0)}% admission rate` : 'No data yet'}
            icon={BadgeCheck}
            color="#047857"
            bgColor="#ECFDF5"
            link="/admin/applications"
          />
        </div>

        {/* ═══ FINANCE KPIs ═══ */}
        <div className="mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finance</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Invoices Under Review"
            value={invoicesUnderReview}
            subtitle={`${invoices.length} total invoices`}
            icon={FileText}
            color="#0C447C"
            bgColor="#E6F1FB"
            link="/admin/invoices"
            highlight={invoicesUnderReview > 0}
          />
          <KpiCard
            title="Correction Required"
            value={correctionRequired}
            subtitle="Awaiting agent fix"
            icon={AlertTriangle}
            color={correctionRequired > 0 ? '#B91C1C' : '#6B7280'}
            bgColor={correctionRequired > 0 ? '#FCEBEB' : '#F3F4F6'}
            link="/admin/invoices"
            highlight={correctionRequired > 0}
          />
          <KpiCard
            title="Approved Invoices"
            value={approvedInvoices}
            subtitle="Ready for settlement"
            icon={CheckCircle2}
            color="#047857"
            bgColor="#ECFDF5"
            link="/admin/invoices"
          />
          <KpiCard
            title="Pending Payoffs"
            value={formatCurrency(pendingPayoffsAmount)}
            subtitle={`${pendingPayoffs.length} payoff${pendingPayoffs.length !== 1 ? 's' : ''} to settle`}
            icon={Clock}
            color="#B45309"
            bgColor="#FFF7ED"
            link="/admin/payoffs"
            highlight={pendingPayoffs.length > 0}
          />
        </div>

        {/* ═══ SETTLEMENT KPIs ═══ */}
        <div className="mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settlement</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <KpiCard
            title="Pending Settlement"
            value={pendingSettlementCount}
            subtitle="Payoffs not yet settled"
            icon={Clock}
            color="#B45309"
            bgColor="#FFF7ED"
            link="/admin/payoffs"
          />
          <KpiCard
            title="Settled Amount"
            value={formatCurrency(settledAmount)}
            subtitle={`${settledPayoffs.length} total settlements`}
            icon={BadgeCheck}
            color="#047857"
            bgColor="#ECFDF5"
            link="/admin/payoffs"
          />
          <KpiCard
            title="Settled This Month"
            value={formatCurrency(settledThisMonth)}
            subtitle={new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            icon={TrendingUp}
            color="#534AB7"
            bgColor="#EEEDFE"
            link="/admin/payoffs"
          />
        </div>

        {/* ═══ ACTION QUEUE + RECENT ACTIVITY ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Queue */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-base font-semibold text-[#111827] font-['Outfit']">Action Queue</h3>
                {actionQueue.length > 0 && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {actionQueue.reduce((sum, item) => sum + item.count, 0)}
                  </span>
                )}
              </div>
            </div>

            {actionQueue.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {actionQueue.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={i}
                      to={item.link}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: item.iconBg }}
                      >
                        <Icon className="w-4 h-4" style={{ color: item.iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[#111827] font-['Outfit']">{item.count}</span>
                          <span className="text-sm text-slate-600 font-medium">{item.label}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#042C53] transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">All clear — no pending actions</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-[#111827] font-['Outfit']">Recent Activity</h3>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Live Feed</span>
            </div>

            {recentActivity.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {recentActivity.slice(0, 8).map((activity, i) => {
                  const Icon = activity.icon;
                  return (
                    <div key={i} className="flex items-start gap-3.5 px-6 py-3.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: activity.iconBg }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: activity.iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#111827] font-medium leading-snug">
                          <span className="font-bold">{activity.agent}</span>
                          <span className="text-slate-500 ml-1.5">·</span>
                          <span className="text-slate-600 ml-1.5">{activity.action}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {formatTimeAgo(activity.time)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center">
                <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">No recent activity</p>
              </div>
            )}
          </div>
        </div>
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
