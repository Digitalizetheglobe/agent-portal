import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  GraduationCap,
  TrendingUp,
  ArrowRight,
  FileText,
  UserCheck,
  Clock,
  CheckCircle2,
  DollarSign,
  Ticket,
  ChevronDown,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import ComplianceStatus from '../../components/agent/ComplianceStatus';
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

const AgentDashboard = () => {
  const { user } = useAuth();
  const { getEventsForAgent, getStudentsByAgent, agents, getStats, invoices, students, tickets, createTicket } = useData();
  const stats = getStats();

  const [dateRange, setDateRange] = useState('1 month');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });

  const assignedEvents = getEventsForAgent(user?.id);
  const rawMyStudents = getStudentsByAgent(user?.id);
  const rawMyInvoices = invoices.filter(inv => inv.agentId === user?.id);
  const rawMyTickets = tickets.filter(t => t.agentId === user?.id || t.userId === user?.id);

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
      startDate.setMonth(now.getMonth() - 1);
    }

    return data.filter(item => new Date(item[dateField] || item.submittedAt) >= startDate);
  };

  const myStudents = getFilteredData(rawMyStudents, 'submittedAt');
  const myInvoices = getFilteredData(rawMyInvoices, 'createdAt');
  const myTickets = getFilteredData(rawMyTickets, 'createdAt');

  const upcomingEvents = assignedEvents.filter(e => new Date(e.date) >= new Date());

  // Calculate earnings (Assume ₹22.5k per converted student)
  const convertedCount = myStudents.filter(s => s.status === 'Converted').length;
  const earningsValue = convertedCount * 22500;
  const earningsDisplay = earningsValue >= 100000
    ? `₹${(earningsValue / 100000).toFixed(1)}L`
    : `₹${earningsValue.toLocaleString()}`;

  // Action items: Students with status 'Registered' but no docs, or 'Review' status
  const actionItems = myStudents.filter(s => s.status === 'Registered' || s.status === 'Review').length;

  const statCards = [
    {
      title: 'Active Events',
      value: upcomingEvents.length,
      trend: `${assignedEvents.length} total assignments`,
      icon: Calendar,
      color: 'text-[#534AB7]',
      bgColor: 'bg-[#EEEDFE]',
    },
    {
      title: 'My Students',
      value: myStudents.length,
      trend: `+${myStudents.length} in range`,
      icon: GraduationCap,
      color: 'text-[#185FA5]',
      bgColor: 'bg-[#E6F1FB]',
    },
    {
      title: 'MTD Earnings',
      value: earningsDisplay,
      trend: `${convertedCount} conversions`,
      icon: DollarSign,
      color: 'text-[#3B6D11]',
      bgColor: 'bg-[#EAF3DE]',
    },
    {
      title: 'Action Items',
      value: actionItems,
      trend: 'Needs document review',
      icon: Ticket,
      color: 'text-[#854F0B]',
      bgColor: 'bg-[#FAEEDA]',
    }
  ];

  const STATUS_COLORS = ['#85B7EB', '#7F77DD', '#5DCAA5', '#97C459', '#EF9F27'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Adaptive Chart Logic: Show days for 1 week, months for others
  const chartData = [];
  if (dateRange === '1 week') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = dayNames[d.getDay()];
      const dayStudents = myStudents.filter(s => {
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
      const monthStudents = myStudents.filter(s => {
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

  const myStatusBreakdown = {};
  myStudents.forEach(s => {
    myStatusBreakdown[s.status] = (myStatusBreakdown[s.status] || 0) + 1;
  });

  const statusData = Object.keys(myStatusBreakdown).map((status, index) => ({
    name: status,
    value: myStatusBreakdown[status],
    color: STATUS_COLORS[index % STATUS_COLORS.length]
  }));

  const getStudentDisplayName = (student) => {
    if (student.name) return student.name;
    if (student.customFields) {
      const nameKey = Object.keys(student.customFields).find(key =>
        key.toLowerCase().includes('name') ||
        key.toLowerCase().includes('full')
      );
      if (nameKey) return student.customFields[nameKey];
      const firstVal = Object.values(student.customFields)[0];
      if (firstVal && typeof firstVal === 'string') return firstVal;
    }
    return 'Student';
  };

  const formatTime = (date) => {
    if (!date) return 'Recently';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (isNaN(seconds)) return 'Recently';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return 'Yesterday';
  };

  const handleRequestMoreEvents = async () => {
    try {
      await createTicket({
        subject: 'Request for More Events',
        description: 'I would like to request more event assignments for my agency to onboard more students.',
        category: 'Other',
        priority: 'Medium'
      });
    } catch (error) {
      console.error('Failed to file request:', error);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 bg-[#F9FAFB] min-h-screen" data-testid="agent-dashboard">
      {/* Topbar / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
            Agent Command Centre
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Welcome back, {user?.name || 'Partner'} · {user?.isVerified ? 'QStudy Verified Agent' : 'Agent'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
              <input
                type="date"
                className="text-xs font-semibold text-[#111827] outline-none border-none bg-transparent"
                value={customDates.start}
                onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
              />
              <span className="text-gray-300">|</span>
              <input
                type="date"
                className="text-xs font-semibold text-[#111827] outline-none border-none bg-transparent"
                value={customDates.end}
                onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
              />
            </div>
          )}
          <div className="relative group">
            <select
              className="appearance-none bg-white border border-gray-200 rounded-lg px-4 pr-10 py-2.5 text-xs font-bold text-[#111827] shadow-sm cursor-pointer hover:border-[#042C53] transition-all outline-none uppercase tracking-wider"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="1 week">1 Week</option>
              <option value="1 month">1 Month</option>
              <option value="6 month">6 Month</option>
              <option value="1 year">1 Year</option>
              <option value="custom">Custom Range</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-[#042C53]">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          {/* <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user?.name?.split(' ').map(n => n[0]).join('') || 'AG'}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-[#111827]">{user?.name || 'Agent Name'}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Regional Partner</p>
            </div>
          </div> */}
        </div>
      </div>

      <div className="w-full h-px bg-gray-200 my-6" />

      {/* Compliance Warning Section */}
      <ComplianceStatus />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-bold text-[#111827] font-['Outfit']">
                    {stat.value}
                  </h3>
                  <p className="text-[11px] font-medium flex items-center gap-1 text-muted-foreground">
                    {stat.trend}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 border border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-['Outfit'] text-[#111827]">My Performance</CardTitle>
                <CardDescription>Monthly registration trends</CardDescription>
              </div>
              <span className="flex items-center text-[12px] text-slate-500 cursor-pointer hover:text-slate-900 font-medium">Details <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" /></span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#378ADD]" /> Registrations
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#1D9E75]" /> conversions
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
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-['Outfit'] text-[#111827]">Student Status</CardTitle>
                <CardDescription>Status distribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6">
              <div className="w-full h-[150px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                      {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
                {statusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] text-slate-500 truncate max-w-[80px]">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-['Outfit'] text-[#111827]">Recent Registrations</CardTitle>
              <CardDescription>Students you've onboarded recently</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-[#042C53] font-semibold text-xs">
              <Link to="/agent/dashboard">View all <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {myStudents.length > 0 ? myStudents.slice(-3).reverse().map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 px-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-[#E6F1FB] flex items-center justify-center text-[#0C447C] font-bold text-xs">
                      {getStudentDisplayName(student).split(' ').map(n => n ? n[0] : '').join('') || 'S'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#111827]">{getStudentDisplayName(student)}</p>
                      <p className="text-[11px] text-muted-foreground font-medium">Registered on {new Date(student.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-3 py-0.5 border-none font-bold uppercase tracking-wider ${student.status === 'Converted' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#E6F1FB] text-[#0C447C]'
                    }`}>
                    {student.status || 'Registered'}
                  </Badge>
                </div>
              )) : (
                <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                  No students registered yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assigned Events Panel */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-['Outfit'] text-[#111827]">Assigned Events</CardTitle>
              <CardDescription>Upcoming recruitment campaigns</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-[#042C53] font-semibold text-xs">
              <Link to="/agent/events-management">Full calendar <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 px-6">
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  to={`/agent/events/${event.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-[#042C53] hover:shadow-sm transition-all group"
                >
                  <div className="w-11 h-11 rounded-lg bg-[#EEEDFE] flex items-center justify-center text-[#534AB7] group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#111827] truncate">{event.title}</p>
                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(event.date).toLocaleDateString()} · {event.location || 'Virtual'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[#042C53] p-0 h-auto">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )) : (
                <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                  No upcoming events assigned.
                </div>
              )}
            </div>
            <button
              onClick={handleRequestMoreEvents}
              className="w-full mt-6 p-4 bg-[#F9FAFB] rounded-xl border border-dashed border-gray-300 text-center hover:bg-gray-50 hover:border-[#042C53] transition-all group focus:outline-none focus:ring-2 focus:ring-[#042C53]/10"
            >
              <p className="text-[11px] font-semibold text-[#042C53] group-hover:text-[#0C447C] flex items-center justify-center gap-2">
                <Ticket className="w-3.5 h-3.5" /> Need more events? Click here to file a request
              </p>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-['Outfit'] text-[#111827]">Recent Invoices</CardTitle>
            <CardDescription>Status of your commission payments</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-[#042C53] font-semibold text-xs">
            <Link to="/agent/invoices">Raise new invoice +</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F9FAFB] border-y border-gray-100">
                <tr>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Invoice ID</th>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Event</th>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myInvoices.length > 0 ? myInvoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-sm font-bold text-[#111827]">{inv.invoiceNumber}</td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">Event ID: {inv.eventId.slice(-6)}</td>
                    <td className="py-4 px-6 text-sm font-bold text-[#111827]">₹{inv.amount.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <Badge variant="outline" className={`text-[9px] px-2 py-0.5 border-none font-bold uppercase tracking-wider ${inv.status === 'paid' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}>
                        {inv.status === 'paid' ? (
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Paid</span>
                        ) : inv.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-[11px] text-muted-foreground font-medium">{new Date(inv.createdAt).toLocaleDateString()}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm font-medium">
                      No invoices raised yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* Support Tickets Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-['Outfit'] text-[#111827]">Support & Communications</CardTitle>
            <CardDescription>Recent helpdesk tickets and updates</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-[#042C53] font-semibold text-xs">
            <Link to="/agent/support">Helpdesk <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {myTickets.length > 0 ? myTickets.slice(0, 4).map((ticket) => (
              <div key={ticket.id} className="flex items-start gap-4 p-4 px-6 hover:bg-gray-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${ticket.priority === 'high' ? 'bg-[#E24B4A]' : 'bg-[#EF9F27]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#111827] leading-snug">{ticket.subject}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">{ticket.category} · {formatTime(ticket.createdAt)}</p>
                </div>
                <Badge variant="outline" className={`text-[9px] px-2 py-0.5 border-none font-bold uppercase tracking-wider ${ticket.status === 'open' ? 'bg-[#FCEBEB] text-[#791F1F]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                  {ticket.status}
                </Badge>
              </div>
            )) : (
              <div className="p-10 text-center text-slate-400 italic text-sm font-medium">No active support tickets.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentDashboard;
