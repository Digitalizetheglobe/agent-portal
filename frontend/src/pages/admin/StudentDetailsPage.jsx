import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Mail, User, BookOpen,
  Globe, Clock, Upload, FileText, Download, Check, X,
  Shield, AlertCircle, Edit, Eye, CheckCircle2, XCircle,
  History, Briefcase, RefreshCw, ChevronRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { studentAPI, studentVerificationAPI, formatApiError } from '../../utils/api';
import { getStudentStageInfo } from '../../utils/studentProgress';
import {
  STUDENT_VERIFICATION_STATUS,
  STUDENT_VERIFICATION_STATUS_LABELS
} from '../../constants/status';
import StudentRejectionModal from '../../components/modals/StudentRejectionModal';
import DocumentReviewDialog from '../../components/modals/DocumentReviewDialog';

const StudentDetailsPage = () => {
  const { studentId: id } = useParams();
  const navigate = useNavigate();
  const { students, agents, universities, getStudentById, uploadStudentDocument, verifyStudentDocument, requestStudentDocument } = useData();
  const { isAdmin, isAgent } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  // Dialog for document reviews that need remarks (declared up here: hooks must precede the early returns)
  const [reviewDialog, setReviewDialog] = useState({ open: false, docId: null, status: null, label: '' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Other');
  const fileInputRef = useRef(null);

  // Phase 3 State: Applications & Student Verification
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [verificationDetail, setVerificationDetail] = useState(null);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchStudentData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      setErrorStatus(null);

      const foundStudent = await getStudentById(id);
      if (foundStudent) {
        setStudent(foundStudent);
      } else {
        setErrorStatus(404);
        setError('Student not found');
        return;
      }
    } catch (err) {
      console.error('Error fetching student:', err);
      const status = err.response?.status;
      setErrorStatus(status || 500);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch student details');
      return;
    } finally {
      setLoading(false);
    }

    // Fetch Associated Applications
    try {
      setLoadingApps(true);
      const appRes = await studentAPI.getApplications(id);
      const appList = Array.isArray(appRes.data)
        ? appRes.data
        : (appRes.data?.applications || []);
      setApplications(appList);
    } catch (appErr) {
      console.error('Error fetching applications for student:', appErr);
    } finally {
      setLoadingApps(false);
    }

    // Fetch Verification Detail
    try {
      const verRes = await studentVerificationAPI.getByStudentId(id);
      setVerificationDetail(verRes.data);
    } catch (verErr) {
      console.error('Error fetching verification detail:', verErr);
    }

    // Fetch Verification History
    try {
      setLoadingHistory(true);
      const histRes = await studentVerificationAPI.getHistory(id);
      setVerificationHistory(histRes.data?.history || []);
    } catch (histErr) {
      console.error('Error fetching verification history:', histErr);
    } finally {
      setLoadingHistory(false);
    }
  }, [id, getStudentById]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const agent = useMemo(() => {
    const agentRef = student?.agentId;
    if (!agentRef) return null;
    const agentRefId = agentRef.id || agentRef._id || agentRef;
    return agents.find(a => a.id === agentRefId || a._id === agentRefId) || (typeof agentRef === 'object' ? agentRef : null);
  }, [agents, student?.agentId]);

  const requiredDocs = useMemo(() => {
    const DEFAULT_DOC_CATEGORIES = [
      { label: 'Passport', value: 'Passport', mandatory: false },
      { label: 'Academic Transcripts', value: 'Transcript', mandatory: false },
      { label: 'Language Test', value: 'LanguageTest', mandatory: false }
    ];
    return DEFAULT_DOC_CATEGORIES;
  }, []);

  // Checklist of required documents against what the agent has actually uploaded
  const documentChecklist = useMemo(() => {
    const docs = student?.documents || [];
    const requests = student?.documentRequests || [];
    return requiredDocs.map(req => {
      const doc = docs.find(d => (d.category || '').toLowerCase() === (req.value || '').toLowerCase());
      const request = requests.find(r => (r.category || '').toLowerCase() === (req.value || '').toLowerCase());
      return { ...req, mandatory: req.mandatory !== false, doc, request };
    });
  }, [requiredDocs, student?.documents, student?.documentRequests]);

  const missingDocsCount = useMemo(
    () => documentChecklist.filter(item => !item.doc).length,
    [documentChecklist]
  );

  const missingMandatoryDocs = useMemo(
    () => documentChecklist.filter(item => item.mandatory && !item.doc),
    [documentChecklist]
  );

  // When enforced, verification starts once the student reached Registration; the backend reports whether the student is ready
  const verificationReadiness = verificationDetail?.readiness;
  const notReadyForVerification = Boolean(verificationReadiness?.enforced) && !verificationReadiness.ready;

  // Current verification status: prefer verificationDetail if loaded, else student.verificationStatus
  const currentVerificationStatus = verificationDetail?.verificationStatus || student?.verificationStatus || STUDENT_VERIFICATION_STATUS.PENDING;

  // Verification actions (Admin only)
  const handleInitiateVerification = async () => {
    try {
      setActionLoading(true);
      const res = await studentVerificationAPI.initiate(student.id);
      setVerificationDetail(res.data);
      setStudent(prev => ({ ...prev, ...res.data }));
      toast.success('Verification initiated — student is now Under Review');
      // Refresh history
      const histRes = await studentVerificationAPI.getHistory(student.id);
      setVerificationHistory(histRes.data?.history || []);
    } catch (err) {
      toast.error('Failed to initiate verification', { description: formatApiError(err) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestDocument = async (item) => {
    const requests = await requestStudentDocument(student.id, item.value, item.label);
    if (requests) setStudent(prev => ({ ...prev, documentRequests: requests }));
  };

  const handleVerifyStudent = async () => {
    try {
      setActionLoading(true);
      const res = await studentVerificationAPI.verify(student.id);
      setVerificationDetail(res.data);
      setStudent(prev => ({ ...prev, ...res.data }));
      toast.success('Student verified successfully');
      // Refresh history
      const histRes = await studentVerificationAPI.getHistory(student.id);
      setVerificationHistory(histRes.data?.history || []);
    } catch (err) {
      toast.error('Failed to verify student', { description: formatApiError(err) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectStudent = async (reason) => {
    try {
      setActionLoading(true);
      const res = await studentVerificationAPI.reject(student.id, reason);
      setVerificationDetail(res.data);
      setStudent(prev => ({ ...prev, ...res.data }));
      toast.success('Student verification rejected');
      // Refresh history
      const histRes = await studentVerificationAPI.getHistory(student.id);
      setVerificationHistory(histRes.data?.history || []);
    } catch (err) {
      toast.error('Failed to reject student', { description: formatApiError(err) });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const getUniversityName = useCallback((s) => {
    if (!s) return 'Not specified';
    const cf = s.customFields || {};
    const uId = s.universityId || cf.universityId || (cf instanceof Map ? cf.get('universityId') : null);
    if (uId && universities) {
      const u = universities.find(uni => String(uni.id) === String(uId) || String(uni._id) === String(uId));
      if (u) return u.name;
    }
    const uName = s.university || cf.university || cf.universityName || (cf instanceof Map ? (cf.get('university') || cf.get('universityName')) : null);
    if (uName && uName !== 'Not specified') return uName;
    if (s.applications && s.applications.length > 0) {
      const app = s.applications[0];
      return app.university?.name || app.universityName || 'Not specified';
    }
    return 'Not specified';
  }, [universities]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(isAdmin() ? '/admin/students' : '/agent/students')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Students
          </Button>
        </div>
        <Card className="border-[#E5E7EB] bg-white">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#042C53] mx-auto"></div>
            <p className="text-muted-foreground mt-4 text-sm font-medium">Loading student profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-8 space-y-6 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(isAdmin() ? '/admin/students' : '/agent/students')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Students
          </Button>
        </div>
        <Card className="border-[#E5E7EB] bg-white">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-[#111827] font-bold text-base">{error || 'Student not found'}</p>
            <p className="text-muted-foreground text-xs mt-1">The requested student could not be located or you do not have permission to view it.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStudentFieldValue = (fieldKey, fallbackKey = null) => {
    if (fallbackKey && student[fallbackKey]) {
      return student[fallbackKey];
    }
    if (student[fieldKey]) {
      return student[fieldKey];
    }

    if (student.customFields && student.customFields[fieldKey]) {
      return student.customFields[fieldKey];
    }

    return 'Not specified';
  };

  const getFormattedCustomFields = () => {
    if (!student.customFields) return [];
    const fields = [];
    const standardFieldKeys = ['name', 'email', 'phone', 'country', 'education', 'courseInterested', 'notes'];
    const standardLabels = ['Full Name', 'Email Address', 'Phone Number', 'Country of Interest', 'Target Course', 'Education Level', 'Highest Qualification', 'Internal Notes'];

    Object.entries(student.customFields).forEach(([key, value]) => {
      if (!value) return;
      const cleanKey = key.replace(/^field_/, '');
      const label = key.replace(/^field_/, '').replace(/_/g, ' ');

      const isStandardKey = standardFieldKeys.includes(key);
      const isStandardLabel = standardLabels.some(l =>
        label.toLowerCase().includes(l.toLowerCase()) ||
        l.toLowerCase().includes(label.toLowerCase())
      );

      if (!isStandardKey && !isStandardLabel) {
        fields.push({ key: label, value });
      }
    });

    return fields;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF, Word, image, or text files.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      await uploadStudentDocument(student.id, file, selectedCategory);
      const updatedStudent = await getStudentById(student.id);
      setStudent(updatedStudent);
      toast.success('Document uploaded successfully');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Failed to upload document', { description: formatApiError(error) });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadDocument = async (docId, filename) => {
    try {
      const response = await studentAPI.downloadDocument(student.id, docId);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      toast.error('Failed to download document', { description: formatApiError(error) });
    }
  };

  const handleViewDocument = async (docId) => {
    try {
      const response = await studentAPI.downloadDocument(student.id, docId, { inline: 'true' });
      const contentType = response.headers['content-type'];
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Failed to view document', { description: formatApiError(error) });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Review actions that need remarks (More Information Required / Rejected) open a dialog first

  const submitDocumentReview = async (docId, status, remarks = '') => {
    try {
      const updatedStudent = await verifyStudentDocument(student.id, docId, { status, remarks });
      setStudent(updatedStudent);
      toast.success(`Document marked as ${status === 'CorrectionRequired' ? 'More Information Required' : status}`);
    } catch (error) {
      console.error('Error verifying document:', error);
    }
  };

  const handleVerifyDocumentAction = (docId, status) => {
    if (status === 'CorrectionRequired' || status === 'Rejected') {
      const doc = (student?.documents || []).find(d => (d.id || d._id) === docId);
      setReviewDialog({ open: true, docId, status, label: doc?.category || 'Document' });
      return;
    }
    submitDocumentReview(docId, status);
  };

  const getDocStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
        return <Badge className="bg-[#EAF3DE] text-[#27500A] border border-[#C0DD97] font-bold gap-1 hover:bg-[#EAF3DE]"><Check className="w-3 h-3" /> Approved</Badge>;
      case 'underreview':
      case 'under_review':
        return <Badge className="bg-[#E6F1FB] text-[#0C447C] border border-[#B5D4F4] font-bold gap-1 hover:bg-[#E6F1FB]"><Clock className="w-3 h-3" /> Under Review</Badge>;
      case 'correctionrequired':
      case 'correction_required':
        return <Badge className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-bold gap-1 hover:bg-[#FFFBEB]"><AlertCircle className="w-3 h-3" /> More Information Required</Badge>;
      case 'rejected':
        return <Badge className="bg-[#FCEBEB] text-[#791F1F] border border-[#F7C1C1] font-bold gap-1 hover:bg-[#FCEBEB]"><X className="w-3 h-3" /> Rejected</Badge>;
      case 'submitted':
      case 'pending':
      default:
        return <Badge variant="outline" className="text-[#374151] border-[#D1D5DB] bg-[#F3F4F6] font-bold gap-1"><Clock className="w-3 h-3" /> Submitted</Badge>;
    }
  };

  const getVerificationBadge = (status) => {
    switch (status) {
      case STUDENT_VERIFICATION_STATUS.VERIFIED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Verified
          </span>
        );
      case STUDENT_VERIFICATION_STATUS.UNDER_REVIEW:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Under Review
          </span>
        );
      case STUDENT_VERIFICATION_STATUS.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 shadow-sm">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Rejected
          </span>
        );
      case STUDENT_VERIFICATION_STATUS.PENDING:
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  const verifierInfo = verificationDetail?.verifiedBy || student?.verifiedBy;
  const verifierDisplay = typeof verifierInfo === 'object' && verifierInfo !== null
    ? (verifierInfo.name || verifierInfo.email)
    : verifierInfo;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-3 border-[#042C53] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#6B7280] font-medium">Loading candidate dossier...</span>
      </div>
    );
  }

  if (errorStatus === 403) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center bg-white rounded-xl border border-red-200 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 font-['Outfit']">Access Denied (403 Forbidden)</h2>
        <p className="text-xs text-gray-600">
          You do not have authorization to view this student profile. Under QStudy agency isolation policies, candidate dossiers are strictly private to their managing agency.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-300"
          onClick={() => navigate(isAdmin() ? '/admin/students' : '/agent/students')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Students
        </Button>
      </div>
    );
  }

  if (errorStatus === 404 || !student) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900 font-['Outfit']">Student Not Found (404)</h2>
        <p className="text-xs text-gray-500">The requested student record does not exist or has been removed.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(isAdmin() ? '/admin/students' : '/agent/students')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Students
        </Button>
      </div>
    );
  }

  // The facts anyone opening a student needs first
  const known = (v) => (v && v !== 'Not specified' ? v : null);
  const keyFacts = [
    ['Target university', known(getUniversityName(student))],
    ['Target course', known(getStudentFieldValue('courseInterested', 'courseInterested'))],
    ['Country of interest', known(getStudentFieldValue('country', 'country'))],
    ['Referring agent', agent ? (
      isAdmin() ? (
        <button onClick={() => navigate(`/admin/agents/${agent.id || agent._id}`)} className="text-[#042C53] hover:underline text-left">
          {agent.agencyName || agent.name}{agent.agencyName && agent.name ? ` · ${agent.name}` : ''}
        </button>
      ) : (agent.agencyName || agent.name)
    ) : 'Direct registration'],
    ['Student email', known(getStudentFieldValue('email', 'email'))],
    ['Student phone number', known(getStudentFieldValue('phone', 'phone'))],
    ['Education level', known(getStudentFieldValue('education', 'education'))],
    ['Registered on', formatDate(student.submittedAt || student.createdAt)],
  ];
  const extraFields = getFormattedCustomFields();
  const studentNotes = known(getStudentFieldValue('notes', 'notes'));

  return (
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-8" data-testid="student-details-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="sm"
            className="mt-1 h-9 border-[#E5E7EB] bg-white hover:bg-[#042C53]"
            onClick={() => navigate(isAdmin() ? '/admin/students' : '/agent/students')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
              {getStudentFieldValue('name', 'name')}
            </h1>
            <div className="flex items-center flex-wrap gap-2.5 mt-2">
              {/* Pipeline Stage Badge */}
              <Badge className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border-none",
                getStudentStageInfo(student).style
              )}>
                Stage: {getStudentStageInfo(student).label}
              </Badge>

              {/* Student Verification Badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#6B7280]">Verification:</span>
                {getVerificationBadge(currentVerificationStatus)}
              </div>

              <span className="text-xs font-medium text-[#6B7280]">
                · ID: {student.id?.slice(-8).toUpperCase()} · Joined {formatDate(student.submittedAt || student.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <Button
            variant="outline"
            className="h-10 px-4 border-[#E5E7EB] bg-white hover:bg-[#042C53] text-xs font-semibold"
            onClick={fetchStudentData}
            title="Refresh details"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          {isAdmin() && (
            <Button
              className="h-10 px-5 bg-[#042C53] hover:bg-[#0C447C] font-bold rounded-lg shadow-sm text-xs"
              onClick={() => navigate(`/admin/students/${student.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Student
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-8">

          {/* Student Summary: key details at a glance */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <User className="w-4 h-4 text-[#042C53]" />
                Student Summary
              </CardTitle>
            </CardHeader>
            <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {keyFacts.map(([label, val]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{label}</dt>
                  <dd className="text-sm font-semibold text-[#111827] break-words mt-1">
                    {val || <span className="text-[#9CA3AF] font-normal">Not provided</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Associated Applications Section */}
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <Briefcase className="w-4 h-4 text-[#042C53]" />
                Associated Applications
              </CardTitle>
              <Badge variant="outline" className="text-xs font-bold bg-[#F9FAFB]">
                {applications.length} {applications.length === 1 ? 'Application' : 'Applications'}
              </Badge>
            </CardHeader>
            <CardContent className="p-6">
              {loadingApps ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#042C53] mx-auto"></div>
                  <p className="text-xs text-[#6B7280] mt-2 font-medium">Loading applications...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-10 bg-[#F9FAFB] rounded-xl border border-dashed border-[#E5E7EB]">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 text-[#9CA3AF] opacity-40" />
                  <p className="text-xs font-semibold text-[#6B7280]">No applications linked to this student yet</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">Once an application is submitted for this student it will appear here with a link to open it.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider bg-[#F9FAFB]">
                        <th className="py-3 px-3">App Number</th>
                        <th className="py-3 px-3">University</th>
                        <th className="py-3 px-3">Course</th>
                        <th className="py-3 px-3">Level / Intake</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Created</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                      {applications.map((app) => (
                        <tr key={app.id || app._id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(isAdmin() ? `/admin/applications/${app.id || app._id}` : `/agent/applications/${app.id || app._id}`)}>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => navigate(isAdmin() ? `/admin/applications/${app.id || app._id}` : `/agent/applications/${app.id || app._id}`)}
                              className="font-bold text-[#042C53] hover:underline text-left text-xs"
                            >
                              {app.applicationNumber || app.id?.slice(-8).toUpperCase() || 'N/A'}
                            </button>
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#111827]">
                            {app.university?.name || app.universityName || 'University'}
                          </td>
                          <td className="py-3 px-3 text-[#4B5563]">
                            {app.courseName || app.course || 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-[#6B7280]">
                            {app.courseLevel || 'Undergraduate'} · {app.intake || 'N/A'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                              {app.status || 'Submitted'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#6B7280]">
                            {formatDate(app.createdAt)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              size="sm"
                              className="h-7 px-3 text-[11px] font-bold bg-[#042C53] hover:bg-[#0C447C] text-white"
                              onClick={(e) => { e.stopPropagation(); navigate(isAdmin() ? `/admin/applications/${app.id || app._id}` : `/agent/applications/${app.id || app._id}`) }}
                            >
                              View application
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Verification Card */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <Shield className="w-4 h-4 text-[#042C53]" />
                Student Verification Status
              </CardTitle>
              <div>{getVerificationBadge(currentVerificationStatus)}</div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6]">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Current Verification State</div>
                  <div className="text-sm font-semibold text-[#111827]">
                    {STUDENT_VERIFICATION_STATUS_LABELS[currentVerificationStatus] || currentVerificationStatus}
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    {currentVerificationStatus === STUDENT_VERIFICATION_STATUS.PENDING && 'Student registration submitted. Verification has not yet started.'}
                    {currentVerificationStatus === STUDENT_VERIFICATION_STATUS.UNDER_REVIEW && 'Student is actively being reviewed by an administrator.'}
                    {currentVerificationStatus === STUDENT_VERIFICATION_STATUS.VERIFIED && 'All submitted documents have been approved and the student profile is verified.'}
                    {currentVerificationStatus === STUDENT_VERIFICATION_STATUS.REJECTED && 'Student verification was rejected. Review the remarks below.'}
                  </p>
                </div>

                {/* Admin Verification Controls */}
                {isAdmin() && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Pending state -> Start Verification */}
                    {currentVerificationStatus === STUDENT_VERIFICATION_STATUS.PENDING && (
                      <Button
                        size="sm"
                        disabled={actionLoading || notReadyForVerification}
                        title={notReadyForVerification ? 'The student must reach Registration in the visa pipeline first' : undefined}
                        onClick={handleInitiateVerification}
                        className="bg-[#042C53] hover:bg-[#0C447C] text-white font-bold text-xs h-9 px-4 shadow-sm"
                      >
                        {actionLoading ? 'Processing...' : 'Start Verification'}
                      </Button>
                    )}

                    {/* UnderReview state -> Verify or Reject */}
                    {currentVerificationStatus === STUDENT_VERIFICATION_STATUS.UNDER_REVIEW && (
                      <>
                        <Button
                          size="sm"
                          disabled={actionLoading || missingMandatoryDocs.length > 0 || notReadyForVerification}
                          title={notReadyForVerification ? 'The student must reach Registration in the visa pipeline first' : missingMandatoryDocs.length > 0 ? 'Mandatory documents are missing' : undefined}
                          onClick={handleVerifyStudent}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          {actionLoading ? 'Processing...' : 'Verify Student'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          onClick={() => setRejectionModalOpen(true)}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-xs h-9 px-4"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Reject Student
                        </Button>
                      </>
                    )}

                    {/* Rejected state -> Start Verification (re-initiate) */}
                    {currentVerificationStatus === STUDENT_VERIFICATION_STATUS.REJECTED && (
                      <Button
                        size="sm"
                        disabled={actionLoading || notReadyForVerification}
                        title={notReadyForVerification ? 'The student must reach Registration in the visa pipeline first' : undefined}
                        onClick={handleInitiateVerification}
                        className="bg-[#042C53] hover:bg-[#0C447C] text-white font-bold text-xs h-9 px-4 shadow-sm"
                      >
                        {actionLoading ? 'Processing...' : 'Start Verification'}
                      </Button>
                    )}

                    {/* Verified state -> Terminal */}
                    {currentVerificationStatus === STUDENT_VERIFICATION_STATUS.VERIFIED && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                        Finalized
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Verification comes after the student progressed in the visa pipeline: show what is still outstanding */}
              {isAdmin() && verificationReadiness?.enforced && currentVerificationStatus !== STUDENT_VERIFICATION_STATUS.VERIFIED && (
                <div className={`p-4 rounded-xl border space-y-2 ${verificationReadiness.ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  <p className={`text-xs font-bold ${verificationReadiness.ready ? 'text-emerald-900' : 'text-amber-900'}`}>
                    {verificationReadiness.ready ? 'Ready for verification: the student reached Registration in the visa pipeline' : 'Not ready for verification yet'}
                  </p>
                  {!verificationReadiness.ready && (
                    <ul className="text-xs text-amber-800 leading-relaxed list-disc pl-4 space-y-0.5">
                      {verificationReadiness.blockers.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  )}
                  {verificationReadiness.ready && (
                    <ul className="text-xs text-emerald-800 space-y-0.5">
                      {verificationReadiness.enrolledApplications.filter(a => a.missing.length === 0).map(a => (
                        <li key={a.id}>{a.applicationNumber}: {a.courseName}, at {a.pipelineStage}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Missing mandatory documents block verification */}
              {isAdmin() && currentVerificationStatus === STUDENT_VERIFICATION_STATUS.UNDER_REVIEW && missingMandatoryDocs.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-amber-900">Cannot verify yet: mandatory documents are missing</p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      The agent has not uploaded {missingMandatoryDocs.map(d => d.label).join(', ')}.
                      Use <span className="font-semibold">Request</span> in the Required Documents list to ask for them.
                    </p>
                  </div>
                </div>
              )}

              {/* Verified Metadata */}
              {currentVerificationStatus === STUDENT_VERIFICATION_STATUS.VERIFIED && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-900">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Verified By</span>
                    <p className="font-semibold">{verifierDisplay || 'Administrator'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Verified On</span>
                    <p className="font-semibold">{formatDateTime(verificationDetail?.verifiedAt || student?.verifiedAt)}</p>
                  </div>
                </div>
              )}

              {/* Rejection Reason Notice */}
              {currentVerificationStatus === STUDENT_VERIFICATION_STATUS.REJECTED && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-800 uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Rejection Reason
                  </div>
                  <p className="text-xs text-red-700 leading-relaxed pl-6">
                    {verificationDetail?.verificationRejectionReason || student?.verificationRejectionReason || 'No specific reason provided.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional details: extra form fields and internal notes (least needed, so near the end) */}
          {(extraFields.length > 0 || studentNotes) && (
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardHeader className="border-b border-[#F3F4F6] px-6 py-4">
                <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                  <BookOpen className="w-4 h-4 text-[#042C53]" />
                  Additional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {extraFields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {extraFields.map((field, index) => (
                      <div key={index} className="space-y-1">
                        <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider capitalize">
                          {field.key}
                        </label>
                        <p className="text-sm font-medium text-[#111827]">{field.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {studentNotes && (
                  <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#F3F4F6]">
                    <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-2">Internal Notes</label>
                    <p className="text-sm text-[#4B5563] leading-relaxed">{studentNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Verification History Section */}
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader onClick={() => setShowHistory(v => !v)} className="cursor-pointer select-none px-6 py-4 flex flex-row items-center justify-between space-y-0" data-testid="audit-trail-toggle">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <History className="w-4 h-4 text-[#042C53]" />
                Verification Audit Trail
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-bold bg-[#F9FAFB]">
                  {verificationHistory.length} {verificationHistory.length === 1 ? 'Record' : 'Records'}
                </Badge>
                <span className="text-xs font-semibold text-[#0C447C]">{showHistory ? 'Hide' : 'Show'}</span>
              </div>
            </CardHeader>
            {showHistory && (
            <CardContent className="p-6 border-t border-[#F3F4F6]">
              {loadingHistory ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#042C53] mx-auto"></div>
                  <p className="text-xs text-[#6B7280] mt-2 font-medium">Loading history...</p>
                </div>
              ) : verificationHistory.length === 0 ? (
                <div className="text-center py-8 bg-[#F9FAFB] rounded-xl border border-dashed border-[#E5E7EB]">
                  <History className="w-8 h-8 mx-auto mb-2 text-[#9CA3AF] opacity-40" />
                  <p className="text-xs font-semibold text-[#6B7280]">No verification activity recorded yet</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">Verification status changes and reviews will be logged here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verificationHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 border border-[#F3F4F6] rounded-xl bg-white hover:border-[#042C53]/30 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                            item.action === 'VERIFICATION_APPROVED' ? "bg-emerald-100 text-emerald-800" :
                              item.action === 'VERIFICATION_REJECTED' ? "bg-red-100 text-red-800" :
                                "bg-blue-100 text-blue-800"
                          )}>
                            {item.action?.replace('VERIFICATION_', '') || 'STATUS_CHANGE'}
                          </span>
                          <span className="text-xs font-semibold text-[#111827]">
                            {item.from || 'Pending'} → <span className="text-[#042C53] font-bold">{item.to}</span>
                          </span>
                        </div>
                        {item.reason && (
                          <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-100">
                            <span className="font-bold text-[10px] uppercase block mb-0.5 text-red-800">Reason / Notes:</span>
                            {item.reason}
                          </div>
                        )}
                        <p className="text-[11px] text-[#6B7280]">
                          Changed by: <span className="font-medium text-[#111827]">{item.changedBy || 'Admin'}</span>
                        </p>
                      </div>
                      <div className="text-[11px] text-[#9CA3AF] font-medium shrink-0">
                        {formatDateTime(item.changedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            )}
          </Card>

        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-8">
          {/* Progress: follows the student's applications */}
          <Card className="border-[#E5E7EB] shadow-sm overflow-hidden">
            <CardHeader className="bg-[#F9FAFB] border-b border-[#F3F4F6] px-6 py-4">
              <CardTitle className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <span className={cn(
                "inline-flex text-sm font-bold px-4 py-2 rounded-xl",
                getStudentStageInfo(student).style
              )}>
                {getStudentStageInfo(student).label}
              </span>
              <p className="text-xs text-[#6B7280]">
                A student's progress follows their applications: the furthest visa stage of any live application.
                Move a student on from the application page.
              </p>
              <p className="text-[10px] text-[#9CA3AF] px-1">
                Last activity: {formatDateTime(student.updatedAt || student.submittedAt)}
              </p>
            </CardContent>
          </Card>

          {/* Documents Section (Preserved & Separate from Student Verification) */}
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold font-['Outfit'] text-[#111827]">
                Uploaded Documents
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold bg-[#F9FAFB]">
                {student.documents?.length || 0} Total
              </Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Required documents checklist: shows what the agent has not uploaded yet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Required Documents</p>
                  {missingMandatoryDocs.length > 0 ? (
                    <Badge className="text-[10px] font-bold bg-red-50 text-red-700 border-red-200">
                      {missingMandatoryDocs.length} mandatory missing
                    </Badge>
                  ) : missingDocsCount > 0 ? (
                    <Badge className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200">
                      {missingDocsCount} not uploaded
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                      All uploaded
                    </Badge>
                  )}
                </div>
                {documentChecklist.map(item => (
                  <div key={item.value} className="flex items-center justify-between gap-3 p-2.5 border border-[#F3F4F6] rounded-lg bg-white">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#111827] flex items-center gap-1.5">
                        {item.label}
                        {item.mandatory && <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase">Mandatory</span>}
                      </p>
                      {!item.doc && item.request && (
                        <p className="text-[10px] text-amber-700 mt-0.5">
                          Requested from agent on {new Date(item.request.requestedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {item.doc ? (
                      getDocStatusBadge(item.doc.status)
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${item.mandatory ? 'bg-[#FCEBEB] text-[#791F1F]' : 'bg-gray-100 text-gray-500'}`}>
                          Not uploaded
                        </span>
                        {isAdmin() && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[9px] font-bold border-[#042C53] text-[#042C53] hover:bg-[#042C53] hover:text-white"
                            onClick={() => handleRequestDocument(item)}
                          >
                            {item.request ? 'Request Again' : 'Request'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Documents List */}
              <div className="space-y-3">
                {student.documents && student.documents.length > 0 ? (
                  student.documents.map((doc) => (
                    <div
                      key={doc.id || doc._id}
                      className="group p-3 border border-[#F3F4F6] rounded-xl hover:border-[#042C53] hover:bg-[#F9FAFB] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                            <FileText className="w-4 h-4 text-[#6B7280]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#111827] uppercase">
                              {doc.category} · {formatFileSize(doc.size)}
                            </p>
                            <p className="text-[11px] text-[#6B7280] font-medium mt-0.5 truncate" title={doc.originalFilename}>
                              {doc.originalFilename}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#042C53] hover:text-white hover:border-[#042C53]"
                            onClick={() => handleViewDocument(doc.id || doc._id)}
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#042C53] hover:text-white hover:border-[#042C53]"
                            onClick={() => handleDownloadDocument(doc.id || doc._id, doc.originalFilename)}
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Document remarks / correction reason notice */}
                      {doc.remarks && (
                        <div className={cn(
                          "mt-2 text-xs p-2.5 rounded-lg border",
                          (doc.status || '').toLowerCase().includes('correction')
                            ? "bg-amber-50 text-amber-900 border-amber-200"
                            : (doc.status || '').toLowerCase() === 'rejected'
                              ? "bg-red-50 text-red-900 border-red-200"
                              : "bg-gray-50 text-gray-800 border-gray-200"
                        )}>
                          <span className="font-bold text-[10px] uppercase block mb-0.5">
                            {(doc.status || '').toLowerCase().includes('correction') ? 'Information Requested' : (doc.status || '').toLowerCase() === 'rejected' ? 'Rejection Reason' : 'Verifier Remarks'}:
                          </span>
                          {doc.remarks}
                        </div>
                      )}

                      {/* Reviewer & Upload metadata */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-[#9CA3AF]">
                        <span>Uploaded: {formatDate(doc.uploadedAt)}</span>
                        {doc.verifiedAt && (
                          <span>Reviewed: {formatDate(doc.verifiedAt)}</span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        {getDocStatusBadge(doc.status)}
                        {isAdmin() && (
                          <div className="flex items-center gap-1">
                            {(doc.status || '').toLowerCase() !== 'approved' && (
                              <Button
                                size="sm"
                                className="h-6 text-[9px] font-bold bg-[#EAF3DE] text-[#27500A] border border-[#C0DD97] hover:bg-[#DCEFC0]"
                                onClick={() => handleVerifyDocumentAction(doc.id || doc._id, 'Approved')}
                              >
                                Approve
                              </Button>
                            )}
                            {!(doc.status || '').toLowerCase().includes('correction') && (
                              <Button
                                size="sm"
                                className="h-6 text-[9px] font-bold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] hover:bg-[#FEF3C7]"
                                onClick={() => handleVerifyDocumentAction(doc.id || doc._id, 'CorrectionRequired')}
                              >
                                More Info
                              </Button>
                            )}
                            {(doc.status || '').toLowerCase() !== 'rejected' && (
                              <Button
                                size="sm"
                                className="h-6 text-[9px] font-bold bg-[#FCEBEB] text-[#791F1F] border border-[#F7C1C1] hover:bg-[#FADADA]"
                                onClick={() => handleVerifyDocumentAction(doc.id || doc._id, 'Rejected')}
                              >
                                Reject
                              </Button>
                            )}
                          </div>
                        )}
                        {!isAdmin() && (doc.status || '').toLowerCase().includes('correction') && (
                          <Button
                            size="sm"
                            className="h-6 text-[9px] font-bold bg-[#042C53] text-white hover:bg-[#0C447C]"
                            onClick={() => {
                              setSelectedCategory(doc.category || 'Other');
                              fileInputRef.current?.click();
                            }}
                          >
                            <Upload className="w-3 h-3 mr-1" /> Replace
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-[#F9FAFB] rounded-xl border border-dashed border-[#E5E7EB]">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-[#9CA3AF] opacity-40" />
                    <p className="text-xs font-semibold text-[#6B7280]">No documents yet</p>
                  </div>
                )}
              </div>

              {/* Upload Section */}
              <div className="pt-2">
                <div className="flex flex-col gap-3">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white focus:ring-1 focus:ring-[#042C53] outline-none"
                  >
                    {requiredDocs.map(doc => (
                      <option key={doc.value} value={doc.value}>{doc.label}</option>
                    ))}
                    <option value="Other">Other Category</option>
                  </select>

                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                  />

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-10 bg-white border border-[#042C53] text-[#042C53] hover:bg-[#F0F7FF] font-bold text-xs"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#042C53]" />
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 mr-2" />
                        Upload Document
                      </>
                    )}
                  </Button>
                </div>

                {uploading && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-bold text-[#6B7280] mb-1 uppercase tracking-wider">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5 bg-[#F3F4F6]" indicatorClassName="bg-[#042C53]" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <DocumentReviewDialog
        open={reviewDialog.open}
        onOpenChange={(o) => setReviewDialog(prev => ({ ...prev, open: o }))}
        mode={reviewDialog.status}
        documentLabel={reviewDialog.label}
        onConfirm={(remarks) => submitDocumentReview(reviewDialog.docId, reviewDialog.status, remarks)}
      />

      {/* Student Rejection Modal */}
      <StudentRejectionModal
        open={rejectionModalOpen}
        onOpenChange={setRejectionModalOpen}
        studentName={getStudentFieldValue('name', 'name')}
        onConfirm={handleRejectStudent}
        loading={actionLoading}
      />
    </div>
  );
};

export default StudentDetailsPage;
