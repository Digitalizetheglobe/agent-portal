import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Users,
  Wallet,
  UserRound
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { useData } from '../../context/DataContext';
import { getFunnelLabel, getStudentStageInfo, hasFeesPaid, isBeyondApplication } from '../../utils/studentProgress';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';

const PAGE_SIZE = 10;
const COLORS = ['#042C53', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

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

const statusBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (['converted', 'paid', 'approved'].includes(s)) return 'bg-[#EAF3DE] text-[#27500A]';
  if (['confirmed', 'attended'].includes(s)) return 'bg-[#EEEDFE] text-[#3C3489]';
  if (['rejected', 'cancelled'].includes(s)) return 'bg-[#FCEBEB] text-[#791F1F]';
  if (['pending', 'submitted'].includes(s)) return 'bg-[#FAEEDA] text-[#633806]';
  return 'bg-[#F3F4F6] text-[#4B5563]';
};

// Same "Showing x–y of z · Previous / Next" footer used on the Students page
const Pager = ({ page, setPage, total, label }) => {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  if (total <= PAGE_SIZE) return null;
  const btn = 'px-3 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 font-semibold';
  return (
    <div className="flex items-center justify-between text-xs text-slate-600 px-4 py-3 border-t border-[#E5E7EB] bg-white print:hidden">
      <span>
        Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, total)} of {total.toLocaleString()} {label}
      </span>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</button>
        <span className="font-semibold">Page {current} of {totalPages}</span>
        <button className={btn} disabled={current >= totalPages} onClick={() => setPage(current + 1)}>Next</button>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, hint }) => (
  <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2">
    <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">{title}</h3>
    {hint && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{hint}</p>}
  </div>
);

const EmptyRow = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center gap-3 py-16">
    <Icon className="w-10 h-10 text-gray-200" />
    <p className="text-sm text-[#6B7280] font-medium">{text}</p>
  </div>
);

const AgentReportPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { agents, students, invoices, fetchAgents } = useData();

  const [tab, setTab] = useState('overview');
  const [pages, setPages] = useState({ students: 1, invoices: 1 });
  const setPage = (key) => (n) => setPages(p => ({ ...p, [key]: n }));

  // Keep the agent list fresh when the report is opened directly
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const agent = useMemo(() => agents.find(a => a.id === agentId), [agents, agentId]);

  const report = useMemo(() => {
    if (!agent) return null;

    const agentStudents = students.filter(s => s.agentId === agent.id);
    const registrations = agentStudents.length;
    // Past the application review (in the visa process or beyond), and with the fees paid
    const confirmed = agentStudents.filter(isBeyondApplication).length;
    const converted = agentStudents.filter(hasFeesPaid).length;

    const statusCounts = agentStudents.reduce((acc, s) => {
      const key = getFunnelLabel(s);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // Keyed by year-month so the trend is chronological across years
    const monthMap = agentStudents.reduce((acc, st) => {
      const d = new Date(st.createdAt || Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      acc[key] = acc[key] || { key, month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), count: 0, converted: 0 };
      acc[key].count += 1;
      if (hasFeesPaid(st)) acc[key].converted += 1;
      return acc;
    }, {});
    const monthlyData = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key));

    const agentInvoices = invoices.filter(inv => (inv.agentId?.id || inv.agentId?._id || inv.agentId) === agent.id);
    const st = (inv) => (inv.status || '').toLowerCase();
    const sum = (list) => list.reduce((t, inv) => t + (Number(inv.amount) || 0), 0);

    const funnelData = [
      { stage: 'Registered', value: registrations, fill: '#042C53' },
      { stage: 'In visa process', value: confirmed, fill: '#0EA5E9' },
      { stage: 'Fees paid', value: converted, fill: '#10B981' },
    ];

    const invoiceByStatus = Object.values(agentInvoices.reduce((acc, inv) => {
      const key = (inv.status || 'submitted').toLowerCase();
      acc[key] = acc[key] || { status: key.charAt(0).toUpperCase() + key.slice(1), amount: 0, count: 0 };
      acc[key].amount += Number(inv.amount) || 0;
      acc[key].count += 1;
      return acc;
    }, {}));

    return {
      funnelData,
      invoiceByStatus,
      agentStudents,
      registrations,
      confirmed,
      converted,
      convRate: registrations > 0 ? ((converted / registrations) * 100).toFixed(1) : '0.0',
      pieData,
      monthlyData,
      agentInvoices,
      paidAmount: sum(agentInvoices.filter(i => st(i) === 'paid')),
      pendingAmount: sum(agentInvoices.filter(i => st(i) !== 'paid' && st(i) !== 'rejected')),
    };
  }, [agent, students, invoices]);

  if (!agent || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 font-medium">Agent not found or data still loading...</p>
        <Button onClick={() => navigate('/admin/agents')}>Back to Agents</Button>
      </div>
    );
  }

  const slice = (list, key) => {
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const current = Math.min(pages[key], totalPages);
    return list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  };

  const isVerified = agent.isVerified || agent.verificationStatus === 'approved';
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'students', label: 'Students', count: report.registrations },
    { id: 'invoices', label: 'Invoices', count: report.agentInvoices.length },
  ];
  // On screen only the active tab shows; when printing, every section is included
  const show = (id) => (tab === id ? 'block' : 'hidden print:block');

  const kpis = [
    { label: 'Registrations', val: report.registrations, sub: 'Students registered by this agent', color: 'text-[#111827]' },
    { label: 'In visa process', val: report.confirmed, sub: 'Past the application review', color: 'text-[#0C447C]' },
    { label: 'Fees paid', val: report.converted, sub: `${report.convRate}% of students`, color: 'text-[#27500A]' },
    { label: 'Invoiced · paid', val: formatINR(report.paidAmount), sub: 'Invoices already settled', color: 'text-[#27500A]' },
    { label: 'Invoiced · outstanding', val: formatINR(report.pendingAmount), sub: 'Awaiting payment or review', color: 'text-[#633806]' },
  ];

  return (
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen font-['Inter'] print:bg-white">
      <button
        onClick={() => navigate('/admin/agents')}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#042C53] hover:underline mb-4 print:hidden"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </button>

      {/* Top row — same layout as the other admin pages */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">{agent.name}</h1>
            <Badge className={cn('border-none text-[10px] font-medium h-5',
              isVerified ? 'bg-[#EAF3DE] text-[#27500A]' : agent.verificationStatus === 'rejected' ? 'bg-[#FCEBEB] text-[#791F1F]' : 'bg-[#FAEEDA] text-[#633806]')}>
              {isVerified ? 'Verified' : agent.verificationStatus === 'rejected' ? 'Rejected' : 'Pending verification'}
            </Badge>
            <Badge className={cn('border-none text-[10px] font-medium h-5', agent.status === 'active' ? 'bg-[#E6F1FB] text-[#0C447C]' : 'bg-[#F3F4F6] text-[#4B5563]')}>
              {agent.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Performance report · {agent.agencyName || 'Independent agent'}{agent.region ? ` · ${agent.region}` : ''} · generated {formatDate(new Date())}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={() => navigate(`/admin/agents/${agent.id}`)} className="h-10 px-4 text-xs font-semibold border-slate-200 bg-white">
            <UserRound className="w-4 h-4 mr-2" /> Agent details
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="h-10 px-4 text-xs font-semibold border-slate-200 bg-white">
            <Printer className="w-4 h-4 mr-2" /> Print report
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="stat-grid grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
            <div className="text-[10px] text-[#6B7280] mb-1.5 uppercase font-bold tracking-wider">{k.label}</div>
            <div className={cn("text-2xl font-bold font-['Outfit']", k.color)}>{k.val}</div>
            <div className="text-[11px] text-[#9CA3AF] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6 overflow-x-auto print:hidden">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'pb-3 text-sm font-bold transition-all whitespace-nowrap',
              tab === t.id ? 'text-[#042C53] border-b-2 border-[#042C53]' : 'text-[#6B7280] hover:text-[#111827]'
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      <div className={cn('space-y-6', show('overview'))}>
        <div>
          <Card className=" border-[#E5E7EB] shadow-none overflow-hidden bg-white">
            <SectionHeader title="Registrations per month" hint="Students registered each month, and how many of them converted" />
            <div className="h-[260px] p-4">
              {report.monthlyData.length === 0 ? (
                <EmptyRow icon={Users} text="No registrations yet." />
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={report.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={8} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" name="Registrations" stroke="#042C53" strokeWidth={3}
                      dot={{ r: 4, fill: '#042C53', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="converted" name="Fees paid" stroke="#10B981" strokeWidth={2}
                      dot={{ r: 3, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
            <SectionHeader title="Student funnel" hint={`${report.convRate}% of registered students have their fees paid`} />
            <div className="h-[240px] p-4">
              {report.registrations === 0 ? (
                <EmptyRow icon={Users} text="No registrations yet." />
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={report.funnelData} layout="vertical" margin={{ left: 10, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <YAxis type="category" dataKey="stage" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4B5563' }} />
                    <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
                    <Bar dataKey="value" name="Students" radius={[0, 6, 6, 0]} barSize={28} label={{ position: 'right', fontSize: 12, fill: '#111827' }}>
                      {report.funnelData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
          <SectionHeader title="Invoiced amount by status" hint="How much money is paid, pending or rejected" />
          <div className="h-[220px] p-4">
            {report.invoiceByStatus.length === 0 ? (
              <EmptyRow icon={Wallet} text="No invoices raised yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={report.invoiceByStatus}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} formatter={(v, n, p) => [`${formatINR(v)} (${p.payload.count} invoice${p.payload.count === 1 ? '' : 's'})`, 'Amount']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={40}>
                    {report.invoiceByStatus.map((d, i) => (
                      <Cell key={i} fill={d.status.toLowerCase() === 'paid' ? '#10B981' : d.status.toLowerCase() === 'rejected' ? '#EF4444' : '#F59E0B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
          <SectionHeader title="Where the students are in the pipeline" hint="Number of students at each status" />
          {report.pieData.length === 0 ? (
            <EmptyRow icon={Users} text="No students to chart yet." />
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie data={report.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {report.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {report.pieData.map((e, i) => (
                  <div key={e.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[#4B5563]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /> {e.name}
                    </span>
                    <span className="font-semibold text-[#111827]">
                      {e.value} <span className="text-[#9CA3AF] font-normal">({Math.round((e.value / report.registrations) * 100)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* STUDENTS */}
      <div className={cn('mt-6', show('students'))}>
        <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
          <SectionHeader title="Students registered by this agent" hint="Click a row to open the student" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                  <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 pl-6">Student</TableHead>
                  <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3">Contact</TableHead>
                  <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 text-center">Progress</TableHead>
                  <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3">Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.agentStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={4}><EmptyRow icon={Users} text="No students registered yet." /></TableCell></TableRow>
                ) : slice(report.agentStudents, 'students').map((stu) => {
                  return (
                    <TableRow key={stu.id || stu._id} className="cursor-pointer hover:bg-[#F9FAFB]"
                      onClick={() => navigate(`/admin/students/${stu.id || stu._id}`)}>
                      <TableCell className="py-3 pl-6 text-[13px] font-medium text-[#111827]">{getStudentName(stu)}</TableCell>
                      <TableCell className="py-3">
                        <p className="text-[13px] text-[#111827]">{stu.email || '—'}</p>
                        <p className="text-[11px] text-[#6B7280]">{stu.phone || 'No phone'}</p>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <Badge className={cn('border-none text-[10px] font-medium h-5', getStudentStageInfo(stu).style)}>{getStudentStageInfo(stu).label}</Badge>
                      </TableCell>
                      <TableCell className="py-3 text-[13px] text-[#4B5563] whitespace-nowrap">{formatDate(stu.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pager page={pages.students} setPage={setPage('students')} total={report.agentStudents.length} label="students" />
        </Card>
      </div>

      {/* INVOICES */}
      <div className={cn('mt-6', show('invoices'))}>
        <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
          <SectionHeader title="Invoices raised by this agent" />
          {report.agentInvoices.length === 0 ? (
            <EmptyRow icon={Wallet} text="No invoices raised by this agent." />
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {slice(report.agentInvoices, 'invoices').map((inv) => (
                <div key={inv.id || inv._id} className="flex items-center justify-between px-6 py-3 gap-4">
                  <p className="text-[13px] font-medium text-[#111827] truncate">{inv.invoiceNumber || 'Invoice'}</p>
                  <div className="flex items-center gap-4">
                    <Badge className={cn('border-none text-[10px] font-medium h-5 capitalize', statusBadge(inv.status))}>{inv.status || 'submitted'}</Badge>
                    <span className="text-[13px] font-semibold text-[#111827] w-24 text-right">{formatINR(inv.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pager page={pages.invoices} setPage={setPage('invoices')} total={report.agentInvoices.length} label="invoices" />
        </Card>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background-color: white !important; }
          .recharts-responsive-container { min-width: 100% !important; }
        }
      `}} />
    </div>
  );
};

export default AgentReportPage;
