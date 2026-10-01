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
import VisitModal from '../../components/modals/VisitModal';
import OfferModal from '../../components/modals/OfferModal';
import AdmissionModal from '../../components/modals/AdmissionModal';
import EnrollmentModal from '../../components/modals/EnrollmentModal';
import DepositModal from '../../components/modals/DepositModal';
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
  UnderReview: ['VisitScheduled', 'OfferReceived', 'ConditionalOffer', 'Rejected', 'Withdrawn'],
  VisitScheduled: ['VisitCompleted', 'Withdrawn'],
  VisitCompleted: ['OfferReceived', 'ConditionalOffer', 'Rejected', 'Withdrawn'],
  OfferReceived: ['AdmissionConfirmed', 'Withdrawn', 'Rejected'],
  ConditionalOffer: ['AdmissionConfirmed', 'Rejected', 'Withdrawn'],
  AdmissionConfirmed: ['Enrolled', 'Withdrawn'],
  Enrolled: [],
  Rejected: [],
  Withdrawn: []
};

// Action button configurations
const ACTION_CONFIG = {
  Submitted: { label: 'Submit Application', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  UnderReview: { label: 'Start Review', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
  VisitScheduled: { label: 'Schedule Visit', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  VisitCompleted: { label: 'Complete Visit', color: 'bg-indigo-700 hover:bg-indigo-800 text-white' },
  OfferReceived: { label: 'Issue Offer', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  ConditionalOffer: { label: 'Conditional Offer', color: 'bg-teal-600 hover:bg-teal-700 text-white' },
  AdmissionConfirmed: { label: 'Confirm Admission', color: 'bg-teal-700 hover:bg-teal-800 text-white' },
  Enrolled: { label: 'Complete Enrollment', color: 'bg-green-700 hover:bg-green-800 text-white' },
  Rejected: { label: 'Reject Application', color: 'bg-red-600 hover:bg-red-700 text-white' },
  Withdrawn: { label: 'Withdraw Application', color: 'border border-gray-300 text-gray-700 hover:bg-gray-100 bg-white' }
};

// 6 Core Admission Milestones
const ADMISSION_MILESTONES = [
  { id: 'application', label: 'Application', desc: 'Draft & Submission' },
  { id: 'review', label: 'Review', desc: 'Admissions Evaluation' },
  { id: 'visit', label: 'Campus Visit', desc: 'Tour & Interview' },
  { id: 'offer', label: 'Offer', desc: 'Conditional / Direct' },
  { id: 'admission', label: 'Admission', desc: 'Student Accepted' },
  { id: 'enrollment', label: 'Enrolled', desc: 'Official Matriculation' }
];

const ApplicationDetailsPage = () => {
  const { id: paramId, applicationId } = useParams();
  const id = paramId || applicationId;
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { deleteApplication } = useData();

  const [application, setApplication] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [copiedAppNum, setCopiedAppNum] = useState(false);

  // Modals & Dialogs
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Admission Tracking Specialized Modals (Phase 5)
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [visitModalMode, setVisitModalMode] = useState('schedule');
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerModalType, setOfferModalType] = useState('unconditional');
  const [admissionModalOpen, setAdmissionModalOpen] = useState(false);
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
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

      // 2. Fetch specialized admission tracking details
      try {
        const trackRes = await admissionTrackingAPI.getTracking(id);
        setTrackingData(trackRes.data?.tracking || null);
      } catch (trackErr) {
        console.warn('Tracking fetch fallback:', trackErr);
      }

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
   * Routes user to the appropriate specialized modal or generic workflow dialog
   */
  const handleActionClick = (target) => {
    if (target === 'VisitScheduled') {
      setVisitModalMode('schedule');
      setVisitModalOpen(true);
    } else if (target === 'VisitCompleted') {
      setVisitModalMode('complete');
      setVisitModalOpen(true);
    } else if (target === 'OfferReceived') {
      setOfferModalType('unconditional');
      setOfferModalOpen(true);
    } else if (target === 'ConditionalOffer') {
      setOfferModalType('conditional');
      setOfferModalOpen(true);
    } else if (target === 'AdmissionConfirmed') {
      setAdmissionModalOpen(true);
    } else if (target === 'Enrolled') {
      setEnrollmentModalOpen(true);
    } else {
      // Generic transition (Draft->Submitted, Submitted->UnderReview, Rejected, Withdrawn)
      setTargetStatus(target);
      setWorkflowNotes('');
      setWorkflowDialogOpen(true);
    }
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
    const transitions = ALLOWED_TRANSITIONS[application.status] || [];
    if (!isAdmin()) {
      // Agents can only submit a draft application or withdraw
      return transitions.filter(t => t === 'Submitted' || t === 'Withdrawn');
    }
    return transitions;
  }, [application?.status, isAdmin]);

  // Derived tracking data safely falling back to main application fields
  const tracking = useMemo(() => {
    return {
      visit: {
        visitDate: trackingData?.visit?.visitDate || application?.visitDate,
        visitLocation: trackingData?.visit?.visitLocation || application?.visitLocation,
        visitNotes: trackingData?.visit?.visitNotes || application?.visitNotes,
        visitCompleted: trackingData?.visit?.visitCompleted !== undefined ? trackingData.visit.visitCompleted : application?.visitCompleted
      },
      offer: {
        offerDate: trackingData?.offer?.offerDate || application?.offerDate,
        offerLetterUrl: trackingData?.offer?.offerLetterUrl || application?.offerLetterUrl,
        offerConditions: trackingData?.offer?.offerConditions || application?.offerConditions
      },
      admission: {
        admissionDate: trackingData?.admission?.admissionDate || application?.admissionDate,
        admissionLetterUrl: trackingData?.admission?.admissionLetterUrl || application?.admissionLetterUrl,
        universityStudentId: trackingData?.admission?.universityStudentId || application?.universityStudentId
      },
      enrollment: {
        enrollmentDate: trackingData?.enrollment?.enrollmentDate || application?.enrollmentDate,
        enrollmentProofUrl: trackingData?.enrollment?.enrollmentProofUrl || application?.enrollmentProofUrl
      },
      deposit: {
        depositPaid: trackingData?.deposit?.depositPaid !== undefined ? trackingData.deposit.depositPaid : application?.depositPaid,
        depositAmount: trackingData?.deposit?.depositAmount !== undefined ? trackingData.deposit.depositAmount : application?.depositAmount
      },
      invoice: {
        isInvoiceEligible: trackingData?.invoice?.isInvoiceEligible !== undefined ? trackingData.invoice.isInvoiceEligible : application?.isInvoiceEligible,
        isInvoiced: trackingData?.invoice?.isInvoiced !== undefined ? trackingData.invoice.isInvoiced : application?.isInvoiced,
        invoiceId: trackingData?.invoice?.invoiceId || application?.invoiceId
      }
    };
  }, [trackingData, application]);

  // Progress Stepper Status Calculation
  const milestoneStatuses = useMemo(() => {
    const st = application?.status;
    const res = {};

    // 1. Application: Draft -> Active, else Completed
    if (st === 'Draft') res.application = 'active';
    else res.application = 'completed';

    // 2. Review: Submitted or UnderReview
    if (st === 'Submitted' || st === 'UnderReview') res.review = 'active';
    else if (['VisitScheduled', 'VisitCompleted', 'OfferReceived', 'ConditionalOffer', 'AdmissionConfirmed', 'Enrolled'].includes(st)) res.review = 'completed';
    else res.review = 'pending';

    // 3. Visit: VisitScheduled / VisitCompleted
    if (st === 'VisitScheduled') res.visit = 'active';
    else if (st === 'VisitCompleted' || tracking.visit.visitCompleted) res.visit = 'completed';
    else if (['OfferReceived', 'ConditionalOffer', 'AdmissionConfirmed', 'Enrolled'].includes(st)) res.visit = tracking.visit.visitDate ? 'completed' : 'skipped';
    else res.visit = 'pending';

    // 4. Offer: OfferReceived / ConditionalOffer
    if (st === 'OfferReceived' || st === 'ConditionalOffer') res.offer = 'active';
    else if (['AdmissionConfirmed', 'Enrolled'].includes(st)) res.offer = 'completed';
    else res.offer = 'pending';

    // 5. Admission: AdmissionConfirmed
    if (st === 'AdmissionConfirmed') res.admission = 'active';
    else if (st === 'Enrolled') res.admission = 'completed';
    else res.admission = 'pending';

    // 6. Enrollment: Enrolled
    if (st === 'Enrolled') res.enrollment = 'completed';
    else res.enrollment = 'pending';

    return res;
  }, [application?.status, tracking.visit]);

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

  const isTerminal = ['Enrolled', 'Rejected', 'Withdrawn'].includes(application.status);

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
          {/* Deposit Quick Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDepositModalOpen(true)}
            className="h-9 px-3 border-[#E5E7EB] bg-white hover:bg-gray-50 text-xs font-semibold text-[#111827]"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            {tracking.deposit.depositPaid ? 'Deposit: Paid' : 'Update Deposit'}
          </Button>

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

      {/* Current Lifecycle Status & Action Bar Card */}
      <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
        <div className="h-1 bg-[#042C53]" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Information */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Current Lifecycle State
              </span>
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeStyle(application.status)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                  {APPLICATION_STATUS_LABELS[application.status] || application.status}
                </span>

                {isTerminal && (
                  <span className="text-xs text-[#6B7280]">
                    (Terminal State — No further transitions)
                  </span>
                )}
              </div>
            </div>

            {/* Allowed Next Transitions */}
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
        </CardContent>
      </Card>

      {/* Admission Milestone Journey Stepper */}
      <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
            <Clock className="w-4 h-4 text-[#042C53]" />
            Admission Milestone Journey
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ADMISSION_MILESTONES.map((step, idx) => {
              const state = milestoneStatuses[step.id] || 'pending';
              const isCompleted = state === 'completed';
              const isActive = state === 'active';
              const isSkipped = state === 'skipped';

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'border-[#042C53] bg-[#E6F1FB]/40'
                      : isCompleted
                      ? 'border-emerald-200 bg-[#EAF3DE]/40'
                      : isSkipped
                      ? 'border-[#E5E7EB] bg-gray-50 opacity-60'
                      : 'border-[#E5E7EB] bg-[#F9FAFB]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? 'bg-[#042C53] text-white'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-[#4B5563]'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase tracking-wider px-1.5 py-0 ${
                        isActive
                          ? 'bg-blue-100 text-[#042C53] border-blue-200 font-bold'
                          : isCompleted
                          ? 'bg-emerald-100 text-[#27500A] border-[#C0DD97]'
                          : 'bg-gray-100 text-[#6B7280] border-[#E5E7EB]'
                      }`}
                    >
                      {isActive ? 'Active' : isCompleted ? 'Completed' : isSkipped ? 'Skipped' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="mt-2.5">
                    <span
                      className={`text-xs font-bold block ${
                        isActive ? 'text-[#042C53]' : isCompleted ? 'text-[#111827]' : 'text-[#6B7280]'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] block mt-0.5">{step.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Terminal state warning banner */}
          {(application.status === 'Rejected' || application.status === 'Withdrawn') && (
            <div className="mt-4 p-3.5 bg-red-50/80 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                <strong>Application Concluded:</strong> This application reached a terminal state with status{' '}
                <strong>{application.status}</strong>.
                {application.remarks && ` Recorded Reason: "${application.remarks}"`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Details Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Milestones + Overview + History (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Admission Tracking Milestones Section */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                  <Clock className="w-4 h-4 text-[#042C53]" /> Admission Tracking Milestones
                </CardTitle>
                <CardDescription className="text-xs text-[#6B7280] mt-0.5">
                  Verified progression of campus visits, university offers, confirmation, and matriculation
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* 1. Campus Visit Milestone */}
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#E6F1FB] text-[#042C53] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111827]">1. University Campus Visit</p>
                      <p className="text-[11px] text-[#6B7280]">Student and counselor on-site university visit</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] font-bold ${
                        tracking.visit.visitCompleted
                          ? 'bg-[#EAF3DE] text-[#27500A] border-[#C0DD97]'
                          : tracking.visit.visitDate
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-gray-100 text-[#6B7280] border-[#E5E7EB]'
                      }`}
                    >
                      {tracking.visit.visitCompleted ? 'Completed' : tracking.visit.visitDate ? 'Scheduled' : 'Not Scheduled'}
                    </Badge>
                    {/* Contextual Action Button */}
                    {isAdmin() && application.status === 'VisitScheduled' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setVisitModalMode('complete');
                          setVisitModalOpen(true);
                        }}
                        className="text-xs h-7 px-2.5 bg-[#042C53] hover:bg-[#0C447C] text-white font-semibold rounded-lg"
                      >
                        Complete Visit
                      </Button>
                    )}
                    {(application.status === 'UnderReview' || application.status === 'VisitCompleted') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setVisitModalMode('schedule');
                          setVisitModalOpen(true);
                        }}
                        className="text-xs h-7 px-2.5 border-[#E5E7EB] bg-white text-[#111827] hover:bg-gray-50 rounded-lg"
                      >
                        Schedule Visit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-[#E5E7EB]/60">
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Scheduled Date</span>
                    <span className="font-semibold text-[#111827] mt-0.5 block">
                      {tracking.visit.visitDate ? new Date(tracking.visit.visitDate).toLocaleString() : 'Not yet recorded'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Visit Location</span>
                    <span className="font-semibold text-[#111827] mt-0.5 block">
                      {tracking.visit.visitLocation || 'Not specified'}
                    </span>
                  </div>
                </div>
                {tracking.visit.visitNotes && (
                  <div className="bg-white p-3 rounded-lg border border-[#E5E7EB] text-xs text-[#4B5563]">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">Visit Notes & Remarks</span>
                    <p className="italic leading-relaxed">"{tracking.visit.visitNotes}"</p>
                  </div>
                )}
              </div>

              {/* 2. University Offer Milestone */}
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111827]">2. University Offer Letter</p>
                      <p className="text-[11px] text-[#6B7280]">Official admissions acceptance from partner university</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] font-bold ${
                        application.status === 'ConditionalOffer'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : tracking.offer.offerDate
                          ? 'bg-[#EAF3DE] text-[#27500A] border-[#C0DD97]'
                          : 'bg-gray-100 text-[#6B7280] border-[#E5E7EB]'
                      }`}
                    >
                      {application.status === 'ConditionalOffer'
                        ? 'Conditional Offer'
                        : tracking.offer.offerDate
                        ? 'Unconditional Offer'
                        : 'Pending'}
                    </Badge>
                    {/* Contextual Action Button */}
                    {isAdmin() && ['UnderReview', 'VisitCompleted'].includes(application.status) && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => {
                            setOfferModalType('unconditional');
                            setOfferModalOpen(true);
                          }}
                          className="text-xs h-7 px-2.5 bg-[#042C53] hover:bg-[#0C447C] text-white font-semibold rounded-lg"
                        >
                          Record Offer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOfferModalType('conditional');
                            setOfferModalOpen(true);
                          }}
                          className="text-xs h-7 px-2.5 border-[#E5E7EB] bg-white text-[#111827] hover:bg-gray-50 rounded-lg"
                        >
                          Conditional
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-[#E5E7EB]/60">
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Offer Date</span>
                    <span className="font-semibold text-[#111827] mt-0.5 block">
                      {tracking.offer.offerDate ? new Date(tracking.offer.offerDate).toLocaleDateString() : 'Not yet recorded'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Official Document</span>
                    {tracking.offer.offerLetterUrl ? (
                      <a
                        href={tracking.offer.offerLetterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#042C53] hover:underline mt-0.5"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Offer Letter <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    ) : (
                      <span className="text-[#9CA3AF] italic text-xs mt-0.5 block">No document attached</span>
                    )}
                  </div>
                </div>
                {tracking.offer.offerConditions && (
                  <div className="bg-white p-3 rounded-lg border border-[#E5E7EB] text-xs text-[#4B5563]">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                      {application.status === 'ConditionalOffer' ? 'Prerequisites & Conditions' : 'Offer Remarks'}
                    </span>
                    <p className="text-[#111827] font-medium leading-relaxed">{tracking.offer.offerConditions}</p>
                  </div>
                )}
              </div>

              {/* 3. Admission Confirmation Milestone */}
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111827]">3. Admission Confirmation</p>
                      <p className="text-[11px] text-[#6B7280]">Candidate offer acceptance & university student ID</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] font-bold ${
                        tracking.admission.admissionDate
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-gray-100 text-[#6B7280] border-[#E5E7EB]'
                      }`}
                    >
                      {tracking.admission.admissionDate ? 'Confirmed' : 'Pending'}
                    </Badge>
                    {/* Contextual Action Button */}
                    {isAdmin() && ['OfferReceived', 'ConditionalOffer'].includes(application.status) && (
                      <Button
                        size="sm"
                        onClick={() => setAdmissionModalOpen(true)}
                        className="text-xs h-7 px-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg"
                      >
                        Confirm Admission
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-[#E5E7EB]/60">
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Confirmation Date</span>
                    <span className="font-semibold text-[#111827] mt-0.5 block">
                      {tracking.admission.admissionDate ? new Date(tracking.admission.admissionDate).toLocaleDateString() : 'Not yet confirmed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">University Student ID</span>
                    <span className="font-mono font-bold text-[#111827] mt-0.5 block">
                      {tracking.admission.universityStudentId || 'Not assigned yet'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Admission Letter</span>
                    {tracking.admission.admissionLetterUrl ? (
                      <a
                        href={tracking.admission.admissionLetterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline mt-0.5"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Letter <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    ) : (
                      <span className="text-[#9CA3AF] italic text-xs mt-0.5 block">No document attached</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Final Enrollment Milestone */}
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111827]">4. Final Official Enrollment</p>
                      <p className="text-[11px] text-[#6B7280]">Student matriculated and verified at university</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] font-bold ${
                        application.status === 'Enrolled' || tracking.enrollment.enrollmentDate
                          ? 'bg-green-100 text-green-900 border-green-300'
                          : 'bg-gray-100 text-[#6B7280] border-[#E5E7EB]'
                      }`}
                    >
                      {application.status === 'Enrolled' || tracking.enrollment.enrollmentDate ? 'Officially Enrolled' : 'Pending'}
                    </Badge>
                    {/* Contextual Action Button */}
                    {isAdmin() && application.status === 'AdmissionConfirmed' && (
                      <Button
                        size="sm"
                        onClick={() => setEnrollmentModalOpen(true)}
                        className="text-xs h-7 px-2.5 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg"
                      >
                        Mark as Enrolled
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-[#E5E7EB]/60">
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Enrollment Date</span>
                    <span className="font-semibold text-[#111827] mt-0.5 block">
                      {tracking.enrollment.enrollmentDate ? new Date(tracking.enrollment.enrollmentDate).toLocaleDateString() : 'Not yet enrolled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Enrollment Proof</span>
                    {tracking.enrollment.enrollmentProofUrl ? (
                      <a
                        href={tracking.enrollment.enrollmentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:underline mt-0.5"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Proof <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    ) : (
                      <span className="text-[#9CA3AF] italic text-xs mt-0.5 block">No document attached</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Tuition Deposit Tracking Card */}
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111827]">5. Tuition Deposit Tracking</p>
                      <p className="text-[11px] text-[#6B7280]">Payment status and deposit amount recorded with university</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] font-bold ${
                        tracking.deposit.depositPaid
                          ? 'bg-[#EAF3DE] text-[#27500A] border-[#C0DD97]'
                          : 'bg-gray-100 text-[#6B7280] border-[#E5E7EB]'
                      }`}
                    >
                      {tracking.deposit.depositPaid ? 'Deposit Paid' : 'Not Recorded / Pending'}
                    </Badge>
                    {isAdmin() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDepositModalOpen(true)}
                        className="text-xs h-7 px-2.5 border-[#E5E7EB] bg-white text-[#111827] hover:bg-gray-50 rounded-lg"
                      >
                        Update Deposit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-[#E5E7EB]/60">
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Deposit Status</span>
                    <span className="font-semibold text-[#111827] mt-0.5 block">
                      {tracking.deposit.depositPaid ? 'Yes, Paid in Full' : 'Pending / Not Recorded'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider block">Deposit Amount</span>
                    <span className="font-bold text-emerald-700 mt-0.5 block">
                      {tracking.deposit.depositAmount !== null && tracking.deposit.depositAmount !== undefined
                        ? `${Number(tracking.deposit.depositAmount).toLocaleString()} ${application.currency || 'USD'}`
                        : 'Not recorded'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Source Event</span>
                  <span className="text-xs font-medium text-[#4B5563] mt-0.5 block">
                    {application.sourceEvent ? application.sourceEvent.title : 'Direct Application (No Event)'}
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
                        Pending Enrollment
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
              ) : application.status === 'Enrolled' && application.isInvoiceEligible ? (
                <Badge className="bg-[#E6F1FB] text-[#042C53] border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Eligible
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-[#6B7280] border-[#E5E7EB] uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Pending Enrollment
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
              ) : application.status === 'Enrolled' && application.isInvoiceEligible ? (
                <div className="space-y-3">
                  <div className="p-3 bg-[#E6F1FB]/60 border border-blue-200 rounded-xl space-y-1">
                    <span className="font-bold text-[#042C53] block">Ready for Invoicing</span>
                    <p className="text-[11px] text-[#0C447C]">
                      Student has completed university enrollment. You can now raise the commission invoice for payoff review.
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
                  Commission payoffs are unlocked once the applicant completes university admission and reaches official <strong>Enrolled</strong> status.
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

      {/* Specialized Phase 5 Modals */}
      <VisitModal
        open={visitModalOpen}
        onOpenChange={setVisitModalOpen}
        mode={visitModalMode}
        application={application}
        existingVisit={tracking.visit}
        onSuccess={fetchAllApplicationData}
      />

      <OfferModal
        open={offerModalOpen}
        onOpenChange={setOfferModalOpen}
        type={offerModalType}
        application={application}
        existingOffer={tracking.offer}
        onSuccess={fetchAllApplicationData}
      />

      <AdmissionModal
        open={admissionModalOpen}
        onOpenChange={setAdmissionModalOpen}
        application={application}
        existingAdmission={tracking.admission}
        onSuccess={fetchAllApplicationData}
      />

      <EnrollmentModal
        open={enrollmentModalOpen}
        onOpenChange={setEnrollmentModalOpen}
        application={application}
        existingEnrollment={tracking.enrollment}
        onSuccess={fetchAllApplicationData}
      />

      <DepositModal
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
        application={application}
        existingDeposit={tracking.deposit}
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
