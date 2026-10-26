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

const today = () => new Date().toISOString().slice(0, 10);

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
