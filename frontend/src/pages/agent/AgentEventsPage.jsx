import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  MapPin,
  Users,
  ArrowUpRight,
  Clock,
  X,
  GraduationCap,
  LayoutGrid,
  List
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { format, isPast, isToday, isFuture, parseISO } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

const AgentEventsPage = () => {
  const { user } = useAuth();
  const { events, getEventsForAgent, getStudentsByAgent, students } = useData();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('live');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState('grid');

  // Filter events assigned to this agent
  const assignedEvents = useMemo(() => {
    return getEventsForAgent(user?.id);
  }, [events, user?.id, getEventsForAgent]);

  const myStudents = useMemo(() => {
    return getStudentsByAgent(user?.id);
  }, [students, user?.id, getStudentsByAgent]);

  // Status mapping logic
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
    const allEvents = assignedEvents.length;
    const live = assignedEvents.filter(e => getEventStatus(e) === 'live').length;
    const upcoming = assignedEvents.filter(e => getEventStatus(e) === 'upcoming').length;
    const past = assignedEvents.filter(e => getEventStatus(e) === 'completed').length;

    const totalRegistrations = myStudents.length;
    const avgRegistrations = assignedEvents.length > 0 ? Math.round(totalRegistrations / assignedEvents.length) : 0;

    return { live, upcoming, past, totalRegistrations, avgRegistrations };
  }, [assignedEvents, myStudents]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return assignedEvents.filter(event => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === 'all' || (event.type && event.type.toLowerCase() === typeFilter);

      return matchesSearch && matchesType;
    });
  }, [assignedEvents, searchQuery, typeFilter]);

  // Data helpers
  const getEnhancedEvent = (event) => {
    const eventStudents = myStudents.filter(s => s.eventId === event.id);
    const registered = eventStudents.length;
    const seats = event.seatCapacity || 50;
    const p = Math.round(seats > 0 ? (registered / seats) * 100 : 0);
    const status = getEventStatus(event);

    return {
      ...event,
      registered,
      seats,
      p,
      status
    };
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

  const getStatusClass = (status) => {
    switch (status) {
      case 'live': return 'p-live';
      case 'upcoming': return 'p-up';
      case 'completed': return 'p-comp';
      default: return 'p-draft';
    }
  };

  const getTypePill = (type) => {
    return type === 'virtual'
      ? <span className="pill p-vir">Virtual</span>
      : <span className="pill p-phy">Physical</span>;
  };

  const renderEventCard = (event) => {
    const enhanced = getEnhancedEvent(event);
    const p = enhanced.p;
    const bc = barColor(p);
    const status = enhanced.status;

    return (
      <div
        key={event.id}
        className={cn(
          "ev-card transition-all duration-200",
          status === 'live' ? 'live-card' : status === 'upcoming' ? 'upcoming-card' : 'past-card'
        )}
        onClick={() => openDetail(event)}
      >
        <div className="ev-card-inner">
          <div className="ev-top">
            <div className="ev-name">{event.title}</div>
            <div className="ev-badges">
              <span className={cn("pill", getStatusClass(status))}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              {getTypePill(event.type)}
            </div>
          </div>

          <div className="ev-meta">
            <div className="em-row">
              {status === 'live' ? (
                <div className="live-pulse" />
              ) : (
                <Clock className="w-2.5 h-2.5" />
              )}
              <span>{format(parseISO(event.date), 'dd MMM yyyy')}</span>
            </div>
            <div className="em-row">
              <MapPin className="w-2.5 h-2.5" />
              <span className="truncate">{event.location || 'Virtual'}</span>
            </div>
            <div className="em-row">
              <GraduationCap className="w-2.5 h-2.5" />
              <span>{enhanced.registered} Students Registered</span>
            </div>
          </div>

          <div className="seat-section">
            <div className="seat-bar-bg">
              <div
                className="seat-bar-fill transition-all duration-500"
                style={{ width: `${p}%`, background: bc }}
              />
            </div>
            <div className="seat-lbl">
              <span>{enhanced.registered}/{enhanced.seats} capacity</span>
              <span className="seat-pct" style={{ color: bc }}>{p}%</span>
            </div>
          </div>
        </div>

        <div className="ev-card-bot">
          <div className="uni-chips">
            {['Management', 'Student Care', 'Direct Portal'].slice(0, 2).map((tag, idx) => (
              <div key={idx} className="uni-chip">{tag}</div>
            ))}
          </div>
          <div className="card-actions">
            <button
              className="ibtn"
              title="View Details"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/agent/events/${event.id}`);
              }}
            >
              <ArrowUpRight className="w-3 h-3 text-slate-500" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pg min-h-screen bg-[#F9FAFB] font-['Inter']">
      <style>{`
        :root {
          --color-text-primary: #111827;
          --color-text-secondary: #64748b;
          --color-border-secondary: #e2e8f0;
          --color-border-tertiary: #f1f5f9;
          --color-background-primary: #ffffff;
          --color-background-secondary: #f8fafc;
          --border-radius-md: 8px;
          --border-radius-lg: 12px;
        }
        .pg { padding: 24px; }
        .toprow { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .toprow h2 { font-size: 20px; font-weight: 600; color: var(--color-text-primary); font-family: 'Outfit'; }
        .toprow p { font-size: 13px; color: var(--color-text-secondary); margin-top: 2px; font-weight: 500; }
        
        .kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 28px; }
        .kpi { background: white; border: 1px solid #f1f5f9; border-radius: var(--border-radius-lg); padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .kpi-label { font-size: 11px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .kpi-val { font-size: 24px; font-weight: 700; color: var(--color-text-primary); }
        .kpi-sub { font-size: 11px; margin-top: 4px; font-weight: 600; }
        
        .controls { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .sw { position: relative; flex: 1; min-width: 200px; }
        .sw input { width: 100%; padding-left: 36px; height: 40px; font-size: 13px; border-radius: 10px; border: 1px solid #e2e8f0; }
        .si { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .section-label-wrap { display: flex; align-items: center; gap: 10px; }
        .section-line-label { font-size: 14px; font-weight: 600; color: var(--color-text-primary); font-family: 'Outfit'; }
        .section-count { font-size: 11px; padding: 2px 10px; border-radius: 20px; font-weight: 700; }
        .sc-live { background: #EAF3DE; color: #27500A; }
        .sc-up { background: #E6F1FB; color: #0C447C; }
        .sc-past { background: #F1EFE8; color: #5F5E5A; }
        
        .section-divider { height: 2px; border-radius: 2px; margin-bottom: 20px; }
        .div-live { background: linear-gradient(90deg, #639922 0%, #639922 20%, transparent 100%); opacity: 0.8; }
        .div-up { background: linear-gradient(90deg, #378ADD 0%, #378ADD 20%, transparent 100%); opacity: 0.8; }
        .div-past { background: linear-gradient(90deg, #B4B2A9 0%, #B4B2A9 20%, transparent 100%); opacity: 0.8; }
        
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .ev-card { background: white; border: 1px solid #f1f5f9; border-radius: var(--border-radius-lg); overflow: hidden; cursor: pointer; position: relative; }
        .ev-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .live-card { border-left: 4px solid #639922; }
        .upcoming-card { border-left: 4px solid #378ADD; }
        .past-card { border-left: 4px solid #B4B2A9; opacity: 0.9; }
        
        .ev-card-inner { padding: 18px 18px 14px; }
        .ev-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
        .ev-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); line-height: 1.4; flex: 1; }
        .ev-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        
        .pill { font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 700; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.02em; }
        .p-live { background: #EAF3DE; color: #27500A; }
        .p-up { background: #E6F1FB; color: #0C447C; }
        .p-draft { background: #F1EFE8; color: #5F5E5A; }
        .p-comp { background: #EEEDFE; color: #3C3489; }
        .p-phy { background: #FAEEDA; color: #633806; }
        .p-vir { background: #E1F5EE; color: #085041; }
        
        .ev-meta { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .em-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }
        
        .seat-section { margin-top: 14px; }
        .seat-bar-bg { height: 6px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
        .seat-bar-fill { height: 100%; border-radius: 4px; }
        .seat-lbl { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); }
        .seat-pct { font-weight: 700; }
        
        .ev-card-bot { padding: 10px 18px; border-top: 1px solid #f8fafc; background: #fbfcfd; display: flex; align-items: center; justify-content: space-between; }
        .uni-chips { display: flex; gap: 5px; overflow: hidden; flex: 1; margin-right: 10px; }
        .uni-chip { font-size: 10px; padding: 2px 8px; border-radius: 6px; background: white; border: 1px solid #f1f5f9; color: var(--color-text-secondary); font-weight: 600; white-space: nowrap; }
        
        .card-actions { display: flex; gap: 6px; }
        .ibtn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #f1f5f9; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .ibtn:hover { background: #f8fafc; border-color: #e2e8f0; }
        
        .live-pulse { width: 8px; height: 8px; border-radius: 50%; background: #639922; flex-shrink: 0; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { transform: scale(0.95); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.5; } 100% { transform: scale(0.95); opacity: 1; } }
 
        .detail-panel { 
          position: fixed; top: 0; right: 0; width: 100%; max-width: 480px; height: 100%; 
          background: white; z-index: 100; box-shadow: -10px 0 30px rgba(0,0,0,0.05); 
          display: flex; flex-direction: column; animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        
        .dp-head { padding: 24px; border-bottom: 1px solid #f1f5f9; }
        .dp-body { padding: 24px; flex: 1; overflow-y: auto; }
        .dp-footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; gap: 10px; }
        
        .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-box { background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #f1f5f9; }
        .stat-box-val { font-size: 20px; font-weight: 700; color: #1e293b; }
        .stat-box-lbl { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; margin-top: 4px; }

        /* Tab navigation */
        .tab-filter-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 0; flex-wrap: wrap; }
        .tab-strip { display: flex; align-items: center; gap: 4px; background: #f1f5f9; padding: 4px; border-radius: 12px; }
        .tab-btn { display: flex; align-items: center; padding: 8px 18px; border-radius: 9px; border: none; background: transparent; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.18s; white-space: nowrap; }
        .tab-btn:hover { color: #1e293b; background: rgba(255,255,255,0.6); }
        .tab-btn-active { background: #ffffff !important; color: #1e293b !important; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .tab-btn-live.tab-btn-active { color: #27500A !important; }
        .tab-btn-upcoming.tab-btn-active { color: #0C447C !important; }
        .tab-btn-completed.tab-btn-active { color: #3C3489 !important; }
        .tab-filters { display: flex; align-items: center; gap: 10px; }
      `}</style>

      {/* Header Section */}
      <div className="toprow">
        <div>
          <h2>My Events</h2>
          <p>Assigned campaigns and student recruitment drives</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold h-9 px-4 border-slate-200"
            onClick={() => toast.info('Requesting more events from admin')}
          >
            Request events <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label">Live now</div>
          <div className="kpi-val" style={{ color: '#27500A' }}>{kpis.live}</div>
          <div className="kpi-sub text-[#27500A]">Events in progress</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Upcoming</div>
          <div className="kpi-val" style={{ color: '#0C447C' }}>{kpis.upcoming}</div>
          <div className="kpi-sub text-[#0C447C]">Next: {assignedEvents.filter(e => isFuture(parseISO(e.date))).sort((a, b) => parseISO(a.date) - parseISO(b.date))[0]?.date || 'TBD'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Past events</div>
          <div className="kpi-val">{kpis.past}</div>
          <div className="kpi-sub text-slate-400">Total completed</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Total Registrations</div>
          <div className="kpi-val">{kpis.totalRegistrations}</div>
          <div className="kpi-sub text-[#791F1F]">Avg {kpis.avgRegistrations} per event</div>
        </div>
      </div>

      {/* Tab + Filter Row */}
      <div className="tab-filter-row">
        {/* Tab Strip */}
        <div className="tab-strip">
          {[
            { key: 'live', label: 'Live now', countClass: 'sc-live', count: kpis.live },
            { key: 'upcoming', label: 'Upcoming', countClass: 'sc-up', count: kpis.upcoming },
            { key: 'completed', label: 'Past events', countClass: 'sc-past', count: kpis.past },
          ].map(tab => (
            <button
              key={tab.key}
              className={cn('tab-btn', activeTab === tab.key && 'tab-btn-active', `tab-btn-${tab.key}`)}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.key === 'live' && <div className="live-pulse" style={{ width: 7, height: 7, marginRight: 7 }} />}
              {tab.label}
              <span className={cn('section-count', tab.countClass)} style={{ marginLeft: 8 }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="tab-filters">
          <div className="sw" style={{ minWidth: 220 }}>
            <Search className="si w-4 h-4" />
            <input
              type="text"
              placeholder="Search assigned events…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            <option value="physical">Physical</option>
            <option value="virtual">Virtual</option>
          </select>

          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDisplayMode('table')}
              className={cn(
                "h-8 w-8 p-0 rounded-lg transition-all",
                displayMode === 'table' ? "bg-[#E6F1FB] text-[#0C447C] shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-[#111827] "
              )}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDisplayMode('grid')}
              className={cn(
                "h-8 w-8 p-0 rounded-lg transition-all",
                displayMode === 'grid' ? "bg-[#E6F1FB] text-[#0C447C] shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-[#111827]"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Active Tab Divider */}
      <div className={cn('section-divider', activeTab === 'live' ? 'div-live' : activeTab === 'upcoming' ? 'div-up' : 'div-past')} style={{ marginBottom: 24 }} />

      {/* Active Tab Content */}
      {(() => {
        const tabItems = filteredEvents.filter(e => getEventStatus(e) === activeTab);
        if (tabItems.length === 0) return (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No events found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query</p>
          </div>
        );

        if (displayMode === 'grid') {
          return (
            <div className="card-grid">
              {tabItems.map(event => renderEventCard(event))}
            </div>
          );
        }

        return (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date & Type</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registrations</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tabItems.map(event => {
                  const enhanced = getEnhancedEvent(event);
                  return (
                    <tr key={event.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => openDetail(event)}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{event.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">{event.description || 'No description'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-700">{format(parseISO(event.date), 'dd MMM yyyy')}</div>
                        <div className="mt-1">{getTypePill(event.type)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[150px]">{event.location || 'Virtual'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="text-xs font-bold text-slate-700">{enhanced.registered}/{enhanced.seats} capacity</div>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full" style={{ width: `${enhanced.p}%`, backgroundColor: barColor(enhanced.p) }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("pill", getStatusClass(enhanced.status))}>
                          {enhanced.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Detail Panel */}
      {isDetailOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={closeDetail} />
          <div className="detail-panel">
            <div className="dp-head">
              <div className="flex justify-between items-start mb-4">
                <div className={cn("pill", getStatusClass(selectedEvent.status))}>
                  {selectedEvent.status}
                </div>
                <button onClick={closeDetail} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-['Outfit']">{selectedEvent.title}</h3>
              <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                {selectedEvent.type === 'virtual' ? 'Virtual' : 'Physical'} • {selectedEvent.location || 'Online'} • {format(parseISO(selectedEvent.date), 'dd MMM yyyy')}
              </p>
            </div>

            <div className="dp-body">
              <div className="stat-grid">
                <div className="stat-box">
                  <div className="stat-box-val">{selectedEvent.seats}</div>
                  <div className="stat-box-lbl">Total seats</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-val">{selectedEvent.registered}</div>
                  <div className="stat-box-lbl">Your Registrations</div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campaign Progress</span>
                  <span className="text-sm font-bold text-slate-900">{selectedEvent.p}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${selectedEvent.p}%`, backgroundColor: barColor(selectedEvent.p) }}
                  />
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {selectedEvent.description || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className="dp-footer">
              <Button
                variant="outline"
                className="flex-1 rounded-xl font-bold text-xs h-10"
                onClick={() => navigate(`/agent/events/${selectedEvent.id}`)}
              >
                Manage Registrations
              </Button>
              <Button
                className="flex-1 bg-[#042C53] hover:bg-[#0C447C] text-[#B5D4F4] rounded-xl font-bold text-xs h-10"
                onClick={() => toast.info('Support request sent to admin')}
              >
                Request Support
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentEventsPage;
