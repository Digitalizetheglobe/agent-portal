import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { applicationAPI, formatApiError } from '../../utils/api';
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_HEADINGS,
  FEE_STATUS_LABELS,
  canManagePipeline,
  getDisplayStageInfo,
  isPipelineActive,
} from '../../utils/pipeline';
import { cn } from '../../lib/utils';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

/**
 * The whole journey of one application in a single track: QStudy's application review first
 * (passed in as children), then the visa pipeline.
 * Head of Admission: moves the student one stage forward (or one back, with a reason) and accepts or
 * rejects the proof of fee payment. Agent: watches the progress and uploads the proof at Registration.
 */
const VisaPipelinePanel = ({ application, onChange, children }) => {
  const { user } = useAuth();
  const canManage = canManagePipeline(user);
  const isOwnerAgent = user?.role === 'agent';

  const [moveDialog, setMoveDialog] = useState(null); // { direction: 'forward' | 'back', stage }
  const [remarks, setRemarks] = useState('');
  const [arrivalPerson, setArrivalPerson] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalFlightNumber, setArrivalFlightNumber] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const ticketInput = useRef(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofNote, setProofNote] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  if (!application) return null;

  const stage = application.pipelineStage || 'Application';
  const stageIndex = PIPELINE_STAGES.indexOf(stage);
  const nextStage = PIPELINE_STAGES[stageIndex + 1] || null;
  const prevStage = stageIndex > 0 ? PIPELINE_STAGES[stageIndex - 1] : null;
  const active = isPipelineActive(application);
  const invoiced = Boolean(application.isInvoiced);
  const display = getDisplayStageInfo(application);
  const feeStatus = application.feeStatus || 'Pending';
  const atRegistration = stage === 'Registration';
  // The fee section is relevant from Registration onwards
  const feeSectionVisible = stageIndex >= PIPELINE_STAGES.indexOf('Registration');
  // The visa pipeline starts after QStudy has started reviewing the application
  const reviewStarted = !['Draft', 'Submitted'].includes(application.status);
  const mustReviewFirst = stage === 'Application' && !reviewStarted;

  const run = async (action, success) => {
    setBusy(true);
    try {
      await action();
      toast.success(success, { description: application.applicationNumber });
      if (onChange) await onChange();
      return true;
    } catch (error) {
      toast.error('Action failed', { description: formatApiError(error) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openMove = (direction) => {
    setRemarks('');
    setArrivalPerson(application.arrivalPerson || '');
    setArrivalDate(application.arrivalDate ? String(application.arrivalDate).slice(0, 10) : '');
    setArrivalFlightNumber(application.arrivalFlightNumber || '');
    setArrivalTime(application.arrivalTime || '');
    setArrivalAirport(application.arrivalAirport || '');
    setMoveDialog({ direction, stage: direction === 'forward' ? nextStage : prevStage });
  };

  const confirmMove = async () => {
    const { direction, stage: target } = moveDialog;
    if (direction === 'back' && !remarks.trim()) {
      toast.error('Please give a reason for moving the student back');
      return;
    }
    if (direction === 'forward' && target === 'Arrival' && (!arrivalPerson.trim() || !arrivalDate || !arrivalFlightNumber.trim() || !arrivalAirport.trim())) {
      toast.error('Who is arriving, the date, the flight number and the airport are required');
      return;
    }
    const payload = { stage: target, remarks: remarks.trim() || undefined };
    if (target === 'Arrival' && direction === 'forward') {
      payload.arrivalPerson = arrivalPerson.trim();
      payload.arrivalDate = arrivalDate;
      payload.arrivalFlightNumber = arrivalFlightNumber.trim();
      payload.arrivalAirport = arrivalAirport.trim();
      if (arrivalTime) payload.arrivalTime = arrivalTime;
    }
    const ok = await run(
      () => applicationAPI.updatePipeline(application.id, payload),
      `Moved to ${PIPELINE_STAGE_LABELS[target]}`
    );
    if (ok) setMoveDialog(null);
  };

  const viewProof = async () => {
    try {
      const res = await applicationAPI.downloadFeeProof(application.id, { inline: true });
      const type = res.headers['content-type'] || 'application/octet-stream';
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type });
      const win = window.open(window.URL.createObjectURL(blob), '_blank');
      if (!win) toast.error('Pop-up blocked. Please allow pop-ups to view the proof.');
    } catch (error) {
      toast.error('Could not open the proof of payment', { description: formatApiError(error) });
    }
  };

  const viewTicket = async () => {
    try {
      const res = await applicationAPI.downloadArrivalTicket(application.id, { inline: true });
      const type = res.headers['content-type'] || 'application/octet-stream';
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type });
      const win = window.open(window.URL.createObjectURL(blob), '_blank');
      if (!win) toast.error('Pop-up blocked. Please allow pop-ups to view the ticket.');
    } catch (error) {
      toast.error('Could not open the arrival ticket', { description: formatApiError(error) });
    }
  };

  const pickTicket = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      e.target.value = '';
      return;
    }
    await run(() => applicationAPI.submitArrivalTicket(application.id, file), 'Arrival ticket uploaded');
    e.target.value = '';
  };

  const pickProof = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      e.target.value = '';
      return;
    }
    setProofFile(file || null);
  };

  const uploadProof = async () => {
    const ok = await run(
      () => applicationAPI.submitFeeProof(application.id, proofFile, proofNote.trim()),
      'Proof of payment uploaded'
    );
    if (ok) {
      setProofFile(null);
      setProofNote('');
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const acceptProof = () =>
    run(() => applicationAPI.reviewFeeProof(application.id, { decision: 'accept' }), 'Fee payment accepted');

  const rejectProof = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please give a reason for rejecting the proof');
      return;
    }
    const ok = await run(
      () => applicationAPI.reviewFeeProof(application.id, { decision: 'reject', remarks: rejectReason.trim() }),
      'Proof of payment rejected'
    );
    if (ok) {
      setRejectOpen(false);
      setRejectReason('');
    }
  };

  const canUploadProof = isOwnerAgent && atRegistration && !invoiced && feeStatus !== 'Accepted';

  return (
    <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden" data-testid="visa-pipeline-panel">
      <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-start justify-between space-y-0 gap-4">
        <div>
          <CardTitle className="text-base font-semibold font-['Outfit'] text-[#111827]">Student progress</CardTitle>
          <CardDescription className="text-xs text-[#6B7280] mt-0.5">
            {canManage
              ? 'Review the application, then move the student one stage at a time. Fees are confirmed before Visa 100%, which lets the agent raise a commission invoice.'
              : 'Updated by QStudy. You upload the proof of fee payment at Registration.'}
          </CardDescription>
        </div>
        <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shrink-0', display.style)}>
          {display.label}
        </span>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Application review (status and review actions), supplied by the page */}
        {children}

        {/* Stage stepper */}
        <ol className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
          {PIPELINE_STAGES.map((s, i) => {
            const done = i < stageIndex || (s === 'Visa100' && i === stageIndex);
            const current = i === stageIndex;
            return (
              <li
                key={s}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-xs',
                  current ? 'border-[#042C53] bg-[#E6F1FB] text-[#042C53]' : 'border-[#E5E7EB] text-[#6B7280]',
                  done && !current && 'bg-[#EAF3DE] border-[#C0DD97] text-[#27500A]'
                )}
              >
                {/* Heading on top, stage name below */}
                <div className="flex items-start gap-2">
                  {done
                    ? <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    : <span className="w-3.5 h-3.5 shrink-0 mt-0.5 rounded-full border border-current opacity-50" />}
                  <div className="min-w-0">
                    <span className={cn('block leading-tight', current ? 'font-bold' : 'font-semibold')}>
                      {PIPELINE_STAGE_HEADINGS[s]}
                    </span>
                    <span className="block mt-0.5 text-[11px] opacity-80">{PIPELINE_STAGE_LABELS[s]}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {application.arrivalPerson && stageIndex >= PIPELINE_STAGES.indexOf('Arrival') && (
          <p className="text-sm text-[#374151]">
            <span className="font-semibold">Arrival:</span> {application.arrivalPerson}
            {application.arrivalDate ? ` on ${formatDate(application.arrivalDate)}` : ''}
            {application.arrivalFlightNumber ? ` · Flight ${application.arrivalFlightNumber}` : ''}
            {application.arrivalAirport ? ` · ${application.arrivalAirport}` : ''}
            {application.arrivalTime ? ` · ${application.arrivalTime}` : ''}
          </p>
        )}

        {/* Flight ticket / arrival confirmation */}
        {stageIndex >= PIPELINE_STAGES.indexOf('Arrival') && active && (
          <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="arrival-ticket">
            <span className="font-semibold text-[#374151]">Arrival ticket:</span>
            {application.arrivalTicket ? (
              <>
                <span className="text-[#374151] truncate">{application.arrivalTicket.fileName}</span>
                <Button variant="outline" size="sm" onClick={viewTicket}>
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                </Button>
              </>
            ) : (
              <span className="text-[#6B7280]">Not uploaded</span>
            )}
            {(isOwnerAgent || canManage) && !invoiced && (
              <>
                <input ref={ticketInput} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pickTicket} />
                <Button variant="outline" size="sm" disabled={busy} onClick={() => ticketInput.current?.click()}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> {application.arrivalTicket ? 'Replace' : 'Upload'}
                </Button>
              </>
            )}
          </div>
        )}

        {!active && (
          <p className="text-sm text-[#6B7280]">
            This application is {application.status}, so it cannot move through the visa pipeline.
          </p>
        )}

        {/* Head of Admission: move stage */}
        {canManage && active && !invoiced && (
          <div className="flex flex-wrap gap-2">
            {nextStage && (
              <Button size="sm" className="bg-[#042C53] hover:bg-[#0C447C] text-white" disabled={busy || mustReviewFirst} onClick={() => openMove('forward')}>
                Move to {PIPELINE_STAGE_LABELS[nextStage]} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
            {prevStage && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => openMove('back')}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Move back to {PIPELINE_STAGE_LABELS[prevStage]}
              </Button>
            )}
          </div>
        )}
        {canManage && active && mustReviewFirst && (
          <p className="text-xs text-[#6B7280]">Start the application review first. Then the student can move to {PIPELINE_STAGE_LABELS[nextStage]}.</p>
        )}
        {invoiced && (
          <p className="text-sm text-[#6B7280]">This application has been invoiced, so its stage can no longer change.</p>
        )}

        {/* Fees */}
        {feeSectionVisible && (
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-3" data-testid="fee-payment-section">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#111827]">Fee payment</p>
              <span className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-full',
                feeStatus === 'Accepted' ? 'bg-[#EAF3DE] text-[#27500A]' : feeStatus === 'Rejected' ? 'bg-[#FCEBEB] text-[#791F1F]' : 'bg-[#FAEEDA] text-[#633806]'
              )}>
                {feeStatus === 'Accepted' ? 'Fees Paid' : feeStatus === 'ProofSubmitted' ? 'Pending review' : 'Pending Fees'}
              </span>
            </div>
            <p className="text-xs text-[#6B7280]">{FEE_STATUS_LABELS[feeStatus]}</p>

            {feeStatus === 'Rejected' && application.feeRemarks && (
              <p className="text-sm bg-red-50 border border-red-100 text-red-800 p-3 rounded-lg">
                <span className="font-semibold">Rejected: </span>{application.feeRemarks}
              </p>
            )}

            {application.feeProof && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-[#374151] truncate">
                  {application.feeProof.fileName}
                  {application.feeProof.uploadedAt ? ` · uploaded ${formatDate(application.feeProof.uploadedAt)}` : ''}
                  {application.feeProof.note ? ` · "${application.feeProof.note}"` : ''}
                </span>
                <Button variant="outline" size="sm" onClick={viewProof}>
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> View proof
                </Button>
              </div>
            )}

            {/* Head of Admission: check the payment */}
            {canManage && feeStatus === 'ProofSubmitted' && !invoiced && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" className="bg-[#27500A] hover:bg-[#1f3b08] text-white" disabled={busy} onClick={acceptProof}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Payment received - accept
                </Button>
                <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={busy} onClick={() => setRejectOpen(true)}>
                  <XCircle className="w-4 h-4 mr-1.5" /> Reject proof
                </Button>
              </div>
            )}

            {/* Agent: upload the proof */}
            {canUploadProof && (
              <div className="space-y-2 pt-1" data-testid="fee-proof-upload">
                <Label className="text-xs font-semibold text-[#374151]">
                  {application.feeProof ? 'Upload a new proof of payment' : 'Upload proof of fee payment'}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                  <Input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={pickProof} />
                  <Input placeholder="Note (optional)" value={proofNote} onChange={(e) => setProofNote(e.target.value)} />
                  <Button size="sm" disabled={!proofFile || busy} onClick={uploadProof} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
                    <Upload className="w-4 h-4 mr-1.5" /> {busy ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
                <p className="text-[11px] text-[#6B7280]">PDF, JPG or PNG, up to 10MB. QStudy checks that the payment was received.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Move stage dialog */}
      <Dialog open={!!moveDialog} onOpenChange={(open) => !open && setMoveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Outfit']">
              {moveDialog?.direction === 'back' ? 'Move back to' : 'Move to'} {moveDialog && PIPELINE_STAGE_LABELS[moveDialog.stage]}
            </DialogTitle>
            <DialogDescription>
              {application.applicationNumber}{application.student?.name ? ` · ${application.student.name}` : ''}. The agent is notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {moveDialog?.direction === 'forward' && moveDialog.stage === 'Arrival' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="arrivalPerson">Who is arriving</Label>
                  <Input id="arrivalPerson" value={arrivalPerson} onChange={(e) => setArrivalPerson(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="arrivalDate">Arrival date</Label>
                  <Input id="arrivalDate" type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="arrivalFlightNumber">Flight number</Label>
                    <Input id="arrivalFlightNumber" value={arrivalFlightNumber} onChange={(e) => setArrivalFlightNumber(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="arrivalTime">Arrival time (optional)</Label>
                    <Input id="arrivalTime" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="arrivalAirport">Arrival airport</Label>
                  <Input id="arrivalAirport" value={arrivalAirport} onChange={(e) => setArrivalAirport(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="moveRemarks">{moveDialog?.direction === 'back' ? 'Reason (required)' : 'Note (optional)'}</Label>
              <Textarea id="moveRemarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog(null)} disabled={busy}>Cancel</Button>
            <Button onClick={confirmMove} disabled={busy} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
              {busy ? 'Saving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject proof dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Outfit']">Reject proof of payment</DialogTitle>
            <DialogDescription>The agent is told the reason and can upload a new proof.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rejectReason">Reason</Label>
            <Textarea id="rejectReason" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={rejectProof} disabled={busy} className="bg-red-600 hover:bg-red-700 text-white">Reject proof</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VisaPipelinePanel;
