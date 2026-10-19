import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Mail, Phone, FileText, Eye, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import AgentApplicationDetails from '../../components/agent/AgentApplicationDetails';
import AgentReviewDialog from '../../components/modals/AgentReviewDialog';
import ReviewActionButtons from '../../components/agent/ReviewActionButtons';
import AgentContractPanel from '../../components/agent/AgentContractPanel';
import { getOnboardingStatus, canReviewDocuments, getDocChecklist, HISTORY_LABELS, IN_REVIEW_STATUSES, getWaitingFor } from '../../utils/onboarding';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const docBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (['approved', 'verified'].includes(s)) return 'bg-[#EAF3DE] text-[#27500A]';
  if (s === 'rejected') return 'bg-[#FCEBEB] text-[#791F1F]';
  if (['pending', 'submitted'].includes(s)) return 'bg-[#FAEEDA] text-[#633806]';
  return 'bg-[#F3F4F6] text-[#4B5563]';
};

const SectionHeader = ({ title, hint }) => (
  <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2">
    <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">{title}</h3>
    {hint && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{hint}</p>}
  </div>
);

const AgentDetailPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { agents, fetchAgents, viewAgentDocument, verifyAgent, reviewAgentOnboarding } = useData();
  const { user } = useAuth();
  const canReviewDocs = canReviewDocuments(user);
  const [reviewAction, setReviewAction] = useState(null);

  // Agents upload verification documents after the admin's list was loaded, so refresh on open
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const agent = useMemo(() => agents.find(a => a.id === agentId), [agents, agentId]);

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 font-medium">Agent not found or data still loading...</p>
        <Button onClick={() => navigate('/admin/agents')}>Back to Agents</Button>
      </div>
    );
  }

  const isVerified = agent.isVerified || agent.verificationStatus === 'approved';
  const docs = agent.verificationDocuments || [];

  const status = getOnboardingStatus(agent);
  const inReview = IN_REVIEW_STATUSES.includes(agent.onboardingStatus);
  const checklist = getDocChecklist(agent);

  const reviewDocument = async (doc, documentStatus) => {
    let remarks;
    if (documentStatus === 'rejected') {
      remarks = window.prompt('Reason for rejecting this document:');
      if (!remarks) return;
    }
    try {
      await verifyAgent(agent.id, { documentId: doc.id || doc._id, documentStatus, remarks });
      toast.success(`Document ${documentStatus}`, { description: doc.docType });
    } catch {
      // error toast already shown
    }
  };

  const profile = [
    ['User ID', agent.userId],
    ['Agency', agent.agencyName],
    ['Registration #', agent.businessRegistrationNumber],
    ['Region', agent.region],
    ['Joined', agent.createdAt ? formatDate(agent.createdAt) : null],
    ['Address', agent.fullAddress],
  ];

  return (
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen font-['Inter']">
      <button
        onClick={() => navigate('/admin/agents')}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#042C53] hover:underline mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">{agent.name}</h1>
            {agent.agentCode && <span className="text-xs font-mono text-[#6B7280]">{agent.agentCode}</span>}
            <Badge className={cn('border-none text-[10px] font-medium h-5', status.style)}>
              {isVerified ? 'Verified' : status.label}
            </Badge>
            <Badge className={cn('border-none text-[10px] font-medium h-5', agent.status === 'active' ? 'bg-[#E6F1FB] text-[#0C447C]' : 'bg-[#F3F4F6] text-[#4B5563]')}>
              {agent.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Agent details · {agent.agencyName || 'Independent agent'}{agent.region ? ` · ${agent.region}` : ''}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/admin/agents/${agent.id}/report`)}
          className="h-10 px-4 text-xs font-semibold border-slate-200 bg-white"
        >
          <BarChart3 className="w-4 h-4 mr-2" /> View performance report
        </Button>
      </div>

      {/* Onboarding review */}
      <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white mb-6" data-testid="onboarding-review-card">
        <SectionHeader title="Onboarding review" />
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge className={cn('border-none text-xs font-medium h-6', status.style)}>{status.label}</Badge>
              <p className="text-sm text-[#6B7280]">
                {getWaitingFor(agent)}
              </p>
            </div>

            <ReviewActionButtons agent={agent} onOpenDialog={setReviewAction} />

          </div>

          {['rejected', 'correction_required'].includes(agent.onboardingStatus) && agent.verificationRemarks && (
            <div className={cn('text-sm border p-3 rounded-lg', agent.onboardingStatus === 'rejected' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-orange-50 border-orange-100 text-orange-900')}>
              <span className="font-semibold">{agent.onboardingStatus === 'rejected' ? 'Reason for rejection: ' : 'Changes requested: '}</span>
              {agent.verificationRemarks}
            </div>
          )}

          {checklist.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-2">Required documents</p>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {checklist.map(({ type, doc }) => (
                  <li key={type} className="flex items-center justify-between gap-2 text-sm border border-[#F3F4F6] rounded-lg px-3 py-2">
                    <span className="truncate">{type}</span>
                    {doc
                      ? <Badge className={cn('border-none text-[10px] h-5 capitalize', docBadge(doc.status))}>{doc.status}</Badge>
                      : <Badge className="border-none text-[10px] h-5 bg-[#F3F4F6] text-[#4B5563]">Missing</Badge>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(agent.onboardingHistory || []).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-1">History</p>
              <ol className="divide-y divide-[#F3F4F6]">
                {[...agent.onboardingHistory].reverse().map((h, i) => (
                  <li key={i} className="py-2 text-sm">
                    <span className="font-medium text-[#111827]">{HISTORY_LABELS[h.action] || h.action}</span>
                    <span className="text-xs text-[#6B7280]"> · {h.byName || 'Unknown'} · {new Date(h.at).toLocaleString()}</span>
                    {h.remarks && <p className="text-xs text-[#4B5563] mt-0.5">"{h.remarks}"</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </Card>

      <AgentContractPanel agent={agent} />

      <AgentReviewDialog agent={agent} action={reviewAction} onClose={() => setReviewAction(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-6">
          <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
            <SectionHeader title="Agent profile" />
            <div className="p-4 space-y-3">
              <p className="text-sm text-[#111827] flex items-center gap-2 break-all"><Mail className="w-4 h-4 text-[#9CA3AF] shrink-0" /> {agent.email}</p>
              <p className="text-sm text-[#111827] flex items-center gap-2"><Phone className="w-4 h-4 text-[#9CA3AF] shrink-0" /> {agent.phone || 'No phone provided'}</p>
              <dl className="pt-3 border-t border-[#F3F4F6] space-y-2.5">
                {profile.map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-4 text-sm">
                    <dt className="text-[#6B7280] shrink-0">{label}</dt>
                    <dd className="text-[#111827] font-medium text-right break-words min-w-0">{val || <span className="text-[#9CA3AF] font-normal">Not provided</span>}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card>

          <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
            <SectionHeader title="Verification documents" hint="Identity and business documents the agent uploaded" />
            {docs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <FileText className="w-10 h-10 text-gray-200" />
                <p className="text-sm text-[#6B7280] font-medium">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {docs.map((doc, i) => (
                  <div key={doc.id || doc._id || i} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#111827]">{doc.docType}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">{doc.fileName}{doc.uploadedAt ? ` · ${formatDate(doc.uploadedAt)}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={cn('border-none text-[10px] font-medium h-5 capitalize', docBadge(doc.status))}>{doc.status}</Badge>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => viewAgentDocument(agent.id, doc.id || doc._id)}>
                          <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                        </Button>
                      </div>
                    </div>
                    {canReviewDocs && inReview && doc.status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => reviewDocument(doc, 'approved')}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => reviewDocument(doc, 'rejected')}>
                          <X className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    {doc.remarks && <p className="text-[11px] text-[#6B7280] bg-[#F9FAFB] rounded p-2 mt-2"><strong>Remarks:</strong> {doc.remarks}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#111827] mb-3">Application details</h3>
          <AgentApplicationDetails agent={agent} className="grid grid-cols-1 xl:grid-cols-2 gap-6 space-y-0" />
        </div>
      </div>
    </div>
  );
};

export default AgentDetailPage;
