import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Download, 
  Printer, 
  Calendar, 
  Mail, 
  Phone, 
  Globe,
  TrendingUp,
  Users,
  CheckCircle2,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';

const AgentReportPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { agents, students, events, invoices } = useData();

  const agent = useMemo(() => agents.find(a => a.id === agentId), [agents, agentId]);

  const reportData = useMemo(() => {
    if (!agent) return null;

    const agentStudents = students.filter(s => s.agentId === agent.id);
    const registrations = agentStudents.length;
    const confirmed = agentStudents.filter(s => s.status === 'Confirmed' || s.status === 'Attended' || s.status === 'Converted').length;
    const converted = agentStudents.filter(s => s.status === 'Converted').length;
    
    // Status breakdown for Pie Chart
    const statusCounts = agentStudents.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // Monthly Trend (Mocked based on registration dates)
    const monthlyData = agentStudents.reduce((acc, s) => {
      const date = new Date(s.createdAt || Date.now());
      const month = date.toLocaleString('default', { month: 'short' });
      const found = acc.find(item => item.month === month);
      if (found) {
        found.count += 1;
      } else {
        acc.push({ month, count: 1 });
      }
      return acc;
    }, []).sort((a, b) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.indexOf(a.month) - months.indexOf(b.month);
    });

    return {
      agentStudents,
      registrations,
      confirmed,
      converted,
      convRate: registrations > 0 ? ((converted / registrations) * 100).toFixed(1) : '0.0',
      pieData,
      monthlyData: monthlyData.length > 0 ? monthlyData : [{ month: 'Current', count: registrations }]
    };
  }, [agent, students]);

  if (!agent || !reportData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 font-medium">Agent not found or data still loading...</p>
        <Button onClick={() => navigate('/admin/agents')}>Back to Agents</Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const COLORS = ['#042C53', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6 p-6 bg-[#F9FAFB] min-h-screen font-['Inter'] print:p-0 print:bg-white">
      {/* Header Actions - Hidden on Print */}
      <div className="flex items-center justify-between print:hidden">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/admin/agents')} 
          className="gap-2 -ml-2 text-[#6B7280] hover:text-[#111827] hover:bg-white/50"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Agents
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrint} className="gap-2 border-[#E5E7EB] text-[#6B7280] bg-white hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Print Report
          </Button>
          <Button onClick={handlePrint} className="gap-2 bg-[#042C53] hover:bg-[#0C447C] text-white shadow-lg shadow-[#042C53]/10">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Report Header Card */}
      <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#F3F4F6]">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-[#042C53] text-[#B5D4F4] px-3 py-0.5 rounded-lg uppercase tracking-wider text-[10px] font-bold border-none">
                Performance Report
              </Badge>
              <span className="text-[#6B7280] text-xs font-medium">Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <h1 className="text-3xl font-bold text-[#111827] font-['Outfit'] tracking-tight mb-2">{agent.name}</h1>
            <p className="text-[#6B7280] font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#9CA3AF]" /> {agent.agencyName || 'Independent Agent'} · {agent.region || 'Global'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <div className="flex items-center gap-2 text-sm text-[#4B5563] font-medium">
              <Mail className="w-4 h-4 text-[#9CA3AF]" /> {agent.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#4B5563] font-medium">
              <Phone className="w-4 h-4 text-[#9CA3AF]" /> {agent.phone || 'No phone provided'}
            </div>
            <Badge className={cn("px-3 py-1 rounded-lg border-none font-bold uppercase tracking-wider text-[10px]", agent.isVerified ? "bg-[#EAF3DE] text-[#27500A]" : "bg-[#FAEEDA] text-[#633806]")}>
              {agent.isVerified ? 'Verified Partner' : 'Pending Verification'}
            </Badge>
          </div>
        </div>

        {/* KPIs in the same card for cleaner look */}
        <div className="grid grid-cols-1 md:grid-cols-4 divide-x divide-[#F3F4F6] bg-white">
          {[
            { label: 'Total Registrations', val: reportData.registrations, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Confirmed Students', val: reportData.confirmed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Conversions', val: reportData.converted, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Conversion Rate', val: reportData.convRate + '%', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((kpi, i) => (
            <div key={i} className="p-8 hover:bg-[#F9FAFB] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className={`${kpi.bg} p-2 rounded-lg`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">{kpi.label}</span>
              </div>
              <p className="text-3xl font-bold text-[#111827] font-['Outfit']">{kpi.val.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Trend */}
        <Card className="lg:col-span-2 border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827] font-['Outfit']">Registration Trend</CardTitle>
            <CardDescription className="text-xs text-[#6B7280]">Monthly student registrations overview</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={reportData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 500 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 500 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #E5E7EB', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
                    fontFamily: 'Inter',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#042C53', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#042C53" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#042C53', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#111827] font-['Outfit']">Status Distribution</CardTitle>
            <CardDescription className="text-xs text-[#6B7280]">Registration funnel status</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4 flex flex-col items-center justify-center overflow-hidden">
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={reportData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {reportData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full mt-6 px-4">
              {reportData.pieData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[11px] font-semibold text-[#4B5563] uppercase tracking-wider">{entry.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#111827]">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Student List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-[#111827] font-['Outfit'] tracking-tight">Detailed Registrations</h3>
        <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] py-4">Student Name</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] py-4">Contact Info</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] py-4">Pipeline Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] py-4">Registration Date</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] py-4 text-right">Event Attribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.agentStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-[#6B7280] font-medium">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    No students registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.agentStudents.map((student) => {
                  const event = events.find(e => e.id === student.eventId || e._id === student.eventId);
                  return (
                    <TableRow key={student.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors group">
                      <TableCell className="py-4">
                        <div className="font-bold text-[#111827]">{student.name}</div>
                        <div className="text-[10px] text-[#9CA3AF] mt-0.5 uppercase tracking-wider font-semibold">{student.id.slice(-6)}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="text-xs text-[#4B5563] font-medium">{student.email}</div>
                        <div className="text-[10px] text-[#9CA3AF] mt-0.5">{student.phone || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={cn("px-2 py-0.5 rounded-lg border-none text-[9px] font-bold uppercase tracking-widest", 
                          student.status === 'Converted' ? 'bg-[#E1F5EE] text-[#085041]' :
                          student.status === 'Confirmed' ? 'bg-[#EEEDFE] text-[#3C3489]' :
                          'bg-[#F3F4F6] text-[#4B5563]'
                        )}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-xs text-[#4B5563] font-medium">
                        {new Date(student.createdAt || Date.now()).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="text-xs text-[#042C53] font-bold">{event?.title || 'Unknown Event'}</div>
                        <div className="text-[10px] text-[#9CA3AF] mt-0.5">{event?.location || 'General'}</div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t border-[#E5E7EB] pt-8 mt-12 text-center">
        <div className="flex items-center justify-center gap-2 text-[#9CA3AF] text-[10px] font-bold uppercase tracking-widest mb-2">
          <ShieldCheck className="w-3.5 h-3.5" /> Confidential Performance Document
        </div>
        <p className="text-[#9CA3AF] text-[10px]">© {new Date().getFullYear()} Agent Portal · Automatically generated analytics for {agent.name}</p>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 20mm; }
          body { background-color: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .recharts-responsive-container { min-width: 100% !important; height: 300px !important; }
          .Card { border: 1px solid #E5E7EB !important; box-shadow: none !important; break-inside: avoid; }
          .divide-x > * + * { border-left: 1px solid #F3F4F6 !important; }
        }
      `}} />
    </div>
  );
};

export default AgentReportPage;
