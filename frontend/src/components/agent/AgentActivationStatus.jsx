import React, { useEffect, useRef, useState } from 'react';
import { Award, CheckCircle2, Circle, Eye, FileSignature, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { agentAPI, formatApiError } from '../../utils/api';
import { CONTRACT_STEPS, getContractProgress } from '../../utils/onboarding';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const MESSAGES = {
  not_issued: 'Your application is approved. QStudy is preparing your agent contract.',
  issued: 'Your agent contract is ready. Download it, sign it and return it to QStudy.',
  signed: 'We have your signed contract. QStudy is issuing your E-Certificate.',
};

/**
 * Shown to an approved agent: where they are on the contract / E-Certificate steps,
 * and the files once available. Students can be submitted only after activation.
 */
const AgentActivationStatus = () => {
  const { user, updateUser } = useAuth();
  const { viewAgentContractFile } = useData();

  // The profile loaded at login can be out of date: staff may have issued the contract since.
  useEffect(() => {
    let cancelled = false;
    agentAPI.getMe()
      .then((res) => { if (!cancelled) updateUser(res.data); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [signedFile, setSignedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  const handlePick = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      e.target.value = '';
      return;
    }
    setSignedFile(file || null);
  };

  const handleUploadSigned = async () => {
    setUploading(true);
    try {
      const res = await agentAPI.uploadOwnSignedContract(signedFile);
      updateUser(res.data);
      setSignedFile(null);
      if (fileInput.current) fileInput.current.value = '';
      toast.success('Signed contract uploaded', { description: 'QStudy will review it and issue your E-Certificate.' });
    } catch (error) {
      toast.error('Could not upload the signed contract', { description: formatApiError(error) });
    } finally {
      setUploading(false);
    }
  };

  const progress = getContractProgress(user);
  const active = !!user?.isActivated;
  const status = user?.contractStatus || 'not_issued';
  const contractFiles = (user?.contractDocuments || []).filter((f) => f.kind === 'issued');
  const latestContract = contractFiles[contractFiles.length - 1];

  return (
    <Card className={`border-l-4 ${active ? 'border-l-emerald-500' : 'border-l-amber-500'}`} data-testid="agent-activation-status">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${active ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              {active ? <Award className="w-5 h-5 text-emerald-600" /> : <FileSignature className="w-5 h-5 text-amber-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg font-['Outfit']">{active ? 'Your account is active' : 'Agent agreement'}</CardTitle>
                {user?.agentCode && (
                  <span className="text-xs font-mono font-semibold text-[#042C53] bg-[#E6F1FB] border border-[#B5D4F4] px-2 py-0.5 rounded">
                    ID: {user.agentCode}
                  </span>
                )}
              </div>
              <CardDescription>
                {active
                  ? `E-Certificate ${user.eCertificateNumber}${user.activatedAt ? ` · active since ${formatDate(user.activatedAt)}` : ''}. You can submit students.`
                  : `${MESSAGES[status]} You can submit students once your account is active.`}
              </CardDescription>
            </div>
          </div>
          <Badge className={`border-none ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {active ? 'Active' : 'Awaiting activation'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="flex flex-wrap gap-x-6 gap-y-2">
          {CONTRACT_STEPS.map((step) => (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              {progress[step.key]
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                : <Circle className="w-4 h-4 text-muted-foreground" />}
              <span className={progress[step.key] ? '' : 'text-muted-foreground'}>{step.label}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          {latestContract && (
            <Button variant="outline" size="sm" onClick={() => viewAgentContractFile(user.id, latestContract.id)}>
              <Eye className="w-4 h-4 mr-2" /> {status === 'issued' ? 'Download contract to sign' : 'View contract'}
            </Button>
          )}
          {user?.eCertificateFile && (
            <Button variant="outline" size="sm" onClick={() => viewAgentContractFile(user.id, 'certificate')}>
              <Award className="w-4 h-4 mr-2" /> View E-Certificate
            </Button>
          )}
        </div>

        {/* Return the signed copy */}
        {!active && status === 'issued' && (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-2" data-testid="signed-contract-upload">
            <p className="text-sm font-medium">Upload your signed contract</p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <Input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handlePick} />
              <Button size="sm" onClick={handleUploadSigned} disabled={!signedFile || uploading}>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload signed contract'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">PDF preferred. Max 10MB.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentActivationStatus;
