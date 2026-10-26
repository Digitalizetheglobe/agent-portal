import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Building2, Undo2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { payoffAPI, formatApiError } from '../../utils/api';
import { currencyLabel, formatMoney, PAYMENT_TERM_OPTIONS } from '../../utils/invoiceStage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const daysSince = (d) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : null);
const th = 'text-[10px] text-[#6B7280] font-bold px-4 py-3 uppercase tracking-wider whitespace-nowrap';

// Oldest first, the same way the server spreads a payment
const previewAllocation = (lines, amount) => {
  let left = Math.round(amount * 100) / 100;
  return lines.map((line) => {
    const part = Math.max(0, Math.min(left, line.outstanding));
    left = Math.round((left - part) * 100) / 100;
    return { ...line, part };
  });
};

/**
 * Record a payment from one university, in the currency it paid in. The amount is spread over the
 * university's payoffs (oldest first) and lowers its balance.
 */
const RecordPaymentDialog = ({ row, onClose, onDone }) => {
  const [amount, setAmount] = useState('');
  const [receivedAt, setReceivedAt] = useState(today());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [termDays, setTermDays] = useState('14');
  const [chosen, setChosen] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  const open = !!row;
  const owing = useMemo(() => (row?.payoffs || []).filter((p) => p.outstanding > 0.005), [row]);

  useEffect(() => {
    if (!row) return;
    setAmount(String(row.balance));
    setReceivedAt(today());
    setReference('');
    setNotes('');
    setTermDays('14');
    setChosen(new Set(owing.map((p) => p.payoffId)));
  }, [row, owing]);

  const selected = owing.filter((p) => chosen.has(p.payoffId));
  const selectedOwed = Math.round(selected.reduce((s, p) => s + p.outstanding, 0) * 100) / 100;
  const value = parseFloat(amount);
  const valid = Number.isFinite(value) && value > 0;
  const preview = valid ? previewAllocation(selected, value) : [];
  const balanceAfter = valid ? Math.round((row.balance - Math.min(value, selectedOwed)) * 100) / 100 : row?.balance;

  const toggle = (id) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return toast.error('Enter the amount the university paid');
    if (!reference.trim()) return toast.error('A payment reference is required');
    if (selected.length === 0) return toast.error('Choose at least one payoff');
    if (value > selectedOwed + 0.005) {
      return toast.error(`More than owed`, { description: `The chosen payoffs total ${formatMoney(selectedOwed, row.currency)}.` });
    }
    setSubmitting(true);
    try {
      await payoffAPI.recordReceivablePayment({
        universityId: row.universityId,
        currency: row.currency,
        amount: value,
        receivedAt,
        reference: reference.trim(),
        notes: notes.trim() || undefined,
        paymentTermDays: Number(termDays),
        payoffIds: selected.length === owing.length ? undefined : selected.map((p) => p.payoffId),
      });
      toast.success('University payment recorded', { description: `${row.universityName}: ${formatMoney(value, row.currency)}` });
      onDone();
      onClose();
    } catch (error) {
      toast.error('Failed to record the university payment', { description: formatApiError(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" data-testid="university-payment-dialog">
        <DialogHeader>
          <DialogTitle className="font-['Outfit']">{row?.universityName} paid QStudy</DialogTitle>
          <DialogDescription>
            Paid in <strong>{row && currencyLabel(row.currency)}</strong>. It still owes{' '}
            <strong>{row && formatMoney(row.balance, row.currency)}</strong>. The amount is spread over its payoffs, oldest first.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="recvAmount">Amount received ({row && currencyLabel(row.currency)})</Label>
              <Input id="recvAmount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recvDate">Date received</Label>
              <Input id="recvDate" type="date" max={today()} value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="recvRef">Payment reference</Label>
              <Input id="recvRef" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank reference or transfer ID" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recvTerm">Payment term for the agents</Label>
              <select id="recvTerm" value={termDays} onChange={(e) => setTermDays(e.target.value)} className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm">
                {PAYMENT_TERM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Which payoffs does this cover?</Label>
            <div className="rounded-lg border border-[#E5E7EB] divide-y divide-[#F3F4F6] max-h-52 overflow-y-auto">
              {owing.map((p) => {
                const share = preview.find((x) => x.payoffId === p.payoffId)?.part || 0;
                return (
                  <label key={p.payoffId} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[#F9FAFB]">
                    <input type="checkbox" checked={chosen.has(p.payoffId)} onChange={() => toggle(p.payoffId)} className="h-3.5 w-3.5 accent-[#042C53]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#111827] truncate">
                        {p.payoffNumber} · {p.agent?.agencyName || p.agent?.name || 'Agent'}
                      </p>
                      <p className="text-[11px] text-[#6B7280] truncate">{p.students.map((s) => s.name).join(', ')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold tabular-nums">{formatMoney(p.outstanding, row.currency)}</p>
                      {share > 0 && <p className="text-[10px] font-semibold text-[#27500A]">pays {formatMoney(share, row.currency)}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-[#6B7280]">
              Balance after this payment: <strong>{row && formatMoney(balanceAfter, row.currency)}</strong>
              {valid && value > selectedOwed + 0.005 && <span className="text-[#791F1F] font-semibold"> · more than the chosen payoffs owe</span>}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recvNotes">Notes (optional)</Label>
            <Textarea id="recvNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
              {submitting ? 'Saving...' : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** Reverse a payment entered by mistake. The reason is kept in the history. */
const ReversePaymentDialog = ({ payment, row, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (payment) setReason(''); }, [payment]);

  const submit = async () => {
    if (!reason.trim()) return toast.error('A reason for the reversal is required');
    setSubmitting(true);
    try {
      await payoffAPI.reverseReceivablePayment(payment.id, { reason: reason.trim() });
      toast.success('Payment reversed', { description: 'The balance was restored.' });
      onDone();
      onClose();
    } catch (error) {
      toast.error('Could not reverse the payment', { description: formatApiError(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-['Outfit']">Reverse this payment?</DialogTitle>
          <DialogDescription>
            {payment && `${formatMoney(payment.amount, payment.currency)} from ${row?.universityName}, ref ${payment.reference}. The balance goes back up and the affected payoffs wait for the university again.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reverseReason">Reason</Label>
          <Textarea id="reverseReason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Keep payment</Button>
          <Button onClick={submit} disabled={submitting} className="bg-[#791F1F] hover:bg-[#5F1818] text-white">
            {submitting ? 'Reversing...' : 'Reverse payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * What each university owes QStudy: students enrolled, the programme total, the commission to collect,
 * what was received and what is left. Fully paid universities are marked Done.
 */
const UniversityReceivablesTab = ({ rows, canRecord, canAuthorizeException, onAllowException, searchTerm = '', onChanged }) => {
  const [expanded, setExpanded] = useState(() => new Set());
  const [showDone, setShowDone] = useState(false);
  const [recording, setRecording] = useState(null);
  const [reversing, setReversing] = useState(null);

  const refresh = async () => {
    if (onChanged) await onChanged();
  };

  const term = searchTerm.trim().toLowerCase();
  const matches = (r) => !term
    || r.universityName.toLowerCase().includes(term)
    || (r.country || '').toLowerCase().includes(term)
    || r.payoffs.some((p) => (p.payoffNumber || '').toLowerCase().includes(term)
      || (p.agent?.agencyName || p.agent?.name || '').toLowerCase().includes(term)
      || p.students.some((s) => s.name.toLowerCase().includes(term)));

  const open = rows.filter((r) => !r.done && matches(r));
  const done = rows.filter((r) => r.done && matches(r));
  const visible = showDone ? [...open, ...done] : open;

  const toggleRow = (key) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[#6B7280]">
        <span>{open.length} {open.length === 1 ? 'university owes' : 'universities owe'} QStudy</span>
        <button type="button" onClick={() => setShowDone((v) => !v)} className="font-semibold text-[#042C53] hover:underline">
          {showDone ? 'Hide' : 'Show'} fully paid universities ({done.length})
        </button>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
              <TableHead className="w-8" />
              <TableHead className={`${th} text-left`}>University</TableHead>
              <TableHead className={`${th} text-center`}>Students</TableHead>
              <TableHead className={`${th} text-right`}>Programme total</TableHead>
              <TableHead className={`${th} text-right`}>Commission to collect</TableHead>
              <TableHead className={`${th} text-right`}>Received</TableHead>
              <TableHead className={`${th} text-right`}>Balance</TableHead>
              <TableHead className={`${th} text-center`}>Status</TableHead>
              <TableHead className={`${th} text-center`}>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-[#6B7280]">
                  <Building2 className="w-10 h-10 opacity-20 mx-auto mb-2" />
                  <p className="text-sm font-medium">{rows.length === 0 ? 'No approved invoices yet, so no university owes QStudy.' : 'No university is waiting to pay.'}</p>
                </TableCell>
              </TableRow>
            ) : visible.map((r) => {
              const key = `${r.universityId}|${r.currency}`;
              const isOpen = expanded.has(key);
              const waiting = daysSince(r.waitingSince);
              const part = !r.done && r.received > 0;
              return (
                <React.Fragment key={key}>
                  <TableRow className="hover:bg-[#F9FAFB] border-b border-[#F3F4F6] cursor-pointer" onClick={() => toggleRow(key)}>
                    <TableCell className="pl-3 pr-0">{isOpen ? <ChevronDown className="w-4 h-4 text-[#6B7280]" /> : <ChevronRight className="w-4 h-4 text-[#6B7280]" />}</TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {r.logoUrl && <img src={r.logoUrl} alt="" className="h-7 w-7 rounded object-contain" />}
                        <div className="min-w-0">
                          <p className="font-semibold text-[#111827] truncate">{r.universityName}</p>
                          <p className="text-[11px] text-[#6B7280]">{r.country || '—'} · pays in {currencyLabel(r.currency)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-center font-semibold tabular-nums">{r.studentCount}</TableCell>
                    <TableCell className="px-4 text-right tabular-nums text-[#4B5563]">{formatMoney(r.programmeTotal, r.currency)}</TableCell>
                    <TableCell className="px-4 text-right tabular-nums font-semibold">{formatMoney(r.commissionTotal, r.currency)}</TableCell>
                    <TableCell className="px-4 text-right tabular-nums text-[#27500A]">{formatMoney(r.received, r.currency)}</TableCell>
                    <TableCell className="px-4 text-right tabular-nums font-bold text-[#042C53]">{formatMoney(r.balance, r.currency)}</TableCell>
                    <TableCell className="px-4 text-center">
                      {r.done ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF3DE] text-[#27500A]"><CheckCircle2 className="w-3 h-3" /> Done</span>
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${part ? 'bg-[#E6F1FB] text-[#0C447C]' : 'bg-[#FAEEDA] text-[#633806]'}`}>
                          {part ? 'Part paid' : 'Awaiting payment'}
                        </span>
                      )}
                      {!r.done && waiting !== null && (
                        <p className={`text-[10px] mt-1 ${waiting > 30 ? 'text-[#791F1F] font-semibold' : 'text-[#6B7280]'}`}>waiting {waiting} {waiting === 1 ? 'day' : 'days'}</p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {!r.done && canRecord && (
                        <Button size="sm" className="btn-financial-action text-white bg-[#042C53] hover:bg-[#03223F]" onClick={() => setRecording(r)}>
                          Record payment
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>

                  {isOpen && (
                    <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                      <TableCell colSpan={9} className="px-6 py-4 space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Payoffs behind this balance</p>
                          <div className="rounded-lg border border-[#E5E7EB] bg-white divide-y divide-[#F3F4F6]">
                            {r.payoffs.map((p) => (
                              <div key={p.payoffId} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[#111827]">
                                    <span className="font-mono">{p.payoffNumber}</span> · {p.invoiceNumber || 'Invoice'} · {p.agent?.agencyName || p.agent?.name || 'Agent'}
                                  </p>
                                  <ul className="mt-1 space-y-0.5">
                                    {p.students.map((s, i) => (
                                      <li key={`${s.id}-${i}`} className="text-[11px] text-[#4B5563]">
                                        {s.name}{s.programme ? ` · ${s.programme}` : ''} · {formatMoney(s.tuition, r.currency)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="text-right text-[11px] tabular-nums">
                                  <p>Commission {formatMoney(p.gross, r.currency)}</p>
                                  <p className="text-[#27500A]">Received {formatMoney(p.received, r.currency)}</p>
                                  {p.outstanding > 0.005 && <p className="font-semibold text-[#042C53]">Owed {formatMoney(p.outstanding, r.currency)}</p>}
                                  {p.exceptionAuthorized && <p className="text-[#3C3489] font-semibold">Exception authorised</p>}
                                  {canAuthorizeException && !p.exceptionAuthorized && p.status === 'PENDING' && p.outstanding > 0.005 && (
                                    <button type="button" className="mt-1 text-[#3C3489] font-semibold hover:underline" onClick={() => onAllowException({ id: p.payoffId, payoffNumber: p.payoffNumber })}>
                                      Allow exception
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Payments from this university</p>
                          {r.payments.length === 0 ? (
                            <p className="text-xs text-[#9CA3AF]">No payment recorded yet.</p>
                          ) : (
                            <div className="rounded-lg border border-[#E5E7EB] bg-white divide-y divide-[#F3F4F6]">
                              {r.payments.map((pay) => (
                                <div key={pay.id} className={`px-4 py-2.5 flex items-center justify-between gap-3 ${pay.status === 'REVERSED' ? 'opacity-60' : ''}`}>
                                  <div className="min-w-0 text-xs">
                                    <p className={`font-semibold text-[#111827] ${pay.status === 'REVERSED' ? 'line-through' : ''}`}>
                                      {formatMoney(pay.amount, pay.currency)} · {fmtDate(pay.receivedAt)} · <span className="font-mono">{pay.reference}</span>
                                    </p>
                                    <p className="text-[11px] text-[#6B7280]">
                                      {pay.status === 'REVERSED'
                                        ? `Reversed ${fmtDate(pay.reversedAt)}: ${pay.reversalReason}`
                                        : `Recorded by ${pay.recordedByName || 'staff'}${pay.notes ? ` · ${pay.notes}` : ''}`}
                                    </p>
                                  </div>
                                  {pay.status === 'ACTIVE' && canRecord && (
                                    <Button size="sm" variant="outline" className="btn-financial-action text-[#791F1F] border-[#F2C9C9] hover:bg-[#FCEBEB]" onClick={() => setReversing({ payment: pay, row: r })}>
                                      <Undo2 className="w-3.5 h-3.5 mr-1" /> Reverse
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <RecordPaymentDialog row={recording} onClose={() => setRecording(null)} onDone={refresh} />
      <ReversePaymentDialog payment={reversing?.payment} row={reversing?.row} onClose={() => setReversing(null)} onDone={refresh} />
    </div>
  );
};

export default UniversityReceivablesTab;
