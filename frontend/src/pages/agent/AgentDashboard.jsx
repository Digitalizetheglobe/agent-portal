import React, { useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import ComplianceStatus from '../../components/agent/ComplianceStatus';
import { formatCurrency } from '../../utils/financialFormatters';

const AgentDashboard = () => {
  const { user } = useAuth();
  const {
    getStudentsByAgent,
    invoices,
    applications,
    payoffs,
    reviewQueue,
    fetchInvoices,
    fetchPayoffs,
    fetchApplications,
    fetchStudents
  } = useData();

  useEffect(() => {
    if (fetchInvoices) fetchInvoices();
    if (fetchPayoffs) fetchPayoffs();
    if (fetchApplications) fetchApplications();
  }, [fetchInvoices, fetchPayoffs, fetchApplications]);

  // Helper for payoff amounts (backend uses netAmount, grossCommission, or amount)
  const getPayoffAmount = (p) => Number(p.netAmount ?? p.grossCommission ?? p.amount ?? 0);

  // ── Scoped data for this agent ──
  const userId = user?.id || user?._id;
  const myStudents = getStudentsByAgent(userId) || [];

  // If user is logged in as agent, backend data is already scoped to them
  const myInvoices = (invoices || []).filter(inv => {
    if (user?.role === 'agent') return true;
    const invAgentId = inv.agentId?.id || inv.agentId?._id || inv.agentId;
    return String(invAgentId) === String(userId);
  });

  const myApplications = (applications || []).filter(app => {
    if (user?.role === 'agent') return true;
    const appAgentId = app.agentId?.id || app.agentId?._id || app.agentId;
    return String(appAgentId) === String(userId);
  });

  const myPayoffs = (payoffs || []).filter(p => {
    if (user?.role === 'agent') return true;
    const pAgentId = p.agentId?.id || p.agentId?._id || p.agentId;
    return String(pAgentId) === String(userId);
  });

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

  // ── KPI Card definitions ──
  const kpiCards = [
    {
      title: 'Total Students',
      value: totalStudents,
      subtitle: `${myStudents.filter(s => s.status === 'Converted').length} converted`,
      icon: GraduationCap,
      color: '#185FA5',
      bgColor: '#E6F1FB',
      link: '/agent/students'
    },
    {
      title: 'Active Applications',
      value: activeApplications,
      subtitle: `${myApplications.length} total submitted`,
      icon: ClipboardList,
      color: '#534AB7',
      bgColor: '#EEEDFE',
      link: '/agent/applications'
    },
    {
      title: 'Action Required',
      value: actionRequiredCount,
      subtitle: actionRequiredCount > 0 ? 'Items need your attention' : 'All clear',
      icon: AlertTriangle,
      color: actionRequiredCount > 0 ? '#B45309' : '#10B981',
      bgColor: actionRequiredCount > 0 ? '#FEF3C7' : '#ECFDF5',
      highlight: actionRequiredCount > 0,
      link: null
    },
    {
      title: 'Pending Payout',
      value: formatCurrency(pendingPayout),
      subtitle: `${pendingPayoffsList.length} payoff${pendingPayoffsList.length !== 1 ? 's' : ''} pending`,
      icon: Clock,
      color: '#B45309',
      bgColor: '#FFF7ED',
      link: '/agent/payoffs'
    },
    {
      title: 'Total Settled',
      value: formatCurrency(totalSettled),
      subtitle: `${settledPayoffsList.length} settlement${settledPayoffsList.length !== 1 ? 's' : ''} received`,
      icon: BadgeCheck,
      color: '#047857',
      bgColor: '#ECFDF5',
      link: '/agent/payoffs'
    }
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

  // ── Recent Applications (latest 5) ──
  const recentApplications = [...myApplications]
    .sort((a, b) => new Date(b.createdAt || b.submittedAt) - new Date(a.createdAt || a.submittedAt))
    .slice(0, 5);

  // ── Recent Invoices (latest 5) ──
  const recentInvoices = [...myInvoices]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // ── Helpers ──
  const getApplicationStatusStyle = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('admit') || s === 'completed' || s === 'enrolled') return 'bg-[#DCFCE7] text-[#166534]';
    if (s.includes('review') || s === 'processing' || s === 'submitted') return 'bg-[#E6F1FB] text-[#0C447C]';
    if (s.includes('reject') || s === 'cancelled') return 'bg-[#FCEBEB] text-[#791F1F]';
    if (s.includes('deposit') || s.includes('offer') || s === 'conditional_offer') return 'bg-[#FFF7ED] text-[#B45309]';
    if (s.includes('correction') || s.includes('action') || s.includes('document')) return 'bg-[#FEF3C7] text-[#92400E]';
    return 'bg-[#F3F4F6] text-[#374151]';
  };

  const getInvoiceStatusStyle = (status, reviewStatus) => {
    const s = (reviewStatus || status || '').toLowerCase();
    if (s.includes('approved') || s.includes('paid')) return 'bg-[#DCFCE7] text-[#166534]';
    if (s.includes('review') || s.includes('submitted') || s.includes('pending')) return 'bg-[#E6F1FB] text-[#0C447C]';
    if (s.includes('correction') || s.includes('reject')) return 'bg-[#FCEBEB] text-[#791F1F]';
    return 'bg-[#F3F4F6] text-[#374151]';
  };

  const formatStatus = (status) => {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

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

      {/* KPI Cards — 5 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          const inner = (
            <div
              key={index}
              className={`bg-white border rounded-xl p-5 transition-all duration-200 group ${
                kpi.highlight
                  ? 'border-amber-300 shadow-sm shadow-amber-100 hover:shadow-md hover:shadow-amber-100'
                  : 'border-slate-200 hover:shadow-md hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.title}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: kpi.bgColor }}
                >
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#111827] font-['Outfit']">
                {kpi.value}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">{kpi.subtitle}</p>
            </div>
          );

          return kpi.link ? (
            <Link key={index} to={kpi.link} className="block">{inner}</Link>
          ) : (
            <div key={index}>{inner}</div>
          );
        })}
      </div>

      {/* ═══ ACTION REQUIRED Section ═══ */}
      {actionItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Action Required</h2>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {actionRequiredCount}
            </span>
          </div>
          <div className="space-y-2">
            {actionItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-all hover:shadow-sm ${
                    item.urgency === 'high' ? 'border-red-200' : 'border-amber-200'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: item.iconBg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#111827]">{item.title}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.description}</p>
                  </div>
                  <Link
                    to={item.link}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#042C53] text-white text-xs font-bold rounded-lg hover:bg-[#0C447C] transition-colors"
                  >
                    {item.linkText} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* If no action required, show all-clear state */}
      {actionItems.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-900">You're all caught up!</p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              No pending actions — all your invoices, applications, and documents are in order.
            </p>
          </div>
        </div>
      )}

      {/* ═══ RECENT APPLICATIONS ═══ */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-[#111827] font-['Outfit']">Recent Applications</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Track your student application progress</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-[#042C53] font-semibold text-xs">
            <Link to="/agent/applications">View All <ArrowUpRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        </div>

        {recentApplications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FAFAFA] border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">University</th>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentApplications.map((app) => (
                  <tr key={app.id || app._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#E6F1FB] flex items-center justify-center text-[#0C447C] text-[10px] font-bold">
                          {(app.studentName || app.student?.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#111827]">
                          {app.studentName || app.student?.name || 'Student'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-sm text-slate-600">
                      {app.universityName || app.university?.name || '—'}
                    </td>
                    <td className="py-3.5 px-6 text-sm text-slate-500 max-w-[160px] truncate">
                      {app.courseName || app.course?.name || '—'}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider inline-block ${getApplicationStatusStyle(app.status)}`}>
                        {formatStatus(app.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        to={`/agent/applications`}
                        className="text-[11px] text-slate-500 hover:text-[#042C53] font-medium inline-flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">No applications yet</p>
            <p className="text-[11px] text-slate-400 mt-1">Applications you create for students will appear here</p>
          </div>
        )}
      </div>

      {/* ═══ RECENT INVOICES ═══ */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-[#111827] font-['Outfit']">Recent Invoices</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Track your commission invoice status</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-[#042C53] font-semibold text-xs">
            <Link to="/agent/invoices">Raise Invoice + <ArrowUpRight className="w-3.5 h-3.5 ml-1" /></Link>
          </Button>
        </div>

        {recentInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FAFAFA] border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice ID</th>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentInvoices.map((inv) => {
                  const displayStatus = inv.financeReviewStatus || inv.status || 'Pending';
                  const isApproved = ['approved', 'paid'].includes(displayStatus.toLowerCase());
                  const isRejectedOrCorrection = ['correctionrequired', 'correction_required', 'rejected'].includes(displayStatus.toLowerCase());

                  return (
                    <tr key={inv.id || inv._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 text-sm font-bold text-[#111827] font-mono">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-6 text-sm font-medium text-[#111827] font-['Outfit']">
                        {inv.amount > 0 ? formatCurrency(inv.amount, inv.currency) : 'Pending Review'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1 ${getInvoiceStatusStyle(inv.status, inv.financeReviewStatus)}`}>
                          {isApproved ? (
                            <><CheckCircle2 className="w-2.5 h-2.5" /> {formatStatus(displayStatus)}</>
                          ) : isRejectedOrCorrection ? (
                            <><XCircle className="w-2.5 h-2.5" /> {formatStatus(displayStatus)}</>
                          ) : (
                            formatStatus(displayStatus)
                          )}
                        </span>
                      </td>
                    <td className="py-3.5 px-6 text-[11px] text-slate-500 font-medium">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      }) : '—'}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">No invoices raised yet</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Create an invoice from the <Link to="/agent/invoices" className="text-[#042C53] hover:underline">Invoices</Link> page
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
