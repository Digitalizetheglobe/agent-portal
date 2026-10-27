import React, { useRef, useState } from 'react';
import { CheckCircle2, Circle, Eye, FileSignature, Award, RefreshCw, X } from 'lucide-react';
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

// Shows what was picked, with a local preview (nothing is sent) and a way to drop a wrong pick
const PickedFile = ({ file, onClear }) => {
  if (!file) return null;
  const preview = () => {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-[#111827] truncate">{file.name}</p>
        <p className="text-[11px] text-[#6B7280]">{(file.size / 1024).toFixed(0)} KB · check it before you send</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={preview}>
          <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onClear}>
          <X className="w-3.5 h-3.5 mr-1.5" /> Remove
        </Button>
      </div>
    </div>
  );
};

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
  // Which upload is being redone: 'contract' | 'signed' | 'cert' | null
  const [replacing, setReplacing] = useState(null);
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
      setReplacing(null);
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

  const startReplace = (key) => {
    setReplacing(key);
    if (key === 'contract') setExpiresAt(agent.contractExpiresAt ? String(agent.contractExpiresAt).slice(0, 10) : '');
  };
  const cancelReplace = () => {
    setReplacing(null);
    clear(setContractFile, 'contract')();
    clear(setSignedFile, 'signed')();
    clear(setCertFile, 'cert')();
    setExpiresAt('');
  };

  const issue = () => run(
    'issue',
    () => issueAgentContract(agent.id, contractFile, expiresAt),
    replacing === 'contract' ? 'Contract replaced' : renewal ? 'Contract renewal issued' : 'Contract issued',
    () => { clear(setContractFile, 'contract')(); setExpiresAt(''); }
  );
  const uploadSigned = () => run(
    'signed',
    () => uploadSignedAgentContract(agent.id, signedFile),
    replacing === 'signed' ? 'Signed contract replaced' : 'Signed contract uploaded',
    clear(setSignedFile, 'signed')
  );
  const issueCert = () => {
    if (replacing === 'cert' && !window.confirm('Replace the issued E-Certificate? The certificate number stays the same and the old file is kept as superseded.')) return;
    return run(
      'cert',
      () => issueAgentCertificate(agent.id, certFile),
      replacing === 'cert' ? 'E-Certificate replaced' : 'E-Certificate issued. Agent is active',
      clear(setCertFile, 'cert')
    );
  };

  const stepDone = { issued: progress.issued, signed: progress.signed, activated: progress.activated };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden" data-testid="agent-contract-panel">
      <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Contract and E-Certificate</h3>
        <Badge className={cn('border-none text-[10px] h-5', agent.isActivated ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-[#FAEEDA] text-[#633806]')}>
          {agent.isActivated ? 'Active' : 'Not active yet'}
        </Badge>
      </div>

      <div className="p-4 space-y-5">
        <ol className="space-y-2">
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
        {canManage && (status === 'not_issued' || renewal || replacing === 'contract') && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#111827] flex items-center gap-2">
              <FileSignature className="w-4 h-4" /> {replacing === 'contract' ? 'Replace the contract' : renewal ? 'Issue a contract renewal' : 'Issue the agent contract'}
            </p>
            <div className="flex flex-col gap-2">
              <Input className="w-full min-w-0" ref={inputs.contract} type="file" accept={ACCEPT} onChange={pick(setContractFile)} />
              <PickedFile file={contractFile} onClear={clear(setContractFile, 'contract')} />
              <div>
                <label className="text-[11px] text-[#6B7280]" htmlFor="contract-expiry">Expires (optional)</label>
                <Input id="contract-expiry" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              <Button onClick={issue} disabled={!contractFile || busy === 'issue'} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
                {busy === 'issue' ? 'Issuing...' : replacing === 'contract' ? 'Replace contract' : 'Issue contract'}
              </Button>
              {replacing === 'contract' && <Button variant="ghost" onClick={cancelReplace}>Cancel</Button>}
            </div>
          </div>
        )}

        {/* 2. Upload the signed copy */}
        {canManage && (status === 'issued' || replacing === 'signed') && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#111827] flex items-center gap-2">
              <FileSignature className="w-4 h-4" /> {replacing === 'signed' ? 'Replace the signed contract' : 'Upload the signed contract the agent returned'}
            </p>
            <div className="flex flex-col gap-2">
              <Input className="w-full min-w-0" ref={inputs.signed} type="file" accept={ACCEPT} onChange={pick(setSignedFile)} />
              <PickedFile file={signedFile} onClear={clear(setSignedFile, 'signed')} />
              <Button onClick={uploadSigned} disabled={!signedFile || busy === 'signed'} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
                {busy === 'signed' ? 'Uploading...' : replacing === 'signed' ? 'Replace signed contract' : 'Upload signed contract'}
              </Button>
              {replacing === 'signed' && <Button variant="ghost" onClick={cancelReplace}>Cancel</Button>}
            </div>
          </div>
        )}

        {/* 3. Issue the E-Certificate and activate */}
        {canManage && ((status === 'signed' && !agent.isActivated) || replacing === 'cert') && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#111827] flex items-center gap-2">
              <Award className="w-4 h-4" /> {replacing === 'cert' ? 'Replace the E-Certificate' : 'Upload the E-Certificate and activate the agent'}
            </p>
            <div className="flex flex-col gap-2">
              <Input className="w-full min-w-0" ref={inputs.cert} type="file" accept={ACCEPT} onChange={pick(setCertFile)} />
              <PickedFile file={certFile} onClear={clear(setCertFile, 'cert')} />
              <Button onClick={issueCert} disabled={!certFile || busy === 'cert'} className="bg-[#27500A] hover:bg-[#1f3b08] text-white">
                {busy === 'cert' ? 'Issuing...' : replacing === 'cert' ? 'Replace E-Certificate' : 'Issue E-Certificate'}
              </Button>
              {replacing === 'cert' && <Button variant="ghost" onClick={cancelReplace}>Cancel</Button>}
            </div>
            <p className="text-[11px] text-[#6B7280]">A certificate number is generated for the file you upload.</p>
          </div>
        )}

        {/* Files */}
        {(files.length > 0 || agent.eCertificateFile) && (
          <ul className="divide-y divide-[#F3F4F6] border border-[#F3F4F6] rounded-lg">
            {files.map((f) => {
              const label = f.kind === 'signed' ? 'Signed contract' : f.kind === 'certificate' ? 'E-Certificate' : 'Contract';
              const current = !f.supersededAt;
              const canReplace = canManage && current && (
                (f.kind === 'issued' && status === 'issued') ||
                (f.kind === 'signed' && status === 'signed' && !agent.isActivated)
              );
              return (
              <li key={f.id} className={cn('flex items-center justify-between gap-3 px-3 py-2 text-sm', !current && 'opacity-60')}>
                <div className="min-w-0">
                  <p className="font-medium text-[#111827]">{label}{!current && <span className="ml-2 text-[10px] font-normal text-[#6B7280]">Superseded</span>}</p>
                  <p className="text-[11px] text-[#6B7280] truncate">{f.fileName} · {formatDate(f.uploadedAt)}{f.uploadedByName ? ` · ${f.uploadedByName}` : ''}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {canReplace && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => startReplace(f.kind === 'signed' ? 'signed' : 'contract')}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Replace
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => viewAgentContractFile(agent.id, f.id)}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                  </Button>
                </div>
              </li>
              );
            })}
            {agent.eCertificateFile && (
              <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-[#111827]">E-Certificate</p>
                  <p className="text-[11px] text-[#6B7280] truncate">{agent.eCertificateFile.fileName}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {canManage && agent.isActivated && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => startReplace('cert')}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Replace
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => viewAgentContractFile(agent.id, 'certificate')}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                  </Button>
                </div>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AgentContractPanel;
