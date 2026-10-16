import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileCheck,
  Building2,
  User,
  GraduationCap,
  Calendar,
  DollarSign,
  Globe,
  ExternalLink,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  FileText,
  Copy,
  Check,
  Shield,
  ArrowRight,
  MapPin,
  Award,
  AlertTriangle,
  FileCheck2,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { applicationAPI, admissionTrackingAPI, formatApiError } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../../components/ui/alert-dialog';
import ApplicationModal from '../../components/modals/ApplicationModal';
import VisaPipelinePanel from '../../components/application/VisaPipelinePanel';
import InvoiceModal from '../../components/modals/InvoiceModal';
import {
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS
} from '../../constants/status';
import { getStatusBadgeStyle } from './ApplicationsPage';
import { toast } from 'sonner';

// Backend authoritative workflow transitions map
const ALLOWED_TRANSITIONS = {
  Draft: ['Submitted', 'Withdrawn'],
  Submitted: ['UnderReview', 'Withdrawn'],
  UnderReview: ['Rejected', 'Withdrawn'],
  Rejected: [],
  Withdrawn: []
};

// Review actions (the visa pipeline below the review is handled by VisaPipelinePanel)
const REVIEW_STATUSES = ['Submitted', 'UnderReview', 'Rejected', 'Withdrawn'];
const ACTION_CONFIG = {
  Submitted: { label: 'Submit Application', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  UnderReview: { label: 'Start Review', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
  Rejected: { label: 'Reject Application', color: 'bg-red-600 hover:bg-red-700 text-white' },
  Withdrawn: { label: 'Withdraw Application', color: 'border border-gray-300 text-gray-700 hover:bg-gray-100 bg-white' }
};

const ApplicationDetailsPage = () => {
  const { id: paramId, applicationId } = useParams();
  const id = paramId || applicationId;
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { deleteApplication } = useData();

  const [application, setApplication] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [copiedAppNum, setCopiedAppNum] = useState(false);

  // Modals & Dialogs
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // Generic Workflow Action Dialog (for Draft->Submitted, Submitted->UnderReview, Reject, Withdraw)
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);
  const [workflowNotes, setWorkflowNotes] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fetch application, tracking, and history
  const fetchAllApplicationData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorStatus(null);

    try {
      // 1. Fetch main application
      const appRes = await applicationAPI.getById(id);
      setApplication(appRes.data);

      // 3. Fetch audit history
      try {
        const histRes = await admissionTrackingAPI.getHistory(id);
        setHistoryList(Array.isArray(histRes.data) ? histRes.data : (appRes.data?.history || []));
      } catch (histErr) {
        console.warn('History fetch fallback:', histErr);
        if (Array.isArray(appRes.data?.history)) {
          setHistoryList(appRes.data.history);
        }
      }
    } catch (err) {
      console.error('Error fetching application:', err);
      const status = err.response?.status;
      setErrorStatus(status || 500);
      if (status === 403) {
        toast.error('Access Denied: You do not have permission to view this application.');
      } else if (status === 404) {
        toast.error('Application not found');
      } else {
        toast.error('Failed to load application details', { description: formatApiError(err) });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAllApplicationData();
  }, [fetchAllApplicationData]);

  const handleCopyNumber = () => {
    if (!application?.applicationNumber) return;
    navigator.clipboard.writeText(application.applicationNumber);
    setCopiedAppNum(true);
    toast.success('Application number copied to clipboard');
    setTimeout(() => setCopiedAppNum(false), 2000);
  };

  /**
   * Opens the confirmation dialog for a review transition (submit, start review, reject, withdraw)
   */
  const handleActionClick = (target) => {
    setTargetStatus(target);
    setWorkflowNotes('');
    setWorkflowDialogOpen(true);
  };

  const confirmGenericWorkflowTransition = async () => {
    if (!targetStatus) return;
    setIsTransitioning(true);
    try {
      await admissionTrackingAPI.updateWorkflowStatus(id, {
        status: targetStatus,
        notes: workflowNotes.trim() || undefined
      });
      toast.success(`Application status transitioned to ${APPLICATION_STATUS_LABELS[targetStatus] || targetStatus}`);
      setWorkflowDialogOpen(false);
      setTargetStatus(null);
      setWorkflowNotes('');
      // Refresh all state from authoritative backend
      fetchAllApplicationData();
    } catch (err) {
      console.error('Workflow transition error:', err);
      toast.error('Failed to update application status', { description: formatApiError(err) });
    } finally {
      setIsTransitioning(false);
    }
  };

  const confirmDelete = async () => {
    if (!application) return;
    setIsDeleting(true);
    try {
      await deleteApplication(application.id || application._id);
      toast.success('Application deleted successfully');
      navigate(isAdmin() ? '/admin/applications' : '/agent/applications');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete application', { description: formatApiError(err) });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Next allowed transitions
  const allowedNextTransitions = useMemo(() => {
    if (!application?.status) return [];
    const transitions = (ALLOWED_TRANSITIONS[application.status] || []).filter(t => REVIEW_STATUSES.includes(t));
    if (!isAdmin()) {
      // Agents can only submit a draft application or withdraw
      return transitions.filter(t => t === 'Submitted' || t === 'Withdrawn');
    }
    return transitions;
  }, [application?.status, isAdmin]);

  // Back destination
  const backRoute = isAdmin() ? '/admin/applications' : '/agent/applications';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-3 border-[#042C53] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#6B7280] font-medium">Loading application and admission tracking details...</span>
      </div>
    );
  }

  // 403 Forbidden
  if (errorStatus === 403) {
    return (
      <div className="p-6 bg-[#F9FAFB] min-h-screen">
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-xl border border-red-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#111827] font-['Outfit']">Access Denied</h2>
          <p className="text-xs text-[#6B7280]">
            You do not have authorization to view or manage this application. It belongs to another registered agent.
          </p>
          <Button
            onClick={() => navigate(backRoute)}
            className="bg-[#042C53] hover:bg-[#0C447C] text-xs h-9"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Return to Applications
          </Button>
        </div>
      </div>
    );
  }

  // 404 Not Found
  if (!application) {
    return (
      <div className="p-6 bg-[#F9FAFB] min-h-screen">
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-xl border border-[#E5E7EB] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#111827] font-['Outfit']">Application Not Found</h2>
          <p className="text-xs text-[#6B7280]">
            The requested application identifier could not be found in the database.
          </p>
          <Button
            onClick={() => navigate(backRoute)}
            className="bg-[#042C53] hover:bg-[#0C447C] text-xs h-9"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Return to Applications
          </Button>
        </div>
      </div>
    );
  }

  const isTerminal = ['Rejected', 'Withdrawn'].includes(application.status);

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="application-details-page">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="sm"
            className="mt-1 h-9 border-[#E5E7EB] bg-white hover:bg-gray-50 text-xs"
            onClick={() => navigate(backRoute)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#111827] font-['Outfit'] tracking-tight">
                {application.applicationNumber || 'Application Details'}
              </h1>
              <button
                type="button"
                onClick={handleCopyNumber}
                title="Copy Application Number"
                className="text-[#9CA3AF] hover:text-[#4B5563] transition-colors p-1"
              >
                {copiedAppNum ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center flex-wrap gap-2.5 mt-2">
              {/* Status Badge */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeStyle(application.status)}`}>
                {APPLICATION_STATUS_LABELS[application.status] || application.status}
              </span>
              <span className="text-xs font-medium text-[#6B7280]">
                · ID: {application.id?.slice(-8).toUpperCase()} · Created {new Date(application.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit (allowed for draft or admin) */}
          {(isAdmin() || application.status === 'Draft') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
              className="h-9 px-3 border-[#E5E7EB] bg-white hover:bg-gray-50 text-xs font-semibold text-[#111827]"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
          )}

          {/* Delete (only Draft or admin) */}
          {(isAdmin() || application.status === 'Draft') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="h-9 px-3 border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* One track for the whole journey: QStudy's application review, then the visa pipeline */}
      <VisaPipelinePanel application={application} onChange={fetchAllApplicationData}>
        <div className="space-y-3" data-testid="application-review-row">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Application review
              </span>
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeStyle(application.status)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                  {APPLICATION_STATUS_LABELS[application.status] || application.status}
                </span>
                {isTerminal && (
                  <span className="text-xs text-[#6B7280]">(No further changes)</span>
                )}
              </div>
            </div>

            {!isTerminal && allowedNextTransitions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {allowedNextTransitions.map((nextSt) => {
                  const cfg = ACTION_CONFIG[nextSt] || { label: nextSt, color: 'bg-[#042C53] hover:bg-[#0C447C] text-white' };
                  return (
                    <Button
                      key={nextSt}
                      size="sm"
                      onClick={() => handleActionClick(nextSt)}
                      className={`text-xs h-9 px-3.5 font-semibold rounded-lg shadow-sm ${cfg.color}`}
                    >
                      {nextSt === 'Rejected' || nextSt === 'Withdrawn' ? (
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {cfg.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          {(application.status === 'Rejected' || application.status === 'Withdrawn') && (
            <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                <strong>Application Concluded:</strong> This application is <strong>{application.status}</strong>.
                {application.remarks && ` Recorded Reason: "${application.remarks}"`}
              </span>
            </div>
          )}
        </div>
      </VisaPipelinePanel>

      {/* Main Details Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Milestones + Overview + History (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Program Overview */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <FileCheck className="w-4 h-4 text-[#042C53]" /> Program & Study Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Course Name</span>
                  <span className="text-sm font-semibold text-[#111827] mt-0.5 block">{application.courseName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Degree Level</span>
                  <Badge variant="outline" className="mt-1 text-xs text-[#4B5563] bg-gray-50 border-[#E5E7EB]">
                    {application.courseLevel || 'Undergraduate'}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Intake Term</span>
                  <span className="text-xs font-semibold text-[#111827] mt-0.5 block">{application.intakeTerm || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Tuition Fee</span>
                  <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                    {application.tuitionFee ? `${Number(application.tuitionFee).toLocaleString()} ${application.currency || 'USD'}` : 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Invoice Eligibility</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {application.isInvoiced ? (
                      <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold">
                        Invoiced #{application.invoice?.invoiceNumber || application.invoiceId}
                      </Badge>
                    ) : application.isInvoiceEligible ? (
                      <Badge className="bg-[#E6F1FB] text-[#0C447C] border-[#B5D4F4] text-[10px] font-bold">
                        Commission Eligible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[#6B7280] text-[10px] border-[#E5E7EB]">
                        Pending Fees
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {application.remarks && (
                <div className="pt-3 border-t border-[#F3F4F6]">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Remarks / Notes</span>
                  <p className="text-xs text-[#4B5563] whitespace-pre-wrap bg-[#F9FAFB] p-3 rounded-lg border border-[#F3F4F6] leading-relaxed">
                    {application.remarks}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit History Timeline */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <Clock className="w-4 h-4 text-[#042C53]" /> Lifecycle History & Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {historyList.length === 0 ? (
                <div className="text-center py-6 text-[#9CA3AF] text-xs">
                  No history events recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB]">
                  {historyList.map((entry, idx) => (
                    <div key={idx} className="relative flex items-start gap-3">
                      <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#042C53] border-2 border-white ring-2 ring-blue-100" />
                      <div className="bg-[#F9FAFB] p-3.5 rounded-xl border border-[#F3F4F6] w-full space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#111827]">
                            {entry.action === 'VISIT_SCHEDULED' && 'Campus Visit Scheduled'}
                            {entry.action === 'VISIT_COMPLETED' && 'Campus Visit Completed'}
                            {entry.action === 'OFFER_RECEIVED' && 'University Offer Issued'}
                            {entry.action === 'CONDITIONAL_OFFER_RECEIVED' && 'Conditional Offer Issued'}
                            {entry.action === 'ADMISSION_CONFIRMED' && 'Admission Confirmed'}
                            {entry.action === 'ENROLLED' && 'Enrollment Completed'}
                            {entry.action === 'DEPOSIT_UPDATED' && 'Deposit Information Updated'}
                            {entry.action === 'STATUS_CHANGED' && 'Status Transition'}
                            {entry.action === 'CREATED' && 'Application Created'}
                            {!['VISIT_SCHEDULED', 'VISIT_COMPLETED', 'OFFER_RECEIVED', 'CONDITIONAL_OFFER_RECEIVED', 'ADMISSION_CONFIRMED', 'ENROLLED', 'DEPOSIT_UPDATED', 'STATUS_CHANGED', 'CREATED'].includes(entry.action) && (entry.action || 'ACTIVITY')}
                          </span>
                          <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">
                            {entry.changedAt ? new Date(entry.changedAt).toLocaleString() : ''}
                          </span>
                        </div>
                        {entry.from && entry.to && (
                          <div className="text-[11px] font-medium text-[#4B5563] flex items-center gap-1.5">
                            <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px]">{entry.from}</span>
                            <ArrowRight className="w-3 h-3 text-[#9CA3AF]" />
                            <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{entry.to}</span>
                          </div>
                        )}
                        {entry.notes && (
                          <p className="text-[11px] text-[#4B5563] bg-white p-2.5 rounded-lg border border-[#E5E7EB] mt-1 leading-relaxed">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Relationships (Student, University, Agent) */}
        <div className="space-y-6">
          {/* Linked Student Card */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <User className="w-4 h-4 text-[#042C53]" /> Applicant Profile
              </CardTitle>
              {application.student && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(isAdmin() ? `/admin/students/${application.studentId || application.student.id}` : `/agent/students/${application.studentId || application.student.id}`)}
                  className="text-[11px] h-7 px-2 text-[#042C53] font-semibold hover:bg-blue-50"
                >
                  View Profile <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div>
                <span className="text-sm font-bold text-[#111827] block">{application.student?.name || 'Applicant'}</span>
                <span className="text-xs text-[#6B7280] block mt-0.5">{application.student?.email}</span>
                {application.student?.phone && <span className="text-xs text-[#6B7280] block">{application.student.phone}</span>}
              </div>
              <Separator className="bg-[#F3F4F6]" />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Country</span>
                  <span className="font-semibold text-[#111827] mt-0.5 block">{application.student?.country || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Education</span>
                  <span className="font-semibold text-[#111827] mt-0.5 block">{application.student?.education || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked University Card */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <Building2 className="w-4 h-4 text-[#042C53]" /> Partner University
              </CardTitle>
              {application.university && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(isAdmin() ? `/admin/universities/${application.universityId || application.university.id}` : `/agent/universities/${application.universityId || application.university.id}`)}
                  className="text-[11px] h-7 px-2 text-[#042C53] font-semibold hover:bg-blue-50"
                >
                  View University <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div>
                <span className="text-sm font-bold text-[#111827] block">{application.university?.name || 'Target University'}</span>
                {application.university?.code && (
                  <span className="text-xs font-mono text-[#6B7280] block mt-0.5">{application.university.code}</span>
                )}
              </div>
              <Separator className="bg-[#F3F4F6]" />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Country</span>
                  <span className="font-semibold text-[#111827] mt-0.5 block">{application.university?.country || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">City</span>
                  <span className="font-semibold text-[#111827] mt-0.5 block">{application.university?.city || 'N/A'}</span>
                </div>
              </div>
              {application.university?.website && (
                <div className="pt-2">
                  <a
                    href={application.university.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#042C53] hover:underline flex items-center gap-1 font-medium"
                  >
                    <Globe className="w-3.5 h-3.5" /> {application.university.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Agent Card */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <Shield className="w-4 h-4 text-[#042C53]" /> Assigned Agent & Agency
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 text-xs">
              <div>
                <span className="text-sm font-bold text-[#111827] block">{application.agent?.agencyName || application.agent?.name || 'Assigned Agency'}</span>
                <span className="text-[#6B7280] block mt-0.5">{application.agent?.name}</span>
                <span className="text-[#6B7280] block">{application.agent?.email}</span>
                {application.agent?.phone && <span className="text-[#6B7280] block">{application.agent.phone}</span>}
              </div>
            </CardContent>
          </Card>

          {/* Commission & Payoff Status Card (Phase 6 & 7) */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <CreditCard className="w-4 h-4 text-[#042C53]" /> Commission & Payoff
              </CardTitle>
              {application.isInvoiced ? (
                application.invoice?.status === 'Paid' ? (
                  <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Settled / Paid
                  </Badge>
                ) : application.invoice?.financeReviewStatus === 'Approved' ? (
                  <Badge className="bg-[#E6F1FB] text-[#042C53] border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Ready for Payoff
                  </Badge>
                ) : (
                  <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 mr-1" /> In Review
                  </Badge>
                )
              ) : application.isInvoiceEligible ? (
                <Badge className="bg-[#E6F1FB] text-[#042C53] border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Eligible
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-[#6B7280] border-[#E5E7EB] uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Pending Fees
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-3 text-xs">
              {application.isInvoiced ? (
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl border space-y-1 ${
                    application.invoice?.status === 'Paid'
                      ? 'bg-[#EAF3DE]/40 border-[#C0DD97]'
                      : 'bg-[#E6F1FB]/40 border-blue-200'
                  }`}>
                    <span className={`font-bold block ${
                      application.invoice?.status === 'Paid' ? 'text-[#27500A]' : 'text-[#042C53]'
                    }`}>
                      {application.invoice?.status === 'Paid' ? 'Commission Payoff Settled' : 'Payoff Claim Active'}
                    </span>
                    <p className={`text-[11px] ${
                      application.invoice?.status === 'Paid' ? 'text-[#3B6D11]' : 'text-[#0C447C]'
                    }`}>
                      {application.invoice?.status === 'Paid'
                        ? 'Commission payoff has been settled and disbursed to the agent.'
                        : 'Commission invoice raised and tracked in the payoff settlement queue.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(isAdmin() ? '/admin/payoffs' : '/agent/payoffs')}
                      className="w-full text-xs font-semibold h-8 border-[#E5E7EB] text-[#042C53] hover:bg-blue-50"
                    >
                      View Payoffs Directory <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : application.isInvoiceEligible ? (
                <div className="space-y-3">
                  <div className="p-3 bg-[#E6F1FB]/60 border border-blue-200 rounded-xl space-y-1">
                    <span className="font-bold text-[#042C53] block">Ready for Invoicing</span>
                    <p className="text-[11px] text-[#0C447C]">
                      The student reached Visa 100% and the fees are confirmed. You can now raise the commission invoice for payoff review.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setInvoiceModalOpen(true)}
                    className="w-full text-xs font-semibold h-9 bg-[#042C53] hover:bg-[#03213F] text-white shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Raise Commission Invoice
                  </Button>
                </div>
              ) : (
                <p className="text-[#6B7280] text-[11px] leading-relaxed">
                  The commission invoice is unlocked once the student reaches <strong>Visa 100%</strong> and the <strong>fees are confirmed</strong> by QStudy.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <ApplicationModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        application={application}
        onSuccess={fetchAllApplicationData}
      />

      {/* Invoice Modal (Phase 6) */}
      <InvoiceModal
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        preselectedApplication={application}
        onSuccess={fetchAllApplicationData}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-[#111827] font-['Outfit']">
              Delete Application
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B7280]">
              Are you sure you want to delete application{' '}
              <span className="font-semibold text-[#111827]">
                "{application.applicationNumber || application.id}"
              </span>
              ? All milestone tracking and history will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-xs h-9">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-9 font-semibold"
            >
              {isDeleting ? 'Deleting...' : 'Delete Application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generic Workflow Transition Dialog (Draft->Submitted, Submitted->UnderReview, Rejected, Withdrawn) */}
      <Dialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#111827] font-['Outfit']">
              Advance Application Lifecycle
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B7280]">
              Transition application from <strong>{APPLICATION_STATUS_LABELS[application.status] || application.status}</strong> to{' '}
              <strong className="text-[#042C53]">{APPLICATION_STATUS_LABELS[targetStatus] || targetStatus}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {(targetStatus === 'Rejected' || targetStatus === 'Withdrawn') && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Warning:</strong> Moving to <strong>{targetStatus}</strong> is a terminal state. Please document the reason below.
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="wf-notes" className="text-xs font-semibold text-[#111827]">
                Transition Notes / Reason {(targetStatus === 'Rejected' || targetStatus === 'Withdrawn') && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="wf-notes"
                rows={3}
                placeholder="Add context, remarks, or justification for this status change..."
                value={workflowNotes}
                onChange={(e) => setWorkflowNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWorkflowDialogOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmGenericWorkflowTransition}
              disabled={isTransitioning || ((targetStatus === 'Rejected' || targetStatus === 'Withdrawn') && !workflowNotes.trim())}
              className={`text-xs h-9 font-semibold ${
                targetStatus === 'Rejected' || targetStatus === 'Withdrawn'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#042C53] hover:bg-[#0C447C] text-white'
              }`}
            >
              {isTransitioning ? 'Updating...' : `Confirm ${targetStatus}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationDetailsPage;
