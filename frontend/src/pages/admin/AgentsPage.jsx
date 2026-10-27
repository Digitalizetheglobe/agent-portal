import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Send,
  Search,
  Edit2,
  Trash2,
  Eye,
  MoreHorizontal,
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCheck,
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
  ArrowUpRight,
  LayoutGrid,
  List,
  User,
  Activity,
  Clock,
  Building2,
  Hash,
  Filter,
  RotateCcw,
  GraduationCap,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { agentAPI } from '../../utils/api';
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
import InviteAgentDialog from '../../components/modals/InviteAgentDialog';
import AgentApplicationDetails from '../../components/agent/AgentApplicationDetails';
import AgentReviewDialog from '../../components/modals/AgentReviewDialog';
import ReviewActionButtons from '../../components/agent/ReviewActionButtons';
import { getOnboardingStatus, HISTORY_LABELS, IN_REVIEW_STATUSES } from '../../utils/onboarding';
import { hasFeesPaid, isBeyondApplication } from '../../utils/studentProgress';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const DrawerSection = ({ title, icon: Icon, block, children }) => (
  <section className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
    <h4 className="px-4 py-2.5 border-b border-[#F3F4F6] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-[#042C53]" /> {title}
    </h4>
    <div className={block ? 'px-4 py-2' : 'p-4 grid grid-cols-2 gap-x-4 gap-y-4'}>{children}</div>
  </section>
);

const DrawerField = ({ icon: Icon, label, value, wide }) => (
  <div className={cn('space-y-1 min-w-0', wide && 'col-span-2')}>
    <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">{label}</p>
    <div className="text-sm text-[#111827] flex items-start gap-2 break-words min-w-0">
      <Icon className="w-3.5 h-3.5 text-[#9CA3AF] mt-0.5 shrink-0" />
      {value || <span className="text-[#9CA3AF]">Not provided</span>}
    </div>
  </div>
);

const PAGE_SIZE = 10;

const AgentsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    agents,
    deleteAgent,
    getStats,
    students,
    invoices,
    viewAgentDocument,
    updateAgent,
    fetchAgents
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState(searchParams.get('status') || 'all');
  const [countryFilter, setCountryFilter] = useState(searchParams.get('country') || 'all');
  const [managerFilter, setManagerFilter] = useState(searchParams.get('accountManagerId') || 'all');
  const [regionFilter, setRegionFilter] = useState(searchParams.get('region') || 'all');
  const [accountManagers, setAccountManagers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState({ agent: null, action: null });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [agentInDrawer, setAgentInDrawer] = useState(null);
  const [displayMode, setDisplayMode] = useState('table');
  const [page, setPage] = useState(1);

  // Load account managers for filtering
  useEffect(() => {
    agentAPI.getAccountManagers?.()
      .then(res => setAccountManagers(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Failed to fetch account managers:', err));
  }, []);

  // Sync state if URL query params change (e.g. navigation from Dashboard)
  useEffect(() => {
    const c = searchParams.get('country');
    if (c !== null && c !== countryFilter) setCountryFilter(c);
    const m = searchParams.get('accountManagerId');
    if (m !== null && m !== managerFilter) setManagerFilter(m);
    const r = searchParams.get('region');
    if (r !== null && r !== regionFilter) setRegionFilter(r);
    const s = searchParams.get('status');
    if (s !== null && s !== currentFilter) setCurrentFilter(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Compute unique countries from agents list with counts
  const availableCountries = useMemo(() => {
    const counts = {};
    agents.forEach(a => {
      const c = a.country?.trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);

  // Compute unique regions from agents list with counts
  const availableRegions = useMemo(() => {
    const counts = {};
    agents.forEach(a => {
      const r = a.region?.trim();
      if (r) counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);

  // Compute agent counts per account manager
  const amCounts = useMemo(() => {
    const counts = { unassigned: 0 };
    agents.forEach(a => {
      const id = a.accountManagerId || a.accountManager?.id;
      if (!id) {
        counts.unassigned++;
      } else {
        counts[id] = (counts[id] || 0) + 1;
      }
    });
    return counts;
  }, [agents]);

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
      // In the visa process or beyond, and with the fees paid
      const confirmed = agentStudents.filter(isBeyondApplication).length;
      const converted = agentStudents.filter(hasFeesPaid).length;
      const convRate = registrations > 0 ? ((converted / registrations) * 100).toFixed(1) : '0.0';
      const totalCommission = invoices
        .filter(inv => (inv.agentId?.id || inv.agentId?._id || inv.agentId) === agent.id && (inv.status || '').toLowerCase() === 'paid')
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);

      return {
        ...agent,
        registrations,
        confirmed,
        converted,
        convRate: convRate + '%',
        totalCommission: `₹${(totalCommission / 1000).toFixed(1)}k`
      };
    });
  }, [agents, students, invoices]);

  const drawerStudents = useMemo(() => {
    if (!agentInDrawer) return [];
    return students.filter(s => s.agentId === agentInDrawer.id).slice(0, 8);
  }, [agentInDrawer, students]);

  const drawerEarnings = useMemo(() => {
    const mine = agentInDrawer ? invoices.filter(inv => (inv.agentId?.id || inv.agentId?._id || inv.agentId) === agentInDrawer.id) : [];
    const sum = (list) => list.reduce((t, inv) => t + (Number(inv.amount) || 0), 0);
    const st = (inv) => (inv.status || '').toLowerCase();
    return {
      count: mine.length,
      paid: sum(mine.filter(inv => st(inv) === 'paid')),
      pending: sum(mine.filter(inv => st(inv) !== 'paid' && st(inv) !== 'rejected')),
    };
  }, [agentInDrawer, invoices]);

  const filteredAgents = useMemo(() => {
    return processedAgents.filter(agent => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        agent.name.toLowerCase().includes(q) ||
        agent.email.toLowerCase().includes(q) ||
        (agent.agencyName && agent.agencyName.toLowerCase().includes(q)) ||
        (agent.agentCode && agent.agentCode.toLowerCase().includes(q)) ||
        (agent.country && agent.country.toLowerCase().includes(q)) ||
        (agent.region && agent.region.toLowerCase().includes(q));

      const matchesStatus =
        currentFilter === 'all' ||
        (currentFilter === 'approved' && (agent.verificationStatus === 'approved' || agent.isVerified)) ||
        (currentFilter === 'pending' && !agent.isVerified && agent.verificationStatus !== 'rejected') ||
        (currentFilter === 'rejected' && agent.verificationStatus === 'rejected');

      const matchesCountry =
        countryFilter === 'all' ||
        (agent.country && agent.country.toLowerCase() === countryFilter.toLowerCase());

      const matchesRegion =
        regionFilter === 'all' ||
        (agent.region && agent.region.toLowerCase() === regionFilter.toLowerCase());

      const matchesManager =
        managerFilter === 'all' ||
        (managerFilter === 'unassigned' && !agent.accountManagerId && !agent.accountManager?.id) ||
        agent.accountManagerId === managerFilter ||
        agent.accountManager?.id === managerFilter;

      return matchesSearch && matchesStatus && matchesCountry && matchesRegion && matchesManager;
    });
  }, [processedAgents, searchQuery, currentFilter, countryFilter, regionFilter, managerFilter]);

  // Back to page 1 and sync query params whenever filters change
  useEffect(() => {
    setPage(1);
    const params = {};
    if (countryFilter !== 'all') params.country = countryFilter;
    if (managerFilter !== 'all') params.accountManagerId = managerFilter;
    if (regionFilter !== 'all') params.region = regionFilter;
    if (currentFilter !== 'all') params.status = currentFilter;
    setSearchParams(params, { replace: true });
  }, [searchQuery, currentFilter, countryFilter, managerFilter, regionFilter, setSearchParams]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCurrentFilter('all');
    setCountryFilter('all');
    setManagerFilter('all');
    setRegionFilter('all');
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    currentFilter !== 'all' ||
    countryFilter !== 'all' ||
    managerFilter !== 'all' ||
    regionFilter !== 'all';

  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedAgents = useMemo(
    () => filteredAgents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredAgents, currentPage]
  );

  const pendingVerificationAgents = useMemo(() => {
    return processedAgents.filter(agent => IN_REVIEW_STATUSES.includes(agent.onboardingStatus));
  }, [processedAgents]);

  // The agent list is loaded once at login, so refresh it when this page opens and when the
  // admin returns to the tab. Otherwise documents an agent uploaded later never appear.
  useEffect(() => {
    fetchAgents();
    let last = Date.now();
    const onFocus = () => {
      if (Date.now() - last < 60000) return;
      last = Date.now();
      fetchAgents();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchAgents]);

  // Keep an open drawer / edit modal in sync with the refreshed list
  useEffect(() => {
    setAgentInDrawer(prev => (prev ? processedAgents.find(a => a.id === prev.id) || prev : prev));
    setSelectedAgent(prev => (prev ? processedAgents.find(a => a.id === prev.id) || prev : prev));
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

  const openReview = (agent, action) => setReviewTarget({ agent, action });

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

  const handleAgentDetails = (agent, tab = 'students') => {
    navigate(`/admin/agents/${agent.id}?tab=${tab}`);
  };

  const handlePerformanceReport = (agent) => {
    navigate(`/admin/agents/${agent.id}/report`);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-[#F9FAFB] min-h-screen font-['Inter']" data-testid="agents-page">
      {/* Top Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Agent Management</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {agents.length} agents · {agents.filter(a => !a.isVerified && a.verificationStatus !== 'rejected').length} pending verification
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button variant="outline" size="sm"
            className="text-xs font-semibold h-10 px-4 border-slate-200 hover:bg-slate-50 transition-all hover:text-[#042C53]"
          >
            <Download size={14} className="mr-2" /> Export
          </Button>
          <Button onClick={() => setInviteOpen(true)} variant="outline" size="sm"
            className="text-xs font-semibold h-10 px-4 border-slate-200 hover:bg-slate-50 transition-all hover:text-[#042C53] gap-2"
            data-testid="invite-agent-btn"
          >
            <Send size={14} /> Send Invite Link
          </Button>
          <Button onClick={handleCreate} size="sm"
            className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-10 px-5 rounded-lg shadow-lg shadow-[#042C53]/10 transition-all active:scale-95 gap-2"
          >  <Plus className="w-4 h-4" />  Onboard Agent
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="stat-grid grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total agents', val: agents.length, sub: 'All registered agents', subColor: 'text-[#27500A]' },
          { label: 'Pending verification', val: agents.filter(a => !a.isVerified && a.verificationStatus !== 'rejected').length, sub: 'Needs review', subColor: 'text-[#633806]' },
          { label: 'Students with fees paid', val: stats.conversionRate + '%', sub: 'Of all registered students', subColor: 'text-[#27500A]' },
          // { label: 'Total commissions', val: `₹${(invoices.reduce((s, i) => s + (i.amount || 0), 0) / 100000).toFixed(1)}L`, sub: `₹${(invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0) / 1000).toFixed(0)}K pending`, subColor: 'text-[#633806]' },
          { label: 'Total students', val: students.length, sub: `${students.filter(s => s.feesPaid).length} with fees paid`, subColor: 'text-[#27500A]' },
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

      {/* Verification Queue */}
      {pendingVerificationAgents.length > 0 && (
        <Card className="border-[#E5E7EB] shadow-none overflow-hidden">
          <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2">
            <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Awaiting review · {pendingVerificationAgents.length}</h3>
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
                        <Badge className={cn('border-none text-[10px] h-5 hover:text-white', getOnboardingStatus(agent).style)}>{getOnboardingStatus(agent).label}</Badge>
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">
                        {agent.agencyName || 'Independent'} · {agent.region || 'Region Unknown'} · Submitted {new Date(agent.onboardingSubmittedAt || agent.createdAt).toLocaleDateString()}
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

                  <div className="flex flex-wrap gap-2 mt-4">
                    <ReviewActionButtons
                      agent={agent}
                      onOpenDialog={(action) => openReview(agent, action)}
                      buttonClassName="h-8 text-[11px] font-medium"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] font-medium border-[#E5E7EB] inline-flex items-center"
                      onClick={() => handleAgentDetails(agent)}
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

      {/* Controls & Filter Toolbar */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm space-y-3">
        {/* Row 1: Search & Layout Mode */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <Input
              placeholder="Search by name, agent ID, agency, email, country…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border-[#E5E7EB] bg-[#F9FAFB] text-sm placeholder:text-[#9CA3AF] focus-visible:ring-[#042C53]/10"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* View Mode Toggle */}
            <div className="flex bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-1 gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDisplayMode('table')}
                className={cn(
                  "h-8 w-8 p-0 rounded-md transition-all",
                  displayMode === 'table' ? "bg-white text-[#0C447C] shadow-sm font-bold" : "text-[#6B7280] hover:bg-gray-100"
                )}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDisplayMode('grid')}
                className={cn(
                  "h-8 w-8 p-0 rounded-md transition-all",
                  displayMode === 'grid' ? "bg-white text-[#0C447C] shadow-sm font-bold" : "text-[#6B7280] hover:bg-gray-100"
                )}
                title="Grid cards view"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Row 2: Filter Selectors (Status, Country, Account Manager, Region, Clear) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {/* Status Tabs */}
          <div className="flex bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-0.5 gap-0.5 overflow-x-auto">
            {['all', 'approved', 'pending', 'rejected'].map((f) => (
              <button
                key={f}
                onClick={() => setCurrentFilter(f)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap",
                  currentFilter === f
                    ? "bg-white text-[#0C447C] shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827]"
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block mx-1" />

          {/* Filter: Agents by Country */}
          <div className="relative flex items-center min-w-[160px]">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className={cn(
                "w-full pl-8 pr-7 h-8 border rounded-lg text-xs font-medium appearance-none transition-colors cursor-pointer",
                countryFilter !== 'all'
                  ? "bg-[#E6F1FB] border-[#0C447C]/30 text-[#0C447C] font-semibold"
                  : "bg-white border-[#E5E7EB] text-slate-700 hover:border-slate-300"
              )}
            >
              <option value="all">🌍 All Countries ({agents.length})</option>
              {availableCountries.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90 pointer-events-none" />
          </div>

          {/* Filter: Agents by Account Manager */}
          <div className="relative flex items-center min-w-[180px]">
            <UserCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className={cn(
                "w-full pl-8 pr-7 h-8 border rounded-lg text-xs font-medium appearance-none transition-colors cursor-pointer",
                managerFilter !== 'all'
                  ? "bg-[#EEEDFE] border-[#534AB7]/30 text-[#3C3489] font-semibold"
                  : "bg-white border-[#E5E7EB] text-slate-700 hover:border-slate-300"
              )}
            >
              <option value="all">👤 All Account Managers</option>
              <option value="unassigned">Unassigned ({amCounts.unassigned || 0})</option>
              {accountManagers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({amCounts[m.id] || 0})
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90 pointer-events-none" />
          </div>

          {/* Filter: Agents by Region */}
          <div className="relative flex items-center min-w-[150px]">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className={cn(
                "w-full pl-8 pr-7 h-8 border rounded-lg text-xs font-medium appearance-none transition-colors cursor-pointer",
                regionFilter !== 'all'
                  ? "bg-[#FEF3C7] border-[#92400E]/30 text-[#92400E] font-semibold"
                  : "bg-white border-[#E5E7EB] text-slate-700 hover:border-slate-300"
              )}
            >
              <option value="all">📍 All Regions</option>
              {availableRegions.map(r => (
                <option key={r.name} value={r.name}>
                  {r.name} ({r.count})
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90 pointer-events-none" />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 px-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset filters
            </Button>
          )}

          <span className="text-[11px] text-slate-400 ml-auto hidden lg:inline">
            Showing <strong className="text-slate-700">{filteredAgents.length}</strong> of {agents.length} agents
          </span>
        </div>
      </div>

      {/* Main List View */}
      {displayMode === 'table' ? (
        <Card className="border-[#E5E7EB] shadow-none overflow-hidden">
          <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2">
            <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">All agents</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 pl-6 w-[22%]">Agent</TableHead>
                  <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 w-[14%]">Country / Region</TableHead>
                  <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 w-[14%]">Account Manager</TableHead>
                  <TableHead className="text-[10px] text-center font-semibold text-[#6B7280] uppercase py-3 w-[10%]">Status</TableHead>
                  <TableHead className="text-[10px] text-center font-semibold text-[#6B7280] uppercase py-3 w-[10%]">Registrations</TableHead>
                  <TableHead className="text-[10px] text-center font-semibold text-[#6B7280] uppercase py-3 w-[10%]">In visa process</TableHead>
                  <TableHead className="text-[10px] text-center font-semibold text-[#6B7280] uppercase py-3 w-[8%]">Conv. Rate</TableHead>
                  <TableHead className="text-[10px] font-semibold text-[#6B7280] uppercase py-3 text-center w-[8%]">Actions</TableHead>
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
                  pagedAgents.map((agent) => {
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
                              <div className="flex items-center gap-1.5">
                                <Link
                                  to={`/admin/agents/${agent.id}?tab=students`}
                                  className="text-[13px] font-medium text-[#111827] hover:text-[#0C447C] hover:underline truncate"
                                  title="View agent's students, invoices & visa progress"
                                >
                                  {agent.name}
                                </Link>
                                {agent.agentCode && (
                                  <span className="text-[10px] font-mono text-[#4B5563] bg-[#F3F4F6] px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                                    {agent.agentCode}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#6B7280] truncate">{agent.agencyName || 'Independent'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 text-xs text-[#111827] font-medium">
                            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{agent.country || 'Not specified'}</span>
                          </div>
                          {agent.region && (
                            <p className="text-[10px] text-[#6B7280] pl-5 truncate">{agent.region}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          {agent.accountManager ? (
                            <div className="flex items-center gap-1.5 text-xs text-[#0C447C] font-medium">
                              <UserCheck className="w-3.5 h-3.5 text-[#0C447C] shrink-0" />
                              <span className="truncate">{agent.accountManager.name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          {agent.verificationStatus === 'approved' || agent.isVerified ? (
                            <Badge className="bg-[#EAF3DE] text-[#27500A] border-none text-[10px] font-medium h-5">Approve</Badge>
                          ) : agent.verificationStatus === 'rejected' ? (
                            <Badge className="bg-[#FCEBEB] text-[#791F1F] border-none text-[10px] font-medium h-5">Rejected</Badge>
                          ) : (
                            <Badge className="bg-[#FAEEDA] text-[#633806] border-none text-[10px] font-medium h-5">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-center text-[13px] text-[#111827]">{agent.registrations}</TableCell>
                        <TableCell className="py-3 text-center text-[13px] text-[#111827]">{agent.confirmed}</TableCell>
                        <TableCell className={cn("py-3 text-center text-[13px] font-medium", rateColor)}>{agent.convRate}</TableCell>
                        <TableCell className="py-3 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="h-8 w-8 flex items-center justify-center rounded-md text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 transition-all"
                              onClick={() => handleView(agent)}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#6B7280] hover:bg-gray-100 transition-all">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAgents.length === 0 ? (
            <div className="col-span-full py-20 bg-white rounded-xl border border-[#E5E7EB] flex flex-col items-center gap-3">
              <Users className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-[#6B7280] font-medium">No agents found matching your criteria.</p>
            </div>
          ) : (
            pagedAgents.map((agent) => {
              const styles = getAvatarStyles(agent.name);
              const rateValue = parseFloat(agent.convRate);
              const rateColor = rateValue >= 18 ? 'text-[#27500A]' : rateValue >= 12 ? 'text-[#633806]' : 'text-[#791F1F]';

              return (
                <Card key={agent.id} className="border-[#E5E7EB] shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shadow-sm", styles.bg, styles.text)}>
                        {getInitials(agent.name)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="h-8 w-8 flex items-center justify-center rounded-md text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 transition-all"
                          onClick={() => handleView(agent)}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-8 w-8 flex items-center justify-center rounded-md text-[#6B7280] hover:bg-gray-100 transition-all">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
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
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-[15px] font-semibold text-[#111827] truncate">
                          <Link
                            to={`/admin/agents/${agent.id}?tab=students`}
                            className="hover:text-[#0C447C] hover:underline"
                            title="View agent's students, invoices & visa progress"
                          >
                            {agent.name}
                          </Link>
                        </h4>
                        {agent.agentCode && (
                          <span className="text-[10px] font-mono text-[#4B5563] bg-[#F3F4F6] px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                            {agent.agentCode}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#6B7280] truncate mt-0.5">{agent.agencyName || 'Independent Agency'}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {agent.verificationStatus === 'approved' || agent.isVerified ? (
                          <Badge className="bg-[#EAF3DE] text-[#27500A] border-none text-[10px] font-medium h-5">Approve</Badge>
                        ) : agent.verificationStatus === 'rejected' ? (
                          <Badge className="bg-[#FCEBEB] text-[#791F1F] border-none text-[10px] font-medium h-5">Rejected</Badge>
                        ) : (
                          <Badge className="bg-[#FAEEDA] text-[#633806] border-none text-[10px] font-medium h-5">Pending Review</Badge>
                        )}
                        {agent.country && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Globe className="w-3 h-3 text-slate-400" /> {agent.country}
                          </span>
                        )}
                        {agent.accountManager && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0C447C] bg-[#E6F1FB] px-2 py-0.5 rounded border border-[#0C447C]/20">
                            <UserCheck className="w-3 h-3" /> {agent.accountManager.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#F3F4F6]">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-[#9CA3AF] uppercase font-medium">Registrations</p>
                        <p className="text-sm font-semibold text-[#111827]">{agent.registrations}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-[#9CA3AF] uppercase font-medium">Conv. Rate</p>
                        <p className={cn("text-sm font-bold", rateColor)}>{agent.convRate}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-[#9CA3AF] uppercase font-medium">Fees paid</p>
                        <p className="text-sm font-semibold text-[#111827]">{agent.converted}</p>
                      </div>
                    </div>
                  </CardContent>
                  <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#F3F4F6] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(agent.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                    </div>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-[11px] font-bold text-[#042C53] hover:text-[#0C447C] decoration-none flex items-center gap-1"
                      onClick={() => handlePerformanceReport(agent)}
                    >
                      Report <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredAgents.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredAgents.length)} of {filteredAgents.length.toLocaleString()} agents
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="px-3 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 font-semibold"
            >
              Previous
            </button>
            <span className="font-semibold">Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="px-3 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Agent Detail Drawer */}
      {drawerOpen && agentInDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl animate-slideIn">
            <div className="h-full flex flex-col">
              <div className="p-6 border-b border-[#E5E7EB] flex flex-col gap-4">
                <div className="flex items-center justify-between">
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
                    <Badge className={cn('h-6 border-none', getOnboardingStatus(agentInDrawer).style)}>
                      {getOnboardingStatus(agentInDrawer).label}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} className="h-8 w-8">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                {['rejected', 'correction_required'].includes(agentInDrawer.onboardingStatus) && agentInDrawer.verificationRemarks && (
                  <div className={cn('text-sm border p-3 rounded-lg', agentInDrawer.onboardingStatus === 'rejected' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-orange-50 border-orange-100 text-orange-900')}>
                    <span className="font-semibold">{agentInDrawer.onboardingStatus === 'rejected' ? 'Reason for rejection: ' : 'Changes requested: '}</span>
                    {agentInDrawer.verificationRemarks}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F9FAFB]">
                {/* Performance Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Registrations', val: agentInDrawer.registrations },
                    { label: 'In visa process', val: agentInDrawer.confirmed },
                    { label: 'Fees paid', val: agentInDrawer.converted },
                    { label: 'Fees paid rate', val: agentInDrawer.convRate },
                  ].map((st, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-[#E5E7EB]">
                      <p className="text-lg font-semibold text-[#111827] leading-tight">{st.val}</p>
                      <p className="text-[10px] uppercase tracking-wider text-[#6B7280] mt-1">{st.label}</p>
                    </div>
                  ))}
                </div>

                {/* Earnings */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-[#E5E7EB]">
                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Invoiced · paid</p>
                    <p className="text-lg font-semibold text-[#27500A] mt-1">{formatINR(drawerEarnings.paid)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-[#E5E7EB]">
                    <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">Invoiced · outstanding</p>
                    <p className="text-lg font-semibold text-[#633806] mt-1">{formatINR(drawerEarnings.pending)}</p>
                    <p className="text-[10px] text-[#9CA3AF]">{drawerEarnings.count} invoice{drawerEarnings.count === 1 ? '' : 's'} total</p>
                  </div>
                </div>

                {/* Account & contact */}
                <DrawerSection title="Account & contact" icon={User}>
                  <DrawerField icon={Mail} label="Email" value={agentInDrawer.email} />
                  <DrawerField icon={Phone} label="Phone" value={agentInDrawer.phone} />
                  <DrawerField icon={User} label="User ID" value={agentInDrawer.userId} />
                  <DrawerField
                    icon={Activity}
                    label="Account status"
                    value={
                      <span className={cn("inline-flex items-center gap-1.5 font-medium", agentInDrawer.status === 'active' ? 'text-[#27500A]' : 'text-[#791F1F]')}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", agentInDrawer.status === 'active' ? 'bg-[#27500A]' : 'bg-[#791F1F]')} />
                        {agentInDrawer.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    }
                  />
                  <DrawerField icon={Calendar} label="Joined" value={formatDate(agentInDrawer.createdAt)} />
                  <DrawerField icon={Clock} label="Last updated" value={formatDate(agentInDrawer.updatedAt)} />
                </DrawerSection>

                {/* Agency */}
                <DrawerSection title="Agency information" icon={Building2}>
                  <DrawerField icon={Building2} label="Agency name" value={agentInDrawer.agencyName} />
                  <DrawerField icon={Hash} label="Registration #" value={agentInDrawer.businessRegistrationNumber} />
                  <DrawerField icon={Globe} label="Country" value={agentInDrawer.country} />
                  <DrawerField icon={MapPin} label="Region" value={agentInDrawer.region} />
                  <DrawerField icon={User} label="Account manager" value={agentInDrawer.accountManager?.name || 'Unassigned'} />
                  <DrawerField icon={MapPin} label="Address" value={agentInDrawer.fullAddress} wide />
                </DrawerSection>

                {/* Full application form */}
                <AgentApplicationDetails agent={agentInDrawer} />

                {/* Onboarding review trail */}
                <DrawerSection title="Onboarding review" icon={ShieldCheck} block>
                  {(agentInDrawer.onboardingHistory || []).length === 0 ? (
                    <p className="text-xs text-[#6B7280] py-2">Not submitted yet.</p>
                  ) : (
                    <ol className="divide-y divide-[#F3F4F6]">
                      {[...agentInDrawer.onboardingHistory].reverse().map((h, i) => (
                        <li key={i} className="py-2.5 text-sm">
                          <p className="font-medium text-[#111827]">{HISTORY_LABELS[h.action] || h.action}</p>
                          <p className="text-xs text-[#6B7280]">
                            {h.byName || 'Unknown'} · {new Date(h.at).toLocaleString()}
                          </p>
                          {h.remarks && <p className="text-xs text-[#4B5563] mt-1">"{h.remarks}"</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                </DrawerSection>

                {/* Recent students */}
                <DrawerSection title={`Students (${agentInDrawer.registrations})`} icon={Users} block>
                  {drawerStudents.length === 0 ? (
                    <p className="text-xs text-[#6B7280] py-2">No students registered by this agent.</p>
                  ) : (
                    <div className="divide-y divide-[#F3F4F6]">
                      {drawerStudents.map(stu => (
                        <div key={stu.id} className="flex items-center justify-between py-2 gap-3">
                          <p className="text-sm text-[#111827] truncate">{stu.name || 'Student'}</p>
                          <Badge variant="secondary" className="text-[10px] h-5 font-medium">{stu.status || 'New'}</Badge>
                        </div>
                      ))}
                      {agentInDrawer.registrations > drawerStudents.length && (
                        <p className="text-[11px] text-[#6B7280] pt-2">Showing latest {drawerStudents.length} of {agentInDrawer.registrations}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAgentDetails(agentInDrawer, 'students')}
                        className="w-full mt-3 text-xs font-semibold text-[#0C447C] border-[#0C447C]/30 hover:bg-[#E6F1FB]"
                      >
                        <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> View All Students & Visa Progress
                      </Button>
                    </div>
                  )}
                </DrawerSection>

                {/* Verification Documents */}
                <DrawerSection title={`Verification documents (${(agentInDrawer.verificationDocuments || []).length})`} icon={ShieldCheck} block>
                  <div className="space-y-2 py-1">
                    {(agentInDrawer.verificationDocuments || []).map((doc, i) => (
                      <div key={i} className="p-3 rounded-lg border border-[#E5E7EB] bg-white">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-[#6B7280]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#111827]">{doc.docType}</p>
                              <p className="text-[11px] text-[#6B7280] truncate">{doc.fileName}{doc.uploadedAt ? ` · ${formatDate(doc.uploadedAt)}` : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={cn("text-[10px] h-5 capitalize", doc.status === 'approved' ? "bg-emerald-50 text-emerald-600" : doc.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>{doc.status}</Badge>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewAgentDocument(agentInDrawer.id, doc._id || doc.id)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {doc.remarks && (
                          <p className="text-[11px] text-[#6B7280] bg-[#F9FAFB] rounded p-2 mt-2"><strong>Remarks:</strong> {doc.remarks}</p>
                        )}
                      </div>
                    ))}
                    {(!agentInDrawer.verificationDocuments || agentInDrawer.verificationDocuments.length === 0) && (
                      <div className="text-center py-6 border border-dashed rounded-lg">
                        <p className="text-xs text-[#6B7280]">No documents available</p>
                      </div>
                    )}
                  </div>
                </DrawerSection>
              </div>

              <div className="p-6 border-t border-[#E5E7EB] bg-white mt-auto">
                <div className="flex flex-col gap-2">
                  <ReviewActionButtons
                    agent={agentInDrawer}
                    onOpenDialog={(action) => openReview(agentInDrawer, action)}
                    className="pb-3 border-b border-[#E5E7EB] mb-1"
                    buttonClassName="flex-1 text-xs h-10"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-[#042C53] hover:bg-[#0C447C] text-xs h-10 font-semibold"
                      onClick={() => handleAgentDetails(agentInDrawer, 'students')}
                    >
                      <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Students & Invoices
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-[#E5E7EB] text-xs h-10"
                      onClick={() => handlePerformanceReport(agentInDrawer)}
                    >
                      Performance report
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
                      className="flex-1 hover:text-red-600  border-red-100 text-red-600 hover:bg-red-50 text-xs h-10"
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
      <InviteAgentDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <AgentReviewDialog
        agent={reviewTarget.agent}
        action={reviewTarget.action}
        onClose={() => setReviewTarget({ agent: null, action: null })}
      />
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
              This action cannot be undone and will permanently remove their account.
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

