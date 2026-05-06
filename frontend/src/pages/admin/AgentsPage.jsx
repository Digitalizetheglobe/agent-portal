import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  MoreHorizontal,
  ShieldCheck,
  ShieldAlert,
  Users,
  Download,
  ChevronRight,
  Mail,
  Phone,
  Globe,
  Calendar,
  FileText,
  Check,
  X,
  Bell,
  TrendingUp,
  MapPin,
  ArrowUpRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import AgentModal from '../../components/modals/AgentModal';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const AgentsPage = () => {
  const navigate = useNavigate();
  const {
    agents,
    deleteAgent,
    getStats,
    students,
    events,
    invoices,
    verifyAgent,
    viewAgentDocument,
    updateAgent
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [agentInDrawer, setAgentInDrawer] = useState(null);

  const stats = getStats();

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Helper to get random colors for avatars (to match mockup)
  const getAvatarStyles = (name) => {
    const colors = [
      { bg: 'bg-[#E6F1FB]', text: 'text-[#0C447C]' },
      { bg: 'bg-[#E1F5EE]', text: 'text-[#085041]' },
      { bg: 'bg-[#FAEEDA]', text: 'text-[#633806]' },
      { bg: 'bg-[#FCEBEB]', text: 'text-[#791F1F]' },
      { bg: 'bg-[#EEEDFE]', text: 'text-[#3C3489]' },
    ];
    const index = name ? name.length % colors.length : 0;
    return colors[index];
  };

  // Filter and compute agent data
  const processedAgents = useMemo(() => {
    return agents.map(agent => {
      const agentStudents = students.filter(s => s.agentId === agent.id);
      const registrations = agentStudents.length;
      const confirmed = agentStudents.filter(s => s.status === 'Confirmed' || s.status === 'Attended' || s.status === 'Converted').length;
      const converted = agentStudents.filter(s => s.status === 'Converted').length;
      const convRate = registrations > 0 ? ((converted / registrations) * 100).toFixed(1) : '0.0';
      const assignedEvents = events.filter(e => e.assignedAgents?.includes(agent.id)).length;
      const totalCommission = invoices
        .filter(inv => inv.agentId === agent.id && inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      return {
        ...agent,
        registrations,
        confirmed,
        converted,
        convRate: convRate + '%',
        assignedEvents,
        totalCommission: `₹${(totalCommission / 1000).toFixed(1)}k`
      };
    });
  }, [agents, students, events, invoices]);

  const filteredAgents = useMemo(() => {
    return processedAgents.filter(agent => {
      const matchesSearch =
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (agent.agencyName && agent.agencyName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilter =
        currentFilter === 'all' ||
        (currentFilter === 'active' && agent.status === 'active') ||
        (currentFilter === 'pending' && !agent.isVerified) ||
        (currentFilter === 'inactive' && agent.status === 'inactive');

      return matchesSearch && matchesFilter;
    });
  }, [processedAgents, searchQuery, currentFilter]);

  const pendingVerificationAgents = useMemo(() => {
    return processedAgents.filter(agent => !agent.isVerified);
  }, [processedAgents]);

  // Event handlers
  const handleCreate = () => {
    setSelectedAgent(null);
    setViewMode(false);
    setModalOpen(true);
  };

  const handleEdit = (agent) => {
    setSelectedAgent(agent);
    setViewMode(false);
    setModalOpen(true);
  };

  const handleView = (agent) => {
    setAgentInDrawer(agent);
    setDrawerOpen(true);
  };

  const handleDeleteClick = (agent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (agentToDelete) {
      deleteAgent(agentToDelete.id);
      toast.success('Agent deleted', {
        description: `${agentToDelete.name} has been removed.`
      });
    }
    setDeleteDialogOpen(false);
    setAgentToDelete(null);
  };

  const handleApprove = async (agentId) => {
    try {
      await verifyAgent(agentId, { isVerified: true });
      toast.success('Agent verified successfully');
    } catch (error) {
      console.error('Failed to verify agent', error);
    }
  };

  const handleDeactivate = async (agent) => {
    try {
      await updateAgent(agent.id, { status: 'inactive' });
      toast.success('Agent deactivated', {
        description: `${agent.name} is now inactive.`
      });
      setDrawerOpen(false);
    } catch (error) {
      console.error('Failed to deactivate agent', error);
    }
  };

  const handleSendNotification = (agent) => {
    toast.info('Notification system', {
      description: `Sending notification to ${agent.name}... (Feature coming soon)`
    });
  };

  const handleAssignEvents = (agent) => {
    setSelectedAgent(agent);
    setViewMode(false);
    setModalOpen(true);
    setDrawerOpen(false);
  };

  const handlePerformanceReport = (agent) => {
    navigate(`/admin/agents/${agent.id}/report`);
  };

  const handleReject = async (agentId) => {
    const reason = prompt('Please enter a reason for rejection:');
    if (reason) {
      try {
        await verifyAgent(agentId, { isVerified: false, remarks: reason });
        toast.success('Agent verification rejected');
      } catch (error) {
        console.error('Failed to reject agent', error);
      }
    }
  };

  return (
    <div className="space-y-6 p-6 bg-[#F9FAFB] min-h-screen font-['Inter']" data-testid="agents-page">
      {/* Top Row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Agent Management</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {agents.length} agents · {agents.filter(a => !a.isVerified).length} pending verification
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm"
            className="text-xs font-semibold h-10 px-4 border-slate-200 hover:bg-slate-50 transition-all hover:text-[#042C53]"
          >
            <Download size={14} className="mr-2" /> Export
          </Button>
          <Button onClick={handleCreate} size="sm"
            className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-10 px-5 rounded-lg shadow-lg shadow-[#042C53]/10 transition-all active:scale-95 gap-2"
          >  <Plus className="w-4 h-4" />  Onboard Agent
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total agents', val: agents.length, sub: `${agents.filter(a => a.status === 'active').length} active`, subColor: 'text-[#27500A]' },
          { label: 'Pending verification', val: agents.filter(a => !a.isVerified).length, sub: 'Needs review', subColor: 'text-[#633806]' },
          { label: 'Avg conversion rate', val: stats.conversionRate + '%', sub: '+2.1% vs last month', subColor: 'text-[#27500A]' },
          { label: 'Total commissions', val: `₹${(invoices.reduce((s, i) => s + (i.amount || 0), 0) / 100000).toFixed(1)}L`, sub: `₹${(invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0) / 1000).toFixed(0)}K pending`, subColor: 'text-[#633806]' },
        ].map((kpi, i) => (
          <Card key={i} className="border-[#E5E7EB] bg-white shadow-none">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-semibold text-[#111827] mt-1">{kpi.val}</p>
              <p className={cn("text-[10px] font-medium mt-1", kpi.subColor)}>{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search by name, agency, or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 border-[#E5E7EB] bg-white text-sm placeholder:text-[#9CA3AF] focus-visible:ring-[#042C53]/10"
          />
        </div>
        <div className="flex bg-white border border-[#E5E7EB] rounded-lg p-1 gap-1 overflow-x-auto w-full md:w-auto">
          {['all', 'active', 'pending', 'inactive'].map((f) => (
            <button
              key={f}
              onClick={() => setCurrentFilter(f)}
              className={cn(
                "px-3 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap",
                currentFilter === f
                  ? "bg-[#E6F1FB] text-[#0C447C]"
                  : "text-[#6B7280] hover:bg-gray-50"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? agents.length : f === 'pending' ? agents.filter(a => !a.isVerified).length : agents.filter(a => a.status === f).length})
            </button>
          ))}
        </div>
      </div>

      {/* Verification Queue */}
      {pendingVerificationAgents.length > 0 && (
        <Card className="border-[#E5E7EB] shadow-none overflow-hidden">
          <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2">
            <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Verification queue · {agents.filter(a => !a.isVerified).length} new</h3>
          </div>
          <div className="p-4 flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {pendingVerificationAgents.map((agent) => {
              const styles = getAvatarStyles(agent.name);
              return (
                <div key={agent.id} className="flex-shrink-0 w-full md:w-[calc((100%-32px)/3)] min-w-[320px] p-4 rounded-xl border border-[#E5E7EB] bg-white group hover:border-[#042C53]/20 transition-all snap-start">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs", styles.bg, styles.text)}>
                      {getInitials(agent.name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[#111827]">{agent.name}</h4>
                        <Badge className="bg-[#FAEEDA] text-[#633806] border-none text-[10px] h-5">Pending</Badge>
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                        {agent.agencyName || 'Independent'} · {agent.region || 'Region Unknown'} · Submitted {new Date(agent.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {(agent.verificationDocuments || []).map((doc, idx) => (
                      <button
                        key={idx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] text-[10px] text-[#6B7280] hover:bg-gray-100 transition-colors"
                        onClick={() => viewAgentDocument(agent.id, doc._id || doc.id)}
                      >
                        <FileText className="w-3 h-3" /> {doc.docType} {doc.status === 'approved' ? <span className="text-emerald-600">✓</span> : <span className="text-amber-600">!</span>}
                      </button>
                    ))}
                    {(!agent.verificationDocuments || agent.verificationDocuments.length === 0) && (
                      <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> No documents uploaded
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] font-medium bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] hover:bg-[#C0DD97]"
                      onClick={() => handleApprove(agent.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] font-medium bg-[#FCEBEB] text-[#791F1F] border-[#F7C1C1] hover:bg-[#F7C1C1]"
                      onClick={() => handleReject(agent.id)}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] font-medium border-[#E5E7EB] inline-flex items-center"
                      onClick={() => handleEdit(agent)}
                    >
                      View Details <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main Table */}
      <Card className="border-[#E5E7EB] shadow-none overflow-hidden">
        <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2">
          <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">All agents</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 pl-6 w-[26%]">Agent</TableHead>
                <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 w-[12%]">Status</TableHead>
                <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 w-[12%]">Registrations</TableHead>
                <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 w-[10%]">Confirmed</TableHead>
                <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 w-[10%]">Converted</TableHead>
                <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 w-[10%]">Conv. Rate</TableHead>
                <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 w-[12%]">Events</TableHead>
                <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 pr-6 text-right w-[8%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-10 h-10 text-gray-200" />
                      <p className="text-sm text-[#6B7280] font-medium">No agents found matching your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map((agent) => {
                  const styles = getAvatarStyles(agent.name);
                  const rateValue = parseFloat(agent.convRate);
                  const rateColor = rateValue >= 18 ? 'text-[#27500A]' : rateValue >= 12 ? 'text-[#633806]' : 'text-[#791F1F]';

                  return (
                    <TableRow key={agent.id} className="group border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                      <TableCell className="py-3 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[10px]", styles.bg, styles.text)}>
                            {getInitials(agent.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[#111827] truncate">{agent.name}</p>
                            <p className="text-[11px] text-[#6B7280] truncate">{agent.agencyName || 'Independent'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {agent.isVerified ? (
                          <Badge className="bg-[#EAF3DE] text-[#27500A] border-none text-[10px] font-medium h-5">Verified</Badge>
                        ) : (
                          <Badge className="bg-[#FAEEDA] text-[#633806] border-none text-[10px] font-medium h-5">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-[13px] text-[#111827]">{agent.registrations}</TableCell>
                      <TableCell className="py-3 text-[13px] text-[#111827]">{agent.confirmed}</TableCell>
                      <TableCell className="py-3 text-[13px] text-[#111827]">{agent.converted}</TableCell>
                      <TableCell className={cn("py-3 text-[13px] font-medium", rateColor)}>{agent.convRate}</TableCell>
                      <TableCell className="py-3 text-[13px] text-[#6B7280]">{agent.assignedEvents} events</TableCell>
                      <TableCell className="py-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#6B7280] hover:text-[#111827] hover:bg-gray-100"
                            onClick={() => handleView(agent)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280] hover:bg-gray-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEdit(agent)}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(agent)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Agent
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Agent Detail Drawer */}
      {drawerOpen && agentInDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl animate-slideIn">
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg", getAvatarStyles(agentInDrawer.name).bg, getAvatarStyles(agentInDrawer.name).text)}>
                    {getInitials(agentInDrawer.name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#111827]">{agentInDrawer.name}</h3>
                    <p className="text-sm text-[#6B7280]">{agentInDrawer.agencyName || 'Independent'} · {agentInDrawer.region || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {agentInDrawer.isVerified ? (
                    <Badge className="bg-[#EAF3DE] text-[#27500A] h-6">Active</Badge>
                  ) : (
                    <Badge className="bg-[#FAEEDA] text-[#633806] h-6">Pending</Badge>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} className="h-8 w-8">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Email</p>
                    <p className="text-sm text-[#111827] flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#9CA3AF]" /> {agentInDrawer.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Phone</p>
                    <p className="text-sm text-[#111827] flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#9CA3AF]" /> {agentInDrawer.phone || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Region</p>
                    <p className="text-sm text-[#111827] flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-[#9CA3AF]" /> {agentInDrawer.region || 'Not Set'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Joined</p>
                    <p className="text-sm text-[#111827] flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-[#9CA3AF]" /> {new Date(agentInDrawer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Registrations', val: agentInDrawer.registrations },
                    { label: 'Confirmed', val: agentInDrawer.confirmed },
                    { label: 'Converted', val: agentInDrawer.converted },
                    { label: 'Conv. Rate', val: agentInDrawer.convRate },
                  ].map((s, i) => (
                    <div key={i} className="bg-[#F9FAFB] rounded-lg p-3 text-center border border-[#E5E7EB]">
                      <p className="text-xl font-semibold text-[#111827]">{s.val}</p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Verification Documents */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[#111827] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#042C53]" /> Verification Documents
                  </h4>
                  <div className="space-y-2">
                    {(agentInDrawer.verificationDocuments || []).map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[#E5E7EB] bg-white group hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-[#6B7280]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#111827]">{doc.docType}</p>
                            <p className="text-[11px] text-[#6B7280]">{doc.fileName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={cn("text-[10px] h-5", doc.status === 'approved' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>{doc.status}</Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewAgentDocument(agentInDrawer.id, doc._id)}>
                            <Eye className="w-4 h-4 text-[#6B7280]" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!agentInDrawer.verificationDocuments || agentInDrawer.verificationDocuments.length === 0) && (
                      <div className="text-center py-8 border border-dashed rounded-lg">
                        <p className="text-xs text-[#6B7280]">No documents available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#E5E7EB] bg-white mt-auto">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-[#042C53] hover:bg-[#0C447C] text-xs h-10"
                      onClick={() => handlePerformanceReport(agentInDrawer)}
                    >
                      Full performance report
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-[#E5E7EB] text-xs h-10"
                      onClick={() => handleAssignEvents(agentInDrawer)}
                    >
                      Assign events
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-[#E5E7EB] text-xs h-10"
                      onClick={() => handleSendNotification(agentInDrawer)}
                    >
                      Send notification
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-100 text-red-600 hover:bg-red-50 text-xs h-10"
                      onClick={() => handleDeactivate(agentInDrawer)}
                    >
                      Deactivate agent
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      <AgentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        agent={selectedAgent}
        viewMode={viewMode}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Outfit'] text-xl">Delete Agent</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete <strong>{agentToDelete?.name}</strong>?
              This action cannot be undone and will remove them from all assigned events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgentsPage;

