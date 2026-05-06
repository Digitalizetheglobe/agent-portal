import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Download, Flag, User, Mail, Phone,
  ChevronRight, FileText, CheckCircle2, AlertCircle,
  X, MessageSquare, Bell, ArrowUpRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';

const STAGES = ['Registered', 'Contacted', 'Confirmed', 'Attended', 'Converted'];
const STAGE_COLORS = {
  'Registered': '#378ADD',
  'Contacted': '#EF9F27',
  'Confirmed': '#7F77DD',
  'Attended': '#639922',
  'Converted': '#1D9E75'
};
const STAGE_PILLS = {
  'Registered': 'bg-[#E6F1FB] text-[#0C447C]',
  'Contacted': 'bg-[#FAEEDA] text-[#633806]',
  'Confirmed': 'bg-[#EEEDFE] text-[#3C3489]',
  'Attended': 'bg-[#EAF3DE] text-[#27500A]',
  'Converted': 'bg-[#E1F5EE] text-[#085041]'
};

const DEFAULT_DOC_CATEGORIES = [
  { label: 'Passport', value: 'Passport', mandatory: true },
  { label: 'Academic Transcripts', value: 'Transcript', mandatory: true },
  { label: 'IELTS Score Card', value: 'LanguageTest', mandatory: false }
];

