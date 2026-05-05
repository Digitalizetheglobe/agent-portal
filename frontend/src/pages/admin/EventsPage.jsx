import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  MoreHorizontal, 
  Calendar, 
  MapPin, 
  Users, 
  ArrowUpRight,
  Grid,
  List,
  ChevronRight,
  Bell,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import EventModal from '../../components/modals/EventModal';
import { toast } from 'sonner';
import { format, isPast, isToday, isFuture, parseISO } from 'date-fns';

const EventsPage = () => {
  const { events, agents, students, deleteEvent } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);

  // Status mapping
  const getEventStatus = (event) => {
    if (event.status) return event.status.toLowerCase();
    const eventDate = parseISO(event.date);
    if (isToday(eventDate)) return 'live';
    if (isFuture(eventDate)) return 'upcoming';
    if (isPast(eventDate)) return 'completed';
    return 'draft';
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => getEventStatus(e) === 'upcoming').length;
    const liveEvents = events.filter(e => getEventStatus(e) === 'live').length;
    
    const totalSeats = events.reduce((acc, curr) => acc + (curr.seatCapacity || 0), 0);
    const totalFilled = students.length; // Simplified: assuming students are registrations for events
    const fillRate = totalSeats > 0 ? Math.round((totalFilled / totalSeats) * 100) : 0;
    
    // Students registered this month
    const thisMonth = new Date().getMonth();
    const studentsThisMonth = students.filter(s => {
      const date = s.submittedAt ? parseISO(s.submittedAt) : new Date();
      return date.getMonth() === thisMonth;
    }).length;

    return {
      totalEvents,
      upcomingEvents,
      liveEvents,
      totalSeats,
      totalFilled,
      fillRate,
      studentsThisMonth
    };
  }, [events, students]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const status = getEventStatus(event);
      const matchesFilter = activeFilter === 'all' || status === activeFilter;
      const matchesType = typeFilter === 'all' || (event.type && event.type.toLowerCase() === typeFilter);
      
      return matchesSearch && matchesFilter && matchesType;
    });
  }, [events, searchQuery, activeFilter, typeFilter]);

  // Event Data Enhancer
  const getEnhancedEvent = (event) => {
    const eventStudents = students.filter(s => s.eventId === event.id);
    const filled = eventStudents.length;
    const seats = event.seatCapacity || 50;
    const p = Math.round(seats > 0 ? (filled / seats) * 100 : 0);
    const status = getEventStatus(event);
    
    return {
      ...event,
      filled,
      seats,
      p,
      status,
      assignedAgentObjects: (event.assignedAgents || []).map(id => agents.find(a => a.id === id)).filter(Boolean)
    };
  };

  const handleCreate = () => {
    setEventToEdit(null);
    setModalOpen(true);
  };

  const handleEdit = (e, event) => {
    e.stopPropagation();
    setEventToEdit(event);
    setModalOpen(true);
  };

  const handleDelete = async (e, event) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${event.title}?`)) {
      await deleteEvent(event.id);
      toast.success('Event deleted');
    }
  };

  const openDetail = (event) => {
    setSelectedEvent(getEnhancedEvent(event));
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedEvent(null);
  };

  const barColor = (p) => {
    if (p >= 75) return '#378ADD';
    if (p >= 50) return '#EF9F27';
    return '#E24B4A';
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 lg:p-8 font-['Inter']">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(229, 231, 235, 0.5);
        }
        .premium-shadow {
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 10px -2px rgba(0, 0, 0, 0.03);
        }
        .kpi-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        }
        .pill {
          font-size: 11px;
          padding: 3px 9px;
          border-radius: 20px;
          font-weight: 600;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }
        .p-live { background: #EAF3DE; color: #27500A; }
        .p-upcoming { background: #E6F1FB; color: #0C447C; }
        .p-draft { background: #F1EFE8; color: #5F5E5A; }
        .p-completed { background: #EEEDFE; color: #3C3489; }
        .p-physical { background: #FAEEDA; color: #633806; }
        .p-virtual { background: #E1F5EE; color: #085041; }
      `}</style>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Event Management</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {kpis.totalEvents} events · {kpis.upcomingEvents} upcoming · {kpis.liveEvents} live now
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="text-xs font-semibold h-10 px-4 border-slate-200 hover:bg-slate-50 transition-all gap-2"
            onClick={() => toast.info('Bulk notification system triggered')}
          >
            Notify Agents <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
          <Button 
            className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-10 px-5 rounded-lg shadow-lg shadow-[#042C53]/10 transition-all active:scale-95 gap-2"
            onClick={handleCreate}
          >
            <Plus className="w-4 h-4" /> Create Event
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Events', value: kpis.totalEvents, sub: `${kpis.upcomingEvents} upcoming`, color: '#0C447C' },
          { label: 'Total Seats', value: kpis.totalSeats.toLocaleString(), sub: `${kpis.totalFilled} filled · ${kpis.fillRate}%`, color: '#27500A' },
          { label: 'Students Registered', value: kpis.totalFilled.toLocaleString(), sub: `+${kpis.studentsThisMonth} this month`, color: '#27500A' },
          { label: 'Avg Fill Rate', value: `${kpis.fillRate}%`, sub: 'Target: 85%', color: '#633806' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 kpi-card premium-shadow">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{kpi.label}</p>
            <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
            <p className="text-[11px] mt-1.5 font-semibold" style={{ color: kpi.color }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search events, venues or agents..." 
            className="pl-10 h-11 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-[#042C53]/5 focus:border-[#042C53] transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 overflow-x-auto max-w-full">
          {['all', 'live', 'upcoming', 'completed', 'draft'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                activeFilter === f 
                  ? "bg-white text-[#042C53] shadow-sm ring-1 ring-slate-200" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <select 
          className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-[#042C53]/5 focus:border-[#042C53] transition-all cursor-pointer"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="physical">Physical</option>
          <option value="virtual">Virtual</option>
        </select>

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button 
            className={cn("p-2 rounded-lg transition-all", viewMode === 'card' ? "bg-slate-100 text-[#042C53]" : "text-slate-400 hover:text-slate-600")}
            onClick={() => setViewMode('card')}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button 
            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-slate-100 text-[#042C53]" : "text-slate-400 hover:text-slate-600")}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredEvents.map(event => {
            const enhanced = getEnhancedEvent(event);
            return (
              <div 
                key={event.id} 
                className="bg-white border border-slate-200/70 rounded-2xl overflow-hidden group hover:border-[#042C53]/30 transition-all premium-shadow cursor-pointer"
                onClick={() => openDetail(event)}
              >
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <h4 className="font-bold text-slate-900 leading-snug group-hover:text-[#042C53] transition-colors line-clamp-2">
                      {event.title}
                    </h4>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={cn("pill", `p-${enhanced.status}`)}>{enhanced.status}</span>
                      <span className="pill p-physical">Physical</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-5">
                    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {event.location || 'Virtual'}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {format(parseISO(event.date), 'dd MMM yyyy')}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> {event.assignedAgents?.length || 0} Agents assigned
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${enhanced.p}%`, backgroundColor: barColor(enhanced.p) }} 
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">{enhanced.filled} / {enhanced.seats} seats</span>
                      <span className="text-slate-600">{enhanced.p}%</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {enhanced.assignedAgentObjects.slice(0, 3).map((agent, idx) => (
                      <div 
                        key={idx} 
                        className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600"
                        title={agent.name}
                      >
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    ))}
                    {enhanced.assignedAgents.length > 3 && (
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                        +{enhanced.assignedAgents.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      className="p-1.5 hover:bg-white hover:text-[#042C53] rounded-lg transition-all text-slate-400"
                      onClick={(e) => handleEdit(e, event)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      className="p-1.5 hover:bg-white hover:text-red-500 rounded-lg transition-all text-slate-400"
                      onClick={(e) => handleDelete(e, event)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden premium-shadow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Event & Location</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Occupancy</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Agents</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map(event => {
                const enhanced = getEnhancedEvent(event);
                return (
                  <tr 
                    key={event.id} 
                    className="hover:bg-slate-50/30 transition-all cursor-pointer group"
                    onClick={() => openDetail(event)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm text-slate-900 group-hover:text-[#042C53] transition-colors">{event.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{event.location || 'Virtual'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                      {format(parseISO(event.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("pill", `p-${enhanced.status}`)}>{enhanced.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 w-40">
                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ width: `${enhanced.p}%`, backgroundColor: barColor(enhanced.p) }} 
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 min-w-[28px]">{enhanced.p}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      {event.assignedAgents?.length || 0}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button className="p-2 hover:bg-[#F0F7FF] hover:text-[#042C53] rounded-xl text-slate-400" onClick={(e) => handleEdit(e, event)}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-400" onClick={(e) => handleDelete(e, event)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Overlay */}
      {isDetailOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-['Outfit']">{selectedEvent.title}</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2">
                  <span className={cn("pill", `p-${selectedEvent.status}`)}>{selectedEvent.status}</span>
                  • {selectedEvent.location || 'Virtual'} • {format(parseISO(selectedEvent.date), 'dd MMM yyyy')}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeDetail} className="rounded-xl hover:bg-slate-100">
                <Plus className="w-5 h-5 rotate-45 text-slate-400" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Detail Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Seats', value: selectedEvent.seats, icon: Users, color: '#042C53' },
                  { label: 'Filled', value: selectedEvent.filled, icon: CheckCircle2, color: '#166534' },
                  { label: 'Agents', value: selectedEvent.assignedAgents.length, icon: Calendar, color: '#1E293B' },
                  { label: 'Conversion', value: '12%', icon: ArrowUpRight, color: '#854d0e' }
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xl font-bold text-slate-900 mb-0.5">{stat.value}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Fill Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Seat Fill Rate</label>
                  <span className="text-sm font-bold text-slate-900">{selectedEvent.p}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${selectedEvent.p}%`, backgroundColor: barColor(selectedEvent.p) }} 
                  />
                </div>
              </div>

              {/* Assigned Agents */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Agents</label>
                  <Button variant="ghost" className="text-[11px] font-bold text-[#042C53] h-auto p-0 hover:bg-transparent">
                    Manage Agents
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedEvent.assignedAgentObjects.length > 0 ? selectedEvent.assignedAgentObjects.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all">
                      <div className="w-8 h-8 rounded-full bg-[#E6F1FB] text-[#042C53] flex items-center justify-center text-xs font-bold">
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-900">{agent.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{agent.email}</div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold border-slate-100 bg-slate-50 text-slate-600">
                        84 Regs
                      </Badge>
                      <button className="text-slate-300 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )) : (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-medium text-slate-400">No agents assigned to this event</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {selectedEvent.description || 'No description provided for this event.'}
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="rounded-xl border-slate-200 font-bold text-xs h-11"
                onClick={(e) => handleEdit(e, selectedEvent)}
              >
                Edit Details
              </Button>
              <Button 
                className="bg-[#042C53] hover:bg-[#0C447C] text-white rounded-xl font-bold text-xs h-11 shadow-lg shadow-[#042C53]/10"
                onClick={() => toast.info('Notification request sent')}
              >
                Notify Agents
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Components */}
      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={eventToEdit}
      />
    </div>
  );
};

export default EventsPage;

