import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Download, GraduationCap, Mail, Phone,
  ChevronRight, FileText, CheckCircle2, AlertCircle,
  X, MessageSquare, LayoutGrid, List, Filter,
  ArrowRight, User, Calendar, MapPin, Upload, ArrowUpRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';

const STAGES = ['Registered', 'Contacted', 'Confirmed', 'Attended', 'Converted'];
const STAGE_PILLS = {
  'Registered': 'bg-[#E6F1FB] text-[#0C447C]',
  'Contacted': 'bg-[#FAEEDA] text-[#633806]',
  'Confirmed': 'bg-[#EEEDFE] text-[#3C3489]',
  'Attended': 'bg-[#EAF3DE] text-[#27500A]',
  'Converted': 'bg-[#E1F5EE] text-[#085041]'
};
const STAGE_COLORS = {
  'Registered': '#378ADD',
  'Contacted': '#EF9F27',
  'Confirmed': '#7F77DD',
  'Attended': '#639922',
  'Converted': '#1D9E75'
};

const DEFAULT_DOC_CATEGORIES = [
  { label: 'Passport', value: 'Passport', mandatory: true },
  { label: 'Academic Transcripts', value: 'Transcript', mandatory: true },
  { label: 'English Proficiency', value: 'LanguageTest', mandatory: false }
];

