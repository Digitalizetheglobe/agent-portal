import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useData } from '../../context/DataContext';
import { currencyLabel } from '../../utils/invoiceStage';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Record that the university paid QStudy. Accounts or the Head of Admission do this; it unlocks paying
 * the agent. The payment is in the payoff's currency (USD stays USD, RM stays RM).
 */
export const UniversityPaymentDialog = ({ open, onOpenChange, payoff }) => {
  const { recordUniversityPayment } = useData();
  const [amount, setAmount] = useState('');
  const [receivedAt, setReceivedAt] = useState(today());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currency = payoff?.currency || 'USD';

  useEffect(() => {
    if (!open || !payoff) return;
    setAmount(payoff.universityPaidAmount != null ? String(payoff.universityPaidAmount) : '');
    setReceivedAt(payoff.universityPaidAt ? String(payoff.universityPaidAt).slice(0, 10) : today());
    setReference(payoff.universityPaymentReference || '');
    setNotes(payoff.universityPaymentNotes || '');
  }, [open, payoff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast.error('Enter the amount the university paid');
      return;
    }
    if (!reference.trim()) {
      toast.error('A payment reference is required');
      return;
    }
    setSubmitting(true);
    try {
      await recordUniversityPayment(payoff.id, {
        amount: value,
        currency,
        receivedAt,
        reference: reference.trim(),
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch {
      // error toast already shown
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="university-payment-dialog">
        <DialogHeader>
          <DialogTitle className="font-['Outfit']">University paid QStudy</DialogTitle>
          <DialogDescription>
            {payoff?.payoffNumber}. Recording this lets Accounts pay the agent. The payment is in{' '}
            <strong>{currencyLabel(currency)}</strong>, the same currency the agent is paid in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="uniAmount">Amount received ({currencyLabel(currency)})</Label>
              <Input id="uniAmount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uniDate">Date received</Label>
              <Input id="uniDate" type="date" max={today()} value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uniRef">Payment reference</Label>
            <Input id="uniRef" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank reference or transfer ID" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uniNotes">Notes (optional)</Label>
            <Textarea id="uniNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
              {submitting ? 'Saving...' : payoff?.universityPaid ? 'Update payment' : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Head of Admission (or super admin): let the agent be paid before the university has paid.
 * A note explaining the exception is required and is kept on the payoff.
 */
export const PaymentExceptionDialog = ({ open, onOpenChange, payoff }) => {
  const { authorizePaymentException } = useData();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setNote('');
  }, [open]);

  const handleConfirm = async () => {
    if (!note.trim()) {
      toast.error('A note explaining the exception is required');
      return;
    }
    setSubmitting(true);
    try {
      await authorizePaymentException(payoff.id, { note: note.trim() });
      onOpenChange(false);
    } catch {
      // error toast already shown
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="payment-exception-dialog">
        <DialogHeader>
          <DialogTitle className="font-['Outfit']">Pay before the university has paid</DialogTitle>
          <DialogDescription>
            {payoff?.payoffNumber}. The agent is normally paid only after the university pays QStudy. This lets
            Accounts pay now. Your note and name are kept on the payoff.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="exceptionNote">Why is this an exception?</Label>
          <Textarea id="exceptionNote" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={submitting} className="bg-[#3C3489] hover:bg-[#2d2768] text-white">
            {submitting ? 'Saving...' : 'Allow payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