const StudentsPage = () => {
  const { 
    students, 
    events, 
    agents, 
    deleteStudent, 
    fetchStudents, 
    updateStudentStatus, 
    verifyStudentDocument,
    viewStudentDocument,
    requestStudentDocument,
    loading 
  } = useData();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');
  const [curStage, setCurStage] = useState('all');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const hasFilters = useMemo(() => {
    return searchQuery.trim() !== '' || eventFilter !== 'all' || countryFilter !== 'all' || docFilter !== 'all';
  }, [searchQuery, eventFilter, countryFilter, docFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Helper Functions
  const getDocStatus = useCallback((student) => {
    if (!student) return 'missing';
    
    const event = events.find(e => e.id === student.eventId || e._id === student.eventId);
    const required = event?.requiredDocuments || DEFAULT_DOC_CATEGORIES;
    
    if (required.length === 0) return 'complete';

    const uploadedDocs = student.documents || [];
    
    // Check if any mandatory document is missing or rejected
    const mandatoryDocs = required.filter(d => d.mandatory !== false);
    const hasMissingMandatory = mandatoryDocs.some(req => {
      const doc = uploadedDocs.find(d => d.category === req.value);
      return !doc || doc.status === 'rejected';
    });

    if (hasMissingMandatory) return 'missing';

    // Check if any document is pending
    const hasPending = uploadedDocs.some(d => d.status === 'pending');
    if (hasPending) return 'pending';

    return 'complete';
  }, [events]);

  const getStudentName = (s) => {
    if (!s) return 'N/A';
    if (s.name) return s.name;
    const cf = s.customFields || {};
    if (cf.name) return cf.name;
    if (cf instanceof Map && cf.has('name')) return cf.get('name');
    const entries = cf instanceof Map ? Array.from(cf.entries()) : Object.entries(cf);
    for (const [k, v] of entries) {
      if (typeof v === 'string' && k.toLowerCase().includes('name')) return v;
    }
    for (const [k, v] of entries) {
      if (typeof v === 'string' && k.startsWith('field_') && !v.includes('@') && !v.match(/^[+\d\s-]{8,}$/)) return v;
    }
    return 'N/A';
  };

  // Derived Data & Filtering
  const baseFilteredStudents = useMemo(() => {
    return students.filter(s => {
      const name = getStudentName(s).toLowerCase();
      const cf = s.customFields || {};
      const email = (s.email || cf.email || (cf instanceof Map ? cf.get('email') : '') || '').toLowerCase();
      const phone = (s.phone || cf.phone || (cf instanceof Map ? cf.get('phone') : '') || '');
      const country = (s.country || cf.country || (cf instanceof Map ? cf.get('country') : '') || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      if (searchQuery && !name.includes(q) && !email.includes(q) && !phone.includes(q) && !country.includes(q)) return false;
      if (eventFilter !== 'all' && (s.eventId !== eventFilter && s._id !== eventFilter)) return false;
      if (countryFilter !== 'all' && (s.country || cf.country) !== countryFilter) return false;
      if (docFilter !== 'all' && getDocStatus(s) !== docFilter) return false;

      return true;
    });
  }, [students, searchQuery, eventFilter, countryFilter, docFilter]);

  const filteredStudents = useMemo(() => {
    if (curStage === 'all') return baseFilteredStudents;
    return baseFilteredStudents.filter(s => s.status === curStage);
  }, [baseFilteredStudents, curStage]);

  const kpis = useMemo(() => {
    const total = baseFilteredStudents.length;
    const missingDocs = baseFilteredStudents.filter(s => getDocStatus(s) === 'missing').length;
    const confirmed = baseFilteredStudents.filter(s => s.status === 'Confirmed').length;
    const attended = baseFilteredStudents.filter(s => s.status === 'Attended').length;
    const converted = baseFilteredStudents.filter(s => s.status === 'Converted').length;

    return {
      total,
      missingDocs,
      confirmed,
      attended,
      converted,
      confirmedPerc: total ? Math.round((confirmed / total) * 100) : 0,
      attendedPerc: total ? Math.round((attended / total) * 100) : 0,
      convRate: total ? Math.round((converted / total) * 100) : 0
    };
  }, [baseFilteredStudents]);

  const stageCounts = useMemo(() => {
    const counts = { all: baseFilteredStudents.length };
    STAGES.forEach(stage => {
      counts[stage] = baseFilteredStudents.filter(s => s.status === stage).length;
    });
    return counts;
  }, [baseFilteredStudents]);

  const uniqueCountries = useMemo(() => {
    const countries = new Set();
    students.forEach(s => {
      const cf = s.customFields || {};
      const c = s.country || cf.country || (cf instanceof Map ? cf.get('country') : null);
      if (c) countries.add(c);
    });
    return Array.from(countries);
  }, [students]);

  // Helper Functions

  const getEventName = (eventId) => {
    const event = events.find(e => e.id === eventId || e._id === eventId);
    return event?.title || 'Unknown Event';
  };

  const getAgentName = (agentId) => {
    if (!agentId) return 'Admin';
    const agent = agents.find(a => a.id === agentId || a._id === agentId);
    return agent?.name || 'Unknown Agent';
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      await updateStudentStatus(studentId, newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleVerifyDocument = async (studentId, docId, status) => {
    try {
      await verifyStudentDocument(studentId, docId, { status, remarks: `${status.charAt(0).toUpperCase() + status.slice(1)} by admin` });
      toast.success(`Document ${status}`);
    } catch (error) {
      toast.error(`Failed to ${status} document`);
    }
  };

  const selectedStudent = useMemo(() => {
    return students.find(s => (s.id === selectedStudentId || s._id === selectedStudentId));
  }, [students, selectedStudentId]);

  const requiredDocs = useMemo(() => {
    if (!selectedStudent) return [];
    const event = events.find(e => e.id === selectedStudent.eventId || e._id === selectedStudent.eventId);
    return event?.requiredDocuments || DEFAULT_DOC_CATEGORIES;
  }, [selectedStudent, events]);

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#042C53]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 font-sans bg-[#F9FAFB] min-h-screen">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Student Management</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {baseFilteredStudents.length.toLocaleString()} students 
            {eventFilter !== 'all' ? ` in ${getEventName(eventFilter)}` : ' across all events'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 text-xs font-semibold h-10 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
            onClick={() => toast.info('Export started...')}>
            <Download size={14} /> Export <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
          </button>
          <button 
            className="flex items-center gap-2 text-xs font-semibold h-10 px-4 rounded-lg border border-[#FAC775] bg-[#FAEEDA] text-[#633806] transition-all hover:bg-[#FAC775]" 
            onClick={() => toast.info('Stale students flagged')}>
            <Flag size={14} /> Flag stale <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
          </button>
          <button
            className="flex items-center gap-2 text-xs font-bold h-10 px-5 rounded-lg bg-[#042C53] hover:bg-[#0C447C] text-white shadow-lg shadow-[#042C53]/10 transition-all active:scale-95"
            onClick={() => navigate('/admin/students/new')}>
            <Plus size={14} /> Add student
          </button>
        </div>
      </div>

      {/* KPI Row */}
      {hasFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          {[
            { label: 'Total Students', val: kpis.total, sub: eventFilter !== 'all' ? 'Event reach' : 'Global reach', color: '#0C447C' },
            { label: 'Doc Missing', val: kpis.missingDocs, sub: 'Needs follow-up', color: '#791F1F' },
            { label: 'Confirmed', val: kpis.confirmed, sub: `${kpis.confirmedPerc}% of current`, color: '#3C3489' },
            { label: 'Attended', val: kpis.attended, sub: `${kpis.attendedPerc}% of current`, color: '#27500A' },
            { label: 'Converted', val: kpis.converted, sub: `${kpis.convRate}% conv. rate`, color: '#085041' }
          ].map((kpi, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
              <div className="text-[10px] text-[#6B7280] mb-1.5 uppercase font-bold tracking-wider">{kpi.label}</div>
              <div className="text-2xl font-bold text-[#111827] font-['Outfit']">{kpi.val.toLocaleString()}</div>
              <div className="text-[10px] mt-1 font-semibold" style={{ color: kpi.color }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Strip */}
      {/* <div className="flex mb-6 rounded-xl overflow-hidden border border-[#E5E7EB] bg-white shadow-sm">
        <div 
          className={`flex-1 px-4 py-3.5 cursor-pointer border-r border-[#F3F4F6] transition-all flex flex-col ${curStage === 'all' ? 'bg-[#F3F4F6] border-b-2 border-[#042C53]' : 'hover:bg-[#F9FAFB]'}`} 
          onClick={() => setCurStage('all')}
        >
          <div className="w-2 h-2 rounded-full mb-2 bg-[#888780]"></div>
          <div className="text-lg font-bold text-[#111827] font-['Outfit']">{stageCounts.all}</div>
          <div className="text-[10px] text-[#6B7280] font-semibold">All students</div>
        </div>
        {STAGES.map(stage => (
          <div 
            key={stage} 
            className={`flex-1 px-4 py-3.5 cursor-pointer border-r border-[#F3F4F6] last:border-r-0 transition-all flex flex-col ${curStage === stage ? 'bg-[#F3F4F6] border-b-2 border-[#042C53]' : 'hover:bg-[#F9FAFB]'}`} 
            onClick={() => setCurStage(stage)}
          >
            <div className="w-2 h-2 rounded-full mb-2" style={{ background: STAGE_COLORS[stage] }}></div>
            <div className="text-lg font-bold text-[#111827] font-['Outfit']">{stageCounts[stage]}</div>
            <div className="text-[10px] text-[#6B7280] font-semibold">{stage}</div>
          </div>
        ))}
      </div> */}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search by name, email, or phone…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#D1D5DB] outline-none focus:border-[#042C53] focus:ring-2 focus:ring-[#042C53]/5 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="text-sm px-3 py-2 rounded-lg border border-[#D1D5DB] bg-white min-w-[150px] outline-none"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
        >
          <option value="all">All Events</option>
          {events.map(ev => (
            <option key={ev.id || ev._id} value={ev.id || ev._id}>{ev.title}</option>
          ))}
        </select>
        <select
          className="text-sm px-3 py-2 rounded-lg border border-[#D1D5DB] bg-white min-w-[150px] outline-none"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
        >
          <option value="all">All Countries</option>
          {uniqueCountries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="text-sm px-3 py-2 rounded-lg border border-[#D1D5DB] bg-white min-w-[150px] outline-none"
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value)}
        >
          <option value="all">All Doc Status</option>
          <option value="complete">Complete</option>
          <option value="missing">Missing</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table Panel */}
      {hasFilters ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="text-[10px] text-[#6B7280] font-bold px-4 py-3 text-left uppercase tracking-wider w-[22%]">Student</th>
                <th className="text-[10px] text-[#6B7280] font-bold px-4 py-3 text-left uppercase tracking-wider w-[15%]">Event</th>
                <th className="text-[10px] text-[#6B7280] font-bold px-4 py-3 text-left uppercase tracking-wider w-[12%]">Country</th>
                <th className="text-[10px] text-[#6B7280] font-bold px-4 py-3 text-left uppercase tracking-wider w-[14%]">Pipeline Status</th>
                <th className="text-[10px] text-[#6B7280] font-bold px-4 py-3 text-left uppercase tracking-wider w-[12%]">Documents</th>
                <th className="text-[10px] text-[#6B7280] font-bold px-4 py-3 text-left uppercase tracking-wider w-[12%]">Agent</th>
                <th className="text-[10px] text-[#6B7280] font-bold px-4 py-3 text-left uppercase tracking-wider w-[13%]">Registered</th>
                <th className="w-[5%]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-16 text-[#6B7280]">
                    <User size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No students match the current filters</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(s => {
                  const docStatus = getDocStatus(s);
                  return (
                    <tr
                      key={s.id || s._id}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                      onClick={() => setSelectedStudentId(s.id || s._id)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#E6F1FB] text-[#0C447C]">
                            {getInitials(getStudentName(s))}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#111827] truncate">{getStudentName(s)}</div>
                            <div className="text-[10px] text-[#6B7280] truncate">{s.email || s.customFields?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">{getEventName(s.eventId)}</td>
                      <td className="px-4 py-3.5 text-xs">{s.country || s.customFields?.country || 'N/A'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${STAGE_PILLS[s.status] || 'bg-gray-100'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {docStatus === 'complete' && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-[#EAF3DE] text-[#27500A]">Complete</span>}
                        {docStatus === 'missing' && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-[#FCEBEB] text-[#791F1F]">Missing</span>}
                        {docStatus === 'pending' && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-[#FAEEDA] text-[#633806]">Pending</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs">{getAgentName(s.agentId).split(' ')[0]}</td>
                      <td className="px-4 py-3.5 text-xs">{new Date(s.createdAt || s.submittedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3.5">
                        <div className="w-7 h-7 rounded-lg border border-[#D1D5DB] flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:border-[#111827] transition-all">
                          <ChevronRight size={14} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-16 text-center shadow-sm mb-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-[#F3F4F6] rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={32} className="text-[#9CA3AF]" />
          </div>
          <h3 className="text-xl font-bold text-[#111827] font-['Outfit'] mb-2">Search Students</h3>
          <p className="text-[#6B7280] max-w-sm mx-auto">
            Use the search bar or filters above to find specific student records and view their registration statistics.
          </p>
        </div>
      )}

      {/* Detail Panel */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex justify-end" onClick={() => setSelectedStudentId(null)}>
          <div
            className="w-full max-w-[500px] bg-white h-full shadow-[-4px_0_15px_rgba(0,0,0,0.1)] p-6 overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-6 pb-5 border-b border-[#F3F4F6]">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold bg-[#E6F1FB] text-[#0C447C]">
                {getInitials(getStudentName(selectedStudent))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xl font-bold text-[#111827] font-['Outfit'] truncate">{getStudentName(selectedStudent)}</div>
                <div className="text-sm text-[#6B7280] mt-1 flex flex-wrap gap-2 items-center">
                  <span className="flex items-center gap-1"><Mail size={12} /> {selectedStudent.email || selectedStudent.customFields?.email}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Phone size={12} /> {selectedStudent.phone || selectedStudent.customFields?.phone}</span>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${STAGE_PILLS[selectedStudent.status]}`}>
                  {selectedStudent.status}
                </span>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6B7280]" onClick={() => setSelectedStudentId(null)}><X size={18} /></button>
              </div>
            </div>

            {getDocStatus(selectedStudent) === 'missing' && (
              <div className="flex items-center gap-3 px-4 py-3 bg-[#FEF3C7] border-l-4 border-[#F59E0B] rounded-lg mb-6 text-sm text-[#92400E] font-medium">
                <AlertCircle size={16} />
                <span>Documents missing or rejected — follow up required before event date.</span>
              </div>
            )}

            <div className="text-xs font-bold text-[#111827] uppercase tracking-widest mb-4 font-['Outfit']">Journey Progress</div>
            <div className="flex items-center mb-6">
              {STAGES.map((stage, idx) => {
                const currentIdx = STAGES.indexOf(selectedStudent.status);
                const isDone = idx < currentIdx;
                const isActive = idx === currentIdx;
                return (
                  <React.Fragment key={stage}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${isDone ? 'bg-[#EAF3DE] border-[#C0DD97] text-[#27500A]' : isActive ? 'bg-[#E6F1FB] border-[#85B7EB] text-[#0C447C] ring-4 ring-[#042C53]/5' : 'bg-gray-50 border-[#E5E7EB] text-[#6B7280]'}`}>
                        {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                      </div>
                      <div className={`text-[10px] mt-2 font-semibold text-center ${isDone ? 'text-[#27500A]' : isActive ? 'text-[#0C447C] font-bold' : 'text-[#6B7280]'}`}>{stage}</div>
                    </div>
                    {idx < STAGES.length - 1 && (
                      <div className={`flex-1 h-0.5 mt-[-18px] ${isDone ? 'bg-[#97C459]' : 'bg-[#F3F4F6]'}`}></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Preferred Country', val: selectedStudent.country || selectedStudent.customFields?.country },
                { label: 'Course Interest', val: selectedStudent.courseInterested || selectedStudent.customFields?.courseInterested },
                { label: 'Education', val: selectedStudent.education || selectedStudent.customFields?.education },
                { label: 'Event', val: getEventName(selectedStudent.eventId) },
                { label: 'Assigned Agent', val: getAgentName(selectedStudent.agentId) },
                { label: 'Registered On', val: new Date(selectedStudent.createdAt || selectedStudent.submittedAt).toLocaleDateString() }
              ].map((item, i) => (
                <div key={i}>
                  <div className="text-[10px] text-[#6B7280] font-bold uppercase mb-1">{item.label}</div>
                  <div className="text-[13px] font-semibold text-[#111827]">{item.val || 'N/A'}</div>
                </div>
              ))}
              <div className="col-span-2">
                <div className="text-[10px] text-[#6B7280] font-bold uppercase mb-1">Update Status</div>
                <select
                  className="w-full text-xs font-semibold px-2 py-2 rounded-lg border border-[#D1D5DB] bg-white outline-none"
                  value={selectedStudent.status}
                  onChange={(e) => handleStatusChange(selectedStudent.id || selectedStudent._id, e.target.value)}
                >
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="text-xs font-bold text-[#111827] uppercase tracking-widest mb-4 font-['Outfit']">Documents</div>
            <div className="flex flex-col gap-2.5 mb-6">
              {requiredDocs.map(docType => {
                const doc = selectedStudent.documents?.find(d => d.category === docType.value);
                const isMandatory = docType.mandatory !== false;
                return (
                  <div key={docType.value} className="flex items-center gap-3 p-3 border border-[#F3F4F6] rounded-xl bg-white shadow-sm">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-[#6B7280]">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[13px] font-bold text-[#111827]">{docType.label}</div>
                        {isMandatory && <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Mandatory</span>}
                      </div>
                      <div className="text-[10px] text-[#6B7280] mt-0.5">
                        {doc ? `Uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}` : 'Not uploaded'}
                      </div>
                    </div>
                    {doc ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${doc.status === 'approved' ? 'bg-[#EAF3DE] text-[#27500A]' : doc.status === 'rejected' ? 'bg-[#FCEBEB] text-[#791F1F]' : 'bg-[#FAEEDA] text-[#633806]'}`}>
                          {doc.status}
                        </span>
                        {doc.status === 'pending' && (
                          <div className="flex gap-1">
                            <button 
                              className="px-2 py-1 text-[9px] font-bold rounded-lg border border-[#D1D5DB] hover:bg-gray-50"
                              onClick={() => viewStudentDocument(selectedStudent.id || selectedStudent._id, doc.id || doc._id)}
                            >
                              View
                            </button>
                            <button 
                              className="px-2 py-1 text-[9px] font-bold rounded-lg bg-[#EAF3DE] text-[#27500A] border border-[#C0DD97] hover:bg-[#DCEFC0]"
                              onClick={() => handleVerifyDocument(selectedStudent.id || selectedStudent._id, doc.id || doc._id, 'approved')}
                            >
                              Approve
                            </button>
                            <button 
                              className="px-2 py-1 text-[9px] font-bold rounded-lg bg-[#FCEBEB] text-[#791F1F] border border-[#F7C1C1] hover:bg-[#FADADA]"
                              onClick={() => handleVerifyDocument(selectedStudent.id || selectedStudent._id, doc.id || doc._id, 'rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {doc.status !== 'pending' && (
                          <button 
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[#D1D5DB] hover:bg-gray-50 transition-all" 
                            onClick={() => viewStudentDocument(selectedStudent.id || selectedStudent._id, doc.id || doc._id)}
                          >
                            View
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isMandatory ? 'bg-[#FCEBEB] text-[#791F1F]' : 'bg-gray-100 text-gray-400'}`}>
                          {isMandatory ? 'Missing' : 'Optional'}
                        </span>
                        <button 
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-[#D1D5DB] hover:bg-gray-50 transition-all" 
                          onClick={() => requestStudentDocument(selectedStudent.id || selectedStudent._id, docType.label)}
                        >
                          Request <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 pt-5 border-t border-[#F3F4F6]">
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg border border-[#D1D5DB] hover:bg-gray-50 transition-all" onClick={() => toast.success('Follow-up message sent')}>
                <MessageSquare size={14} /> Message Student <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg border border-[#D1D5DB] hover:bg-gray-50 transition-all" onClick={() => toast.success('Agent notified')}>
                <Bell size={14} /> Alert Agent <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
              <div className="w-full flex gap-2">
                <button className="flex-1 px-4 py-2 text-[11px] font-bold rounded-lg bg-[#EAF3DE] text-[#27500A] border border-[#C0DD97] hover:opacity-90 transition-all" onClick={() => handleStatusChange(selectedStudent.id || selectedStudent._id, 'Attended')}>
                  Mark Attended
                </button>
                <button className="flex-1 px-4 py-2 text-[11px] font-bold rounded-lg bg-[#042C53] text-[#B5D4F4] hover:opacity-90 transition-all" onClick={() => handleStatusChange(selectedStudent.id || selectedStudent._id, 'Converted')}>
                  Mark Converted <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>
              <button
                className="w-full mt-2 px-4 py-2 text-[11px] font-bold rounded-lg bg-[#FCEBEB] text-[#791F1F] border border-[#F7C1C1] hover:bg-[#F7C1C1] transition-all"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this record?')) {
                    deleteStudent(selectedStudent.id || selectedStudent._id);
                    setSelectedStudentId(null);
                    toast.success('Student record deleted');
                  }
                }}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;
