import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  GraduationCap,
  TrendingUp,
  ArrowRight,
  DollarSign,
  BarChart3,
  Ticket,
  FileText,
  Filter,
  ChevronDown
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const AdminDashboard = () => {
  const { agents, events, students, invoices, tickets, getStats } = useData();
  const [dateRange, setDateRange] = useState('1 month');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });

  // 1. Filtering Logic
  const getFilteredData = (data, dateField = 'createdAt') => {
    const now = new Date();
    let startDate = new Date();

    if (dateRange === '1 week') startDate.setDate(now.getDate() - 7);
    else if (dateRange === '1 month') startDate.setMonth(now.getMonth() - 1);
    else if (dateRange === '6 month') startDate.setMonth(now.getMonth() - 6);
    else if (dateRange === '1 year') startDate.setFullYear(now.getFullYear() - 1);
    else if (dateRange === 'custom' && customDates.start && customDates.end) {
      return data.filter(item => {
        const itemDate = new Date(item[dateField] || item.submittedAt);
        return itemDate >= new Date(customDates.start) && itemDate <= new Date(customDates.end);
      });
    } else {
      // Default to 1 month if something is weird
      startDate.setMonth(now.getMonth() - 1);
    }

    return data.filter(item => new Date(item[dateField] || item.submittedAt) >= startDate);
  };

  const filteredStudents = getFilteredData(students, 'submittedAt');
  const filteredInvoices = getFilteredData(invoices, 'createdAt');
  const filteredTickets = getFilteredData(tickets, 'createdAt');

  // 2. Re-calculate metrics based on filtered data
  const convertedStudents = filteredStudents.filter(s => s.status === 'Converted');
  const revenueValue = convertedStudents.length * 22500;
  const revenueDisplay = revenueValue >= 100000
    ? `₹${(revenueValue / 100000).toFixed(1)}L`
    : `₹${revenueValue.toLocaleString()}`;

  const totalCapacity = events.length * 50;
  const totalOccupied = filteredStudents.length;
  const avgFillRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  const statCards = [
    {
      title: 'Total agents',
      value: agents.length,
      subValue: `${agents.filter(a => a.status === 'active').length} active · ${agents.filter(a => a.status !== 'active').length} pending`,
      icon: Users,
      color: '#534AB7',
      bgColor: '#EEEDFE',
      trend: 'up'
    },
    {
      title: 'Total students',
      value: filteredStudents.length.toLocaleString(),
      subValue: `+${filteredStudents.length} in selected range`,
      icon: GraduationCap,
      color: '#185FA5',
      bgColor: '#E6F1FB',
      trend: 'up'
    },
    {
      title: 'Revenue (Period)',
      value: revenueDisplay,
      subValue: `${convertedStudents.length} conversions`,
      icon: DollarSign,
      color: '#3B6D11',
      bgColor: '#EAF3DE',
      trend: 'up'
    },
    {
      title: 'Avg seat fill rate',
      value: `${avgFillRate}%`,
      subValue: `${avgFillRate > 70 ? 'Above' : 'Below'} period target`,
      icon: BarChart3,
      color: '#854F0B',
      bgColor: '#FAEEDA',
      trend: avgFillRate > 70 ? 'up' : 'dn'
    }
  ];

  // Adaptive Chart Logic: Show days for 1 week, months for others
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData = [];
  if (dateRange === '1 week') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = dayNames[d.getDay()];
      const dayStudents = filteredStudents.filter(s => {
        const sd = new Date(s.submittedAt);
        return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
      });
      chartData.push({
        name: dayLabel,
        registrations: dayStudents.length,
        conversions: dayStudents.filter(s => s.status === 'Converted').length
      });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const monthStudents = filteredStudents.filter(s => {
        const sd = new Date(s.submittedAt);
        return sd.getMonth() === d.getMonth() && sd.getFullYear() === year;
      });
      chartData.push({
        name: m,
        registrations: monthStudents.length,
        conversions: monthStudents.filter(s => s.status === 'Converted').length
      });
    }
  }

  const statusBreakdown = {};
  filteredStudents.forEach(s => {
    statusBreakdown[s.status] = (statusBreakdown[s.status] || 0) + 1;
  });

  const STATUS_COLORS = ['#85B7EB', '#7F77DD', '#5DCAA5', '#97C459', '#EF9F27'];
  const statusData = Object.keys(statusBreakdown).map((status, index) => ({
    name: status,
    value: statusBreakdown[status],
    color: STATUS_COLORS[index % STATUS_COLORS.length]
  }));

  const agentPerformance = agents.map(agent => {
    const agentStudents = filteredStudents.filter(s => s.agentId === agent.id || s.agentName === agent.name);
    const registrations = agentStudents.length;
    const converted = agentStudents.filter(s => s.status === 'Converted').length;
    const rate = registrations > 0 ? ((converted / registrations) * 100).toFixed(1) : '0.0';

    return {
      ...agent,
      registrations,
      converted,
      rate
    };
  }).sort((a, b) => b.registrations - a.registrations).slice(0, 5);

  // 4. Relative time formatter for support tickets
  const formatTime = (date) => {
    if (!date) return 'Recently';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (isNaN(seconds)) return 'Recently';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return 'Yesterday';
  };

  return (
    <div className="bg-[#FDFDFF] min-h-screen font-sans" data-testid="admin-dashboard">
      <div className="max-w-[1400px] mx-auto p-7">
        {/* Topbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Admin Command Centre</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · System Stats
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm animate-in fade-in slide-in-from-right-4">
                <input
                  type="date"
                  className="text-xs font-medium text-slate-600 outline-none border-none bg-transparent"
                  value={customDates.start}
                  onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                />
                <span className="text-slate-300">|</span>
                <input
                  type="date"
                  className="text-xs font-medium text-slate-600 outline-none border-none bg-transparent"
                  value={customDates.end}
                  onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                />
              </div>
            )}
            <div className="relative group">
              <select
                className="appearance-none bg-white border border-slate-200 rounded-lg px-4 pr-10 py-2.5 text-xs font-bold text-slate-700 shadow-sm cursor-pointer hover:border-[#042C53] transition-all outline-none uppercase tracking-wider"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="1 week">1 Week</option>
                <option value="1 month">1 Month</option>
                <option value="6 month">6 Month</option>
                <option value="1 year">1 Year</option>
                <option value="custom">Custom Range</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#042C53]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="h-[0.5px] bg-slate-200 my-6" />

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.bgColor }}>
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                </div>
                <div className="text-3xl font-medium text-slate-900 font-['Outfit']">{stat.value}</div>
                <div className={`text-[11px] mt-2 font-medium flex items-center gap-1.5 ${stat.trend === 'up' ? 'text-[#3B6D11]' : stat.trend === 'dn' ? 'text-[#A32D2D]' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${stat.trend === 'up' ? 'bg-[#639922]' : stat.trend === 'dn' ? 'bg-[#E24B4A]' : 'bg-slate-300'}`} />
                  {stat.subValue}
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 px-7">
            <div className="flex items-center justify-between mb-5">
              <span className="text-lg font-medium text-slate-900 font-['Outfit']">Registration Performance</span>
              <span className="text-[12px] text-slate-500 cursor-pointer hover:text-slate-900 font-medium">By agent ↗</span>
            </div>
            <div className="flex gap-4 mb-4">
              <span className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#378ADD]" /> Registrations
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#1D9E75]" /> Conversions
              </span>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888780' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888780' }} />
                  <Tooltip
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '8px', border: '0.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }}
                  />
                  <Bar dataKey="registrations" fill="#378ADD" radius={[3, 3, 0, 0]} barSize={32} />
                  <Bar dataKey="conversions" fill="#1D9E75" radius={[3, 3, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 px-7">
            <div className="flex items-center justify-between mb-5">
              <span className="text-lg font-medium text-slate-900 font-['Outfit']">Student Status</span>
              <span className="text-[12px] text-slate-500 cursor-pointer hover:text-slate-900 font-medium">Details ↗</span>
            </div>
            <div className="flex flex-col items-center gap-6">
              <div className="w-full h-[140px] relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                      {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full">
                {statusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] text-slate-500 truncate">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Agents */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 px-7 mb-6">
          <div className="flex items-center justify-between mb-5">
            <span className="text-lg font-medium text-slate-900 font-['Outfit']">Top Performing Agents</span>
            <Link to="/admin/agents" className="text-[12px] text-slate-500 hover:text-slate-900 font-medium">View all agents ↗</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left font-medium text-slate-400 py-3 px-3 uppercase tracking-wider">Agent</th>
                  <th className="text-left font-medium text-slate-400 py-3 px-3 uppercase tracking-wider">Registrations</th>
                  <th className="text-left font-medium text-slate-400 py-3 px-3 uppercase tracking-wider">Confirmed</th>
                  <th className="text-left font-medium text-slate-400 py-3 px-3 uppercase tracking-wider">Converted</th>
                  <th className="text-left font-medium text-slate-400 py-3 px-3 uppercase tracking-wider">Rate</th>
                  <th className="text-left font-medium text-slate-400 py-3 px-3 uppercase tracking-wider">Status</th>
                  <th className="text-right font-medium text-slate-400 py-3 px-3 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agentPerformance.map((agent, idx) => {
                  const colors = [
                    { bg: '#E6F1FB', text: '#0C447C' },
                    { bg: '#E1F5EE', text: '#085041' },
                    { bg: '#FAEEDA', text: '#633806' },
                    { bg: '#FCEBEB', text: '#791F1F' },
                    { bg: '#EEEDFE', text: '#3C3489' }
                  ];
                  const c = colors[idx % colors.length];
                  return (
                    <tr key={agent.id} className="text-slate-900 hover:bg-slate-50/30 transition-colors">
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 shadow-sm" style={{ backgroundColor: c.bg, color: c.text }}>
                            {agent.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm text-slate-600">{agent.registrations}</td>
                      <td className="py-4 px-3 text-sm text-slate-600">{agent.confirmed}</td>
                      <td className="py-4 px-3 text-sm text-slate-600">{agent.converted}</td>
                      <td className="py-4 px-3">
                        <span className="text-sm font-medium" style={{ color: parseFloat(agent.rate) > 15 ? '#27500A' : parseFloat(agent.rate) > 10 ? '#BA7517' : '#A32D2D' }}>
                          {agent.rate}%
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${agent.status === 'active' ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-[#FAEEDA] text-[#633806]'}`}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <Link to={`/admin/agents?id=${agent.id}`} className="text-slate-400 font-medium text-xs hover:text-slate-900">View ↗</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 3: Occupancy & Invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 px-7">
            <div className="flex items-center justify-between mb-5">
              <span className="text-lg font-medium text-slate-900 font-['Outfit']">Event Seat Occupancy</span>
              <span className="text-[12px] text-slate-500 cursor-pointer hover:text-slate-900 font-medium">Analytics ↗</span>
            </div>
            <div className="space-y-4 mb-6">
              {events.slice(0, 5).map((event, idx) => {
                const eventStudents = students.filter(s => s.eventId === event.id).length;
                const capacity = event.capacity || 50;
                const fillRate = Math.min(100, Math.round((eventStudents / capacity) * 100));
                const colors = ['#378ADD', '#7F77DD', '#5DCAA5', '#EF9F27', '#E24B4A'];
                return (
                  <div key={event.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-medium">
                      <span className="text-slate-900 truncate max-w-[220px]">{event.title}</span>
                      <span className="text-slate-500">{fillRate}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${fillRate}%`, backgroundColor: colors[idx % colors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <Button size="sm" className="w-full py-2.5 text-[12px] font-medium border border-[#042C53] rounded-lg bg-[#042C53] text-[#B5D4F4] hover:bg-[#0C447C] transition-colors" asChild>
              <Link to="/admin/events">Manage All Events</Link>
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 px-7">
            <div className="flex items-center justify-between mb-5">
              <span className="text-lg font-medium text-slate-900 font-['Outfit']">Invoice Queue</span>
              <span className="text-[12px] text-slate-500 cursor-pointer hover:text-slate-900 font-medium">Review All ↗</span>
            </div>
            <div className="divide-y divide-slate-100 mb-6">
              {invoices.length > 0 ? invoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-medium text-slate-400">INV</div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-500 truncate">{inv.agentName || 'Agent'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-medium text-slate-900">₹{inv.amount.toLocaleString()}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${inv.status === 'approved' ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-[#FAEEDA] text-[#633806]'}`}>
                      {inv.status === 'approved' ? 'Approved' : 'Review'}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-[12px] text-slate-400 font-medium">No invoices pending review.</div>
              )}
            </div>
            <Button size="sm" className="w-full py-2.5 text-[12px] font-medium border border-[#042C53] rounded-lg bg-[#042C53] text-[#B5D4F4] hover:bg-[#0C447C] transition-colors" asChild>
              <Link to="/admin/invoices">Process Financials</Link>
            </Button>
          </div>
        </div>

        {/* Support Tickets */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 px-7 mb-6">
          <div className="flex items-center justify-between mb-5">
            <span className="text-lg font-medium text-slate-900 font-['Outfit']">System Helpdesk</span>
            <span className="text-[12px] text-slate-500 cursor-pointer hover:text-slate-900 font-medium">Manage ↗</span>
          </div>
          <div className="divide-y divide-slate-100">
            {tickets.length > 0 ? tickets.slice(0, 4).map((ticket) => (
              <div key={ticket.id} className="flex items-start gap-4 py-4">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${ticket.priority === 'high' ? 'bg-[#E24B4A]' : 'bg-[#EF9F27]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 leading-snug">{ticket.subject}</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">{ticket.userName || 'User'} · {ticket.category} · {formatTime(ticket.createdAt)}</div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider shrink-0 ${ticket.status === 'open' ? 'bg-[#FCEBEB] text-[#791F1F]' : 'bg-[#FAEEDA] text-[#633806]'}`}>
                  {ticket.status}
                </span>
              </div>
            )) : (
              <div className="py-10 text-center text-[12px] text-slate-400 font-medium">No open support tickets.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
