import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2 } from 'lucide-react';
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
import { admissionTrackingAPI, formatApiError } from '../../utils/api';
import { toast } from 'sonner';

// Mirrors the backend deposit lifecycle: Required -> Paid -> Verified | NotVerified
const DEPOSIT_OPTIONS = [
  { value: 'Required', label: 'Required', hint: 'Deposit not yet received' },
  { value: 'Paid', label: 'Paid', hint: 'Received, awaiting verification' },
  { value: 'Verified', label: 'Verified', hint: 'Confirmed. Unlocks enrollment' },
  { value: 'NotVerified', label: 'Not Verified', hint: 'Could not be confirmed' }
];

const DEPOSIT_TRANSITIONS = {
  Required: ['Paid'],
  Paid: ['Required', 'Verified', 'NotVerified'],
  NotVerified: ['Required', 'Paid', 'Verified'],
  Verified: ['Paid', 'NotVerified']
};

/**
 * DepositModal moves the tuition deposit through its lifecycle
 * (Required, Paid, Verified or Not Verified) and records the amount.
 * Enrollment is blocked until the deposit is Verified.
 */
const DepositModal = ({
  open,
  onOpenChange,
  application,
  existingDeposit,
  onSuccess
}) => {
  const appId = application?.id || application?._id;
  const currency = application?.currency || 'USD';
  const currentStatus = existingDeposit?.depositStatus || 'Required';
  const locked = currentStatus === 'Verified' && (application?.status === 'Enrolled' || application?.isInvoiced);

  const [depositStatus, setDepositStatus] = useState(currentStatus);
  const [depositAmount, setDepositAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setFormError('');
      setDepositStatus(existingDeposit?.depositStatus || 'Required');
      setNotes(existingDeposit?.depositNotes || '');
      setDepositAmount(
        existingDeposit?.depositAmount !== undefined && existingDeposit?.depositAmount !== null
          ? String(existingDeposit.depositAmount)
          : ''
      );
    }
  }, [open, existingDeposit]);

  const isSelectable = (value) =>
    !locked && (value === currentStatus || (DEPOSIT_TRANSITIONS[currentStatus] || []).includes(value));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appId) return;

    setFormError('');

    const parsedAmount = depositAmount !== '' ? parseFloat(depositAmount) : null;
    if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
      setFormError('Deposit amount must be a valid number greater than or equal to 0.');
      return;
    }
    if (depositStatus === 'Verified' && !(parsedAmount > 0)) {
      setFormError('Record the deposit amount before verifying the deposit.');
      return;
    }
    if (depositStatus === 'NotVerified' && !notes.trim()) {
      setFormError('Add a reason when marking the deposit as Not Verified.');
      return;
    }

    setLoading(true);
    try {
      await admissionTrackingAPI.updateDeposit(appId, {
        depositStatus,
        depositAmount: parsedAmount !== null ? parsedAmount : undefined,
        notes: notes.trim() || undefined
      });

      toast.success('Deposit information updated successfully');
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Deposit update error:', err);
      const msg = formatApiError(err);
      setFormError(msg);
      toast.error('Failed to update deposit information', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#042C53]/5 flex items-center justify-center text-[#042C53]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                Tuition Deposit
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                Application: <span className="font-semibold text-gray-700">{application?.applicationNumber || appId}</span> &bull; {application?.student?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 bg-[#F9FAFB] max-h-[70vh] overflow-y-auto space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {formError}
              </div>
            )}

            {locked && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                This deposit is verified and backs an enrollment or invoice, so its status can no longer be changed.
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 block">Deposit Status</Label>
              <div className="grid grid-cols-2 gap-3">
                {DEPOSIT_OPTIONS.map((opt) => {
                  const selected = depositStatus === opt.value;
                  const selectable = isSelectable(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!selectable}
                      onClick={() => setDepositStatus(opt.value)}
                      className={`p-3.5 rounded-xl border text-left text-xs transition-all ${
                        selected
                          ? 'border-[#042C53] bg-white ring-2 ring-blue-100 text-[#111827] font-bold shadow-sm'
                          : 'border-[#E5E7EB] bg-white hover:bg-gray-50 text-[#4B5563]'
                      } ${!selectable ? 'opacity-40 cursor-not-allowed hover:bg-white' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt.label}</span>
                        {selected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <span className="text-[10px] text-[#6B7280] font-normal block mt-0.5">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="depositAmount" className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span>Deposit Amount{depositStatus === 'Verified' && <span className="text-red-500"> *</span>}</span>
                <span className="text-[10px] font-normal text-[#6B7280]">Currency: {currency}</span>
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-xs font-bold text-gray-500">
                  {currency}
                </div>
                <Input
                  id="depositAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 2500.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  disabled={locked}
                  className="text-xs h-9 pl-12 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="depositNotes" className="text-xs font-semibold text-gray-700">
                Notes{depositStatus === 'NotVerified' && <span className="text-red-500"> * (reason required)</span>}
              </Label>
              <Textarea
                id="depositNotes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={locked}
                placeholder="Bank reference, university confirmation, or the reason it could not be verified"
                className="text-xs bg-white resize-none"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-white border-t border-gray-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs h-9 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || locked}
              className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs h-9 font-semibold px-4"
            >
              {loading ? 'Saving...' : 'Save Deposit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
