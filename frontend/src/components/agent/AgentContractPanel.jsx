import React, { useRef, useState } from 'react';
import { CheckCircle2, Circle, Eye, FileSignature, Award } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { canManageContract, canViewContract, CONTRACT_STEPS, getContractProgress } from '../../utils/onboarding';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx';

/**
 * Staff view of an approved agent's agreement: issue the contract, upload the signed copy,
 * then issue the E-Certificate, which activates the agent.
 */
const AgentContractPanel = ({ agent }) => {
  const { user } = useAuth();
  const { issueAgentContract, uploadSignedAgentContract, issueAgentCertificate, viewAgentContractFile } = useData();
  const [contractFile, setContractFile] = useState(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [signedFile, setSignedFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [busy, setBusy] = useState(null);
  const inputs = { contract: useRef(null), signed: useRef(null), cert: useRef(null) };

  if (!canViewContract(user, agent)) return null;
  // Only the Head of Admission issues and uploads; Account Managers and the Head of Recruitment view
  const canManage = canManageContract(user, agent);

  const progress = getContractProgress(agent);
  const status = agent.contractStatus || 'not_issued';
  const files = agent.contractDocuments || [];
  const renewal = agent.isActivated;

  const pick = (setter) => (e) => {
    const file = e.target.files[0];
    if (file && file.size > MAX_SIZE) {
      toast.error('File size exceeds 10MB limit');
      e.target.value = '';
      return;
    }
    setter(file || null);
  };

  const run = async (name, action, success, reset) => {
    setBusy(name);
    try {
      await action();
      toast.success(success, { description: agent.name });
      reset();
    } catch {
      // error toast already shown
    } finally {
      setBusy(null);
    }
  };

  const clear = (setter, key) => () => {
    setter(null);
    if (inputs[key].current) inputs[key].current.value = '';
  };

  const issue = () => run(
    'issue',
    () => issueAgentContract(agent.id, contractFile, expiresAt),
    renewal ? 'Contract renewal issued' : 'Contract issued',
    () => { clear(setContractFile, 'contract')(); setExpiresAt(''); }
  );
  const uploadSigned = () => run(
    'signed',
    () => uploadSignedAgentContract(agent.id, signedFile),
    'Signed contract uploaded',
    clear(setSignedFile, 'signed')
  );
  const issueCert = () => run(
    'cert',
    () => issueAgentCertificate(agent.id, certFile),
    'E-Certificate issued. Agent is active',
    clear(setCertFile, 'cert')
  );

  const stepDone = { issued: progress.issued, signed: progress.signed, activated: progress.activated };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden mb-6" data-testid="agent-contract-panel">
      <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Contract and E-Certificate</h3>
        <Badge className={cn('border-none text-[10px] h-5', agent.isActivated ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-[#FAEEDA] text-[#633806]')}>
          {agent.isActivated ? 'Active' : 'Not active yet'}
        </Badge>
      </div>

      <div className="p-4 space-y-5">
        <ol className="flex flex-wrap gap-x-6 gap-y-2">
          {CONTRACT_STEPS.map((step) => (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              {stepDone[step.key]
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                : <Circle className="w-4 h-4 text-[#9CA3AF]" />}
              <span className={stepDone[step.key] ? 'text-[#111827]' : 'text-[#6B7280]'}>{step.label}</span>
            </li>
          ))}
        </ol>

        {!canManage && !agent.isActivated && (
          <p className="text-sm text-[#6B7280]">
            {status === 'not_issued' && 'Waiting for the Head of Admission to issue the contract.'}
            {status === 'issued' && 'Contract issued. Waiting for the agent to return the signed copy.'}
            {status === 'signed' && 'Signed contract received. Waiting for the Head of Admission to issue the E-Certificate.'}
          </p>
        )}

        {agent.isActivated && (
          <p className="text-sm text-[#4B5563]">
            E-Certificate <strong>{agent.eCertificateNumber}</strong> · active since {formatDate(agent.activatedAt)}
            {agent.contractExpiresAt ? ` · contract expires ${formatDate(agent.contractExpiresAt)}` : ''}
          </p>
        )}

        {/* 1. Issue the contract (or a renewal) */}
        {canManage && (status === 'not_issued' || renewal) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#111827] flex items-center gap-2">
              <FileSignature className="w-4 h-4" /> {renewal ? 'Issue a contract renewal' : 'Issue the agent contract'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-2 items-end">
              <Input ref={inputs.contract} type="file" accept={ACCEPT} onChange={pick(setContractFile)} />
              <div>
                <label className="text-[11px] text-[#6B7280]" htmlFor="contract-expiry">Expires (optional)</label>
                <Input id="contract-expiry" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              <Button onClick={issue} disabled={!contractFile || busy === 'issue'} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
                {busy === 'issue' ? 'Issuing...' : 'Issue contract'}
              </Button>
            </div>
          </div>
        )}

        {/* 2. Upload the signed copy */}
        {canManage && status === 'issued' && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#111827] flex items-center gap-2">
              <FileSignature className="w-4 h-4" /> Upload the signed contract the agent returned
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <Input ref={inputs.signed} type="file" accept={ACCEPT} onChange={pick(setSignedFile)} />
              <Button onClick={uploadSigned} disabled={!signedFile || busy === 'signed'} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
                {busy === 'signed' ? 'Uploading...' : 'Upload signed contract'}
              </Button>
            </div>
          </div>
        )}

        {/* 3. Issue the E-Certificate and activate */}
        {canManage && status === 'signed' && !agent.isActivated && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#111827] flex items-center gap-2">
              <Award className="w-4 h-4" /> Upload the E-Certificate and activate the agent
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <Input ref={inputs.cert} type="file" accept={ACCEPT} onChange={pick(setCertFile)} />
              <Button onClick={issueCert} disabled={!certFile || busy === 'cert'} className="bg-[#27500A] hover:bg-[#1f3b08] text-white">
                {busy === 'cert' ? 'Issuing...' : 'Issue E-Certificate'}
              </Button>
            </div>
            <p className="text-[11px] text-[#6B7280]">A certificate number is generated for the file you upload.</p>
          </div>
        )}

        {/* Files */}
        {(files.length > 0 || agent.eCertificateFile) && (
          <ul className="divide-y divide-[#F3F4F6] border border-[#F3F4F6] rounded-lg">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-[#111827]">{f.kind === 'signed' ? 'Signed contract' : 'Contract'}</p>
                  <p className="text-[11px] text-[#6B7280] truncate">{f.fileName} · {formatDate(f.uploadedAt)}{f.uploadedByName ? ` · ${f.uploadedByName}` : ''}</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => viewAgentContractFile(agent.id, f.id)}>
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                </Button>
              </li>
            ))}
            {agent.eCertificateFile && (
              <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-[#111827]">E-Certificate</p>
                  <p className="text-[11px] text-[#6B7280] truncate">{agent.eCertificateFile.fileName}</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={() => viewAgentContractFile(agent.id, 'certificate')}>
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                </Button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AgentContractPanel;