const AgentStudentsPage = () => {
  const { user } = useAuth();
  const {
    students,
    events,
    getStudentsByAgent,
    fetchStudents,
    addStudent,
    updateStudentStatus,
    getEventsForAgent,
    uploadStudentDocument,
    viewStudentDocument,
    loading
  } = useData();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');
  const [curStage, setCurStage] = useState('all');
  const [viewType, setViewType] = useState('table'); // 'table' or 'grid'
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: 'United Kingdom',
    courseInterested: '',
    education: "Bachelor's degree",
    city: '',
    eventId: '',
    notes: '',
    customFields: {}
  });

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const myStudents = useMemo(() => {
    return getStudentsByAgent(user?.id);
  }, [students, user?.id, getStudentsByAgent]);

  const assignedEvents = useMemo(() => {
    return getEventsForAgent(user?.id);
  }, [events, user?.id, getEventsForAgent]);

  // Set default event if none selected and events exist
  useEffect(() => {
    if (!formData.eventId && assignedEvents.length > 0) {
      setFormData(prev => ({ ...prev, eventId: assignedEvents[0].id || assignedEvents[0]._id }));
    }
  }, [assignedEvents, formData.eventId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('field_')) {
      const fieldId = name.replace('field_', '');
      setFormData(prev => ({
        ...prev,
        customFields: { ...prev.customFields, [fieldId]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const event = events.find(e => e.id === formData.eventId || e._id === formData.eventId);
      await addStudent({
        ...formData,
        agentId: user?.id,
        status: 'Registered',
        submittedAt: new Date().toISOString()
      });
      toast.success('Student registered successfully');
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        country: 'United Kingdom',
        courseInterested: '',
        education: "Bachelor's degree",
        city: '',
        eventId: assignedEvents[0]?.id || assignedEvents[0]?._id || '',
        notes: '',
        customFields: {}
      });
    } catch (error) {
      toast.error('Failed to register student');
    }
  };

  const getStudentValue = (student, key, fallbackLabel) => {
    if (!student) return 'N/A';

    // Direct property
    if (student[key] && student[key] !== 'Not specified') return student[key];

    // Custom field by exact key
    if (student.customFields?.[key]) return student.customFields[key];

    // Custom field by label lookup
    const event = events.find(e => e.id === student.eventId || e._id === student.eventId);
    if (event?.formFields) {
      const field = event.formFields.find(f =>
        f.label.toLowerCase().trim() === fallbackLabel.toLowerCase().trim() ||
        f.label.toLowerCase().includes(fallbackLabel.toLowerCase())
      );
      if (field) {
        const val = student.customFields?.[field.id] || student.customFields?.[`field_${field.id}`];
        if (val) return val;
      }
    }

    return 'N/A';
  };

  const getStudentName = (s) => {
    const val = getStudentValue(s, 'name', 'Full Name');
    return val === 'N/A' ? 'Unknown Student' : val;
  };

  const getInitials = (name) => {
    if (!name || name === 'N/A') return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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


  const getEventName = (eventId) => {
    const event = events.find(e => e.id === eventId || e._id === eventId);
    return event?.title || 'Unknown Event';
  };

  // Filtering Logic
  const filteredStudents = useMemo(() => {
    return myStudents.filter(s => {
      const name = getStudentName(s).toLowerCase();
      const cf = s.customFields || {};
      const email = (s.email || cf.email || '').toLowerCase();
      const phone = (s.phone || cf.phone || '');
      const q = searchQuery.toLowerCase();

      if (searchQuery && !name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
      if (eventFilter !== 'all' && s.eventId !== eventFilter) return false;
      if (docFilter !== 'all' && getDocStatus(s) !== docFilter) return false;
      if (curStage !== 'all' && s.status !== curStage) return false;

      return true;
    });
  }, [myStudents, searchQuery, eventFilter, docFilter, curStage]);

  const kpis = useMemo(() => {
    const total = myStudents.length;
    const counts = { all: total };
    STAGES.forEach(stage => {
      counts[stage] = myStudents.filter(s => s.status === stage).length;
    });
    return counts;
  }, [myStudents]);

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      await updateStudentStatus(studentId, newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleUploadClick = (category) => {
    setUploadCategory(category);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedStudentId || !uploadCategory) return;

    try {
      setIsUploading(true);
      await uploadStudentDocument(selectedStudentId, file, uploadCategory);
      toast.success(`${uploadCategory} uploaded successfully`);
      fetchStudents(); // Refresh data
    } catch (error) {
      toast.error(`Failed to upload ${uploadCategory}`);
    } finally {
      setIsUploading(false);
      setUploadCategory(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const selectedStudent = useMemo(() => {
    return myStudents.find(s => (s.id === selectedStudentId || s._id === selectedStudentId));
  }, [myStudents, selectedStudentId]);

  const requiredDocs = useMemo(() => {
    if (!selectedStudent) return [];
    const event = events.find(e => e.id === selectedStudent.eventId || e._id === selectedStudent.eventId);
    return event?.requiredDocuments || DEFAULT_DOC_CATEGORIES;
  }, [selectedStudent, events]);

  if (loading && myStudents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#042C53]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 font-sans bg-[#F9FAFB] min-h-screen">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">My Students</h1>
          <p className="text-sm text-[#6B7280] font-medium mt-1">
            {myStudents.length} students registered across all your events
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-10 text-xs font-bold border-gray-200"
            onClick={() => toast.info('Exporting student list...')}
          >
            <Download size={14} className="mr-2" /> Export
          </Button>
          <Button
            className="h-10 text-xs font-bold bg-[#042C53] hover:bg-[#0C447C] text-white shadow-lg shadow-[#042C53]/10"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={14} className="mr-2" /> Register Student
          </Button>
        </div>
      </div>

      {/* KPI Pipeline Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div
          className={`cursor-pointer p-4 rounded-xl border transition-all ${curStage === 'all' ? 'bg-white border-[#378ADD] shadow-md ring-1 ring-[#378ADD]/20' : 'bg-white border-gray-200 hover:border-gray-300'}`}
          onClick={() => setCurStage('all')}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">All Students</span>
          </div>
          <div className="text-2xl font-bold text-[#111827] font-['Outfit']">{kpis.all}</div>
          <p className="text-[10px] text-gray-400 mt-1 font-medium">My registrations</p>
        </div>
        {STAGES.map(stage => (
          <div
            key={stage}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${curStage === stage ? 'bg-white border-[#378ADD] shadow-md ring-1 ring-[#378ADD]/20' : 'bg-white border-gray-200 hover:border-gray-300'}`}
            onClick={() => setCurStage(stage)}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stage}</span>
            </div>
            <div className="text-2xl font-bold text-[#111827] font-['Outfit']">{kpis[stage] || 0}</div>
            <p className="text-[10px] text-gray-400 mt-1 font-medium">
              {stage === 'Registered' ? 'Awaiting contact' :
                stage === 'Contacted' ? 'Follow up needed' :
                  stage === 'Confirmed' ? 'Attended event' :
                    stage === 'Converted' ? 'Applied to uni' : 'Pipeline progress'}
            </p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] focus:ring-4 focus:ring-[#042C53]/5 transition-all bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            className="text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#042C53] transition-all"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="all">All Events</option>
            {assignedEvents.map(ev => (
              <option key={ev.id || ev._id} value={ev.id || ev._id}>{ev.title}</option>
            ))}
          </select>
          <select
            className="text-xs font-bold px-3 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#042C53] transition-all"
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
          >
            <option value="all">All Docs</option>
            <option value="complete">Complete</option>
            <option value="missing">Missing</option>
            <option value="pending">Pending</option>
          </select>
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button
              className={`p-1.5 rounded-lg transition-all ${viewType === 'table' ? 'bg-[#F3F4F6] text-[#042C53]' : 'text-gray-400 hover:text-gray-600'}`}
              onClick={() => setViewType('table')}
            >
              <List size={16} />
            </button>
            <button
              className={`p-1.5 rounded-lg transition-all ${viewType === 'grid' ? 'bg-[#F3F4F6] text-[#042C53]' : 'text-gray-400 hover:text-gray-600'}`}
              onClick={() => setViewType('grid')}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {viewType === 'table' ? (
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Country</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Documents</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-4 w-[80px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.length > 0 ? filteredStudents.map(s => {
                  const docStatus = getDocStatus(s);
                  return (
                    <tr
                      key={s.id || s._id}
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedStudentId(s.id || s._id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center text-xs font-bold shadow-sm">
                            {getInitials(getStudentName(s))}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#111827] truncate">{getStudentName(s)}</div>
                            <div className="text-[11px] text-gray-500 truncate">{s.email || s.customFields?.email || 'No email provided'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-600">
                        {getEventName(s.eventId).split(' ').slice(0, 3).join(' ')}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-600">
                        {s.country || s.customFields?.country || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${STAGE_PILLS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {docStatus === 'complete' && <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase bg-[#EAF3DE] text-[#27500A]">Complete</span>}
                        {docStatus === 'missing' && <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase bg-[#FCEBEB] text-[#791F1F]">Missing</span>}
                        {docStatus === 'pending' && <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase bg-[#FAEEDA] text-[#633806]">Pending</span>}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">
                        {new Date(s.createdAt || s.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#042C53] hover:border-[#042C53] transition-all">
                          <ChevronRight size={16} />
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-20 text-center text-gray-400 italic">
                      <User size={48} className="mx-auto mb-3 opacity-20" />
                      No students match your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.length > 0 ? filteredStudents.map(s => {
            const docStatus = getDocStatus(s);
            return (
              <Card
                key={s.id || s._id}
                className="border-gray-200 hover:border-[#042C53] hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setSelectedStudentId(s.id || s._id)}
              >
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center text-sm font-bold group-hover:scale-105 transition-transform">
                        {getInitials(getStudentName(s))}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${STAGE_PILLS[s.status] || 'bg-gray-100'}`}>
                          {s.status}
                        </span>
                        {docStatus === 'missing' && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-[#FCEBEB] text-[#791F1F]">Doc Missing</span>}
                      </div>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-bold text-[#111827] text-base group-hover:text-[#042C53] transition-colors">{getStudentName(s)}</h4>
                      <p className="text-xs text-gray-500 font-medium truncate">{s.email || s.customFields?.email || 'No email provided'}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                        <Calendar size={12} className="text-gray-400" />
                        <span className="truncate">{getEventName(s.eventId)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                        <MapPin size={12} className="text-gray-400" />
                        <span>{s.country || s.customFields?.country || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-[#F9FAFB] border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(s.createdAt || s.submittedAt).toLocaleDateString()}</span>
                    <button className="text-[#042C53] hover:translate-x-1 transition-transform">
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          }) : (
            <div className="col-span-full py-20 text-center text-gray-400 italic">
              No students match your current filters.
            </div>
          )}
        </div>
      )}

      {/* Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[2000] flex items-center justify-center p-4">
          <Card className="w-full max-w-[650px] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold text-[#111827] font-['Outfit']">Register New Student</h3>
              <button
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                onClick={() => setShowAddModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 max-h-[70vh] overflow-y-auto bg-[#F9FAFB]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Fields */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Full Name (as per ID)</label>
                    <input
                      type="text" required name="name" value={formData.name} onChange={handleInputChange}
                      placeholder="e.g. Priya Sharma"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email" required name="email" value={formData.email} onChange={handleInputChange}
                      placeholder="student@email.com"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="tel" required name="phone" value={formData.phone} onChange={handleInputChange}
                      placeholder="+91 98200 00000"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Preferred Country</label>
                    <select
                      name="country" value={formData.country} onChange={handleInputChange}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white appearance-none"
                    >
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="USA">USA</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">City</label>
                    <input
                      type="text" required name="city" value={formData.city} onChange={handleInputChange}
                      placeholder="e.g. Delhi"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white"
                    />
                  </div>

                  {/* Custom Event Fields */}
                  {assignedEvents.find(e => e.id === formData.eventId || e._id === formData.eventId)?.formFields?.map(field => (
                    <div key={field.id} className={cn("space-y-1.5", field.type === 'paragraph' ? "md:col-span-2" : "")}>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          name={`field_${field.id}`}
                          value={formData.customFields[field.id] || ''}
                          onChange={handleInputChange}
                          required={field.required}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white appearance-none"
                        >
                          <option value="">Select option</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'paragraph' ? (
                        <textarea
                          name={`field_${field.id}`}
                          value={formData.customFields[field.id] || ''}
                          onChange={handleInputChange}
                          required={field.required}
                          placeholder={field.placeholder}
                          rows={3}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white"
                        />
                      ) : (
                        <input
                          type={field.type === 'date' ? 'date' : 'text'}
                          name={`field_${field.id}`}
                          value={formData.customFields[field.id] || ''}
                          onChange={handleInputChange}
                          required={field.required}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white"
                        />
                      )}
                    </div>
                  ))}

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Select Event</label>
                    <select
                      required name="eventId" value={formData.eventId} onChange={handleInputChange}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white appearance-none"
                    >
                      <option value="">Select an event...</option>
                      {assignedEvents.map(ev => (
                        <option key={ev.id || ev._id} value={ev.id || ev._id}>{ev.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Additional Notes</label>
                    <textarea
                      name="notes" value={formData.notes} onChange={handleInputChange}
                      placeholder="Any specific requirements or notes about this student…"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#042C53] transition-all bg-white min-h-[80px]"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                <Button
                  type="button" variant="outline"
                  className="h-10 text-xs font-bold border-gray-200"
                  onClick={() => setShowAddModal(false)}
                >
                  Discard
                </Button>
                <Button
                  type="submit"
                  className="h-10 text-xs font-bold bg-[#042C53] hover:bg-[#0C447C] text-white px-8"
                >
                  Register Student
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Detail Panel Overlay */}
      {selectedStudent && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex justify-end"
          onClick={() => setSelectedStudentId(null)}
        >
          <div
            className="w-full max-w-[550px] bg-white h-full shadow-[-10px_0_30px_rgba(0,0,0,0.1)] p-0 overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="p-6 md:p-8 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center text-xl font-bold shadow-sm">
                    {getInitials(getStudentName(selectedStudent))}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#111827] font-['Outfit']">{getStudentName(selectedStudent)}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 font-medium">
                      <span className="flex items-center gap-1.5"><Mail size={14} /> {getStudentValue(selectedStudent, 'email', 'Email Address')}</span>
                      <span className="text-gray-300">•</span>
                      <span className="flex items-center gap-1.5"><Phone size={14} /> {getStudentValue(selectedStudent, 'phone', 'Phone Number')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`px-3 py-1 font-bold uppercase tracking-wider ${STAGE_PILLS[selectedStudent.status]}`}>
                    {selectedStudent.status}
                  </Badge>
                  <button
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setSelectedStudentId(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {getDocStatus(selectedStudent) === 'missing' && (
                <div className="flex items-start gap-3 p-4 bg-[#FFF9EB] border border-[#FEF3C7] rounded-xl mb-0">
                  <AlertCircle size={18} className="text-[#854F0B] mt-0.5" />
                  <div>
                    <p className="text-[13px] font-bold text-[#854F0B]">Action Required: Missing Documents</p>
                    <p className="text-[11px] text-[#854F0B]/80 font-medium mt-0.5">Please request the passport and academic transcripts before the event date.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 space-y-10">
              {/* Journey Tracker */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Student Journey Progress</h4>
                <div className="flex items-center">
                  {STAGES.map((stage, idx) => {
                    const currentIdx = STAGES.indexOf(selectedStudent.status);
                    const isDone = idx < currentIdx;
                    const isActive = idx === currentIdx;
                    return (
                      <React.Fragment key={stage}>
                        <div className="flex flex-col items-center flex-1 relative">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all z-1 ${isDone ? 'bg-[#EAF3DE] border-[#C0DD97] text-[#27500A]' :
                            isActive ? 'bg-[#E6F1FB] border-[#0C447C] text-[#0C447C] ring-4 ring-[#E6F1FB]/50 shadow-sm' :
                              'bg-white border-gray-100 text-gray-300'
                            }`}>
                            {isDone ? <CheckCircle2 size={16} /> : idx + 1}
                          </div>
                          <span className={`text-[10px] mt-3 font-bold text-center ${isDone ? 'text-[#27500A]' :
                            isActive ? 'text-[#0C447C]' :
                              'text-gray-300'
                            }`}>
                            {stage}
                          </span>
                        </div>
                        {idx < STAGES.length - 1 && (
                          <div className={`flex-1 h-0.5 mt-[-24px] ${isDone ? 'bg-[#97C459]' : 'bg-gray-100'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Student Details Grid */}
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] mb-6">Metadata & Context</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  {[
                    { label: 'Preferred Country', value: getStudentValue(selectedStudent, 'country', 'Country of Interest') },
                    { label: 'Course Interest', value: getStudentValue(selectedStudent, 'courseInterested', 'Course Interested') },
                    { label: 'Education Level', value: getStudentValue(selectedStudent, 'education', 'Highest Qualification') },
                    { label: 'Registered City', value: getStudentValue(selectedStudent, 'city', 'City') },
                    { label: 'Assigned Event', value: getEventName(selectedStudent.eventId) },
                    { label: 'Onboarding Date', value: new Date(selectedStudent.createdAt || selectedStudent.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
                  ].map((item, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                      <p className="text-[13px] font-semibold text-[#111827]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Required Documents</h4>
                  <Badge variant="outline" className="text-[9px] font-bold border-gray-200">{requiredDocs.length} TOTAL</Badge>
                </div>
                <div className="space-y-3">
                  {requiredDocs.map(docType => {
                    const doc = selectedStudent.documents?.find(d => d.category === docType.value);
                    const isMandatory = docType.mandatory !== false;
                    return (
                      <div key={docType.value} className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl bg-[#F9FAFB] hover:bg-white hover:border-[#042C53]/20 hover:shadow-sm transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-[#042C53] transition-colors">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-bold text-[#111827]">{docType.label}</p>
                            {isMandatory && <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Mandatory</span>}
                          </div>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                            {doc ? `Uploaded on ${new Date(doc.uploadedAt).toLocaleDateString()}` : 'No file uploaded yet'}
                          </p>
                        </div>
                        {doc ? (
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${doc.status === 'approved' ? 'bg-[#EAF3DE] text-[#27500A]' :
                              doc.status === 'rejected' ? 'bg-[#FCEBEB] text-[#791F1F]' :
                                'bg-[#FAEEDA] text-[#633806]'
                              }`}>
                              {doc.status}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[10px] font-bold text-[#042C53] px-2"
                              onClick={() => viewStudentDocument(selectedStudent.id || selectedStudent._id, doc.id || doc._id)}
                            >
                              View
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isMandatory ? 'bg-[#FCEBEB] text-[#791F1F]' : 'bg-gray-100 text-gray-400'}`}>
                              {isMandatory ? 'Missing' : 'Optional'}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-[10px] font-bold border-[#042C53] text-[#042C53] hover:bg-[#042C53] hover:text-white"
                              onClick={() => handleUploadClick(docType.value)}
                              disabled={isUploading}
                            >
                              <Upload size={12} className="mr-1" /> Upload
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-6 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Button
                    variant="outline"
                    className="h-11 text-xs font-bold border-gray-200 hover:bg-[#F3F4F6]"
                    onClick={() => toast.success('Follow-up drafted in WhatsApp')}
                  >
                    <MessageSquare size={14} className="mr-2" /> Draft Follow-up
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 text-xs font-bold border-gray-200 hover:bg-[#F3F4F6]"
                    onClick={() => toast.info('Support ticket created')}
                  >
                    <AlertCircle size={14} className="mr-2" /> Raise Ticket
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="h-11 text-xs font-bold bg-[#EAF3DE] text-[#27500A] border border-[#C0DD97] hover:bg-[#DCEFC0]"
                    onClick={() => handleStatusChange(selectedStudent.id || selectedStudent._id, 'Confirmed')}
                  >
                    Mark Confirmed
                  </Button>
                  <Button
                    className="h-11 text-xs font-bold bg-[#042C53] text-white hover:bg-[#0C447C]"
                    onClick={() => handleStatusChange(selectedStudent.id || selectedStudent._id, 'Converted')}
                  >
                    Mark Converted <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default AgentStudentsPage;
