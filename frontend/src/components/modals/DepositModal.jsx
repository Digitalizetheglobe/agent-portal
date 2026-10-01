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
import { admissionTrackingAPI, formatApiError } from '../../utils/api';
import { toast } from 'sonner';

/**
 * DepositModal handles updating student tuition deposit payment status and amount.
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

  const [depositPaid, setDepositPaid] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setFormError('');
      setDepositPaid(Boolean(existingDeposit?.depositPaid));
      setDepositAmount(
        existingDeposit?.depositAmount !== undefined && existingDeposit?.depositAmount !== null
          ? String(existingDeposit.depositAmount)
          : ''
      );
    }
  }, [open, existingDeposit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appId) return;

    setFormError('');

    if (depositAmount !== '' && depositAmount !== null) {
      const parsed = parseFloat(depositAmount);
      if (isNaN(parsed) || parsed < 0) {
        setFormError('Deposit amount must be a valid number greater than or equal to 0.');
        return;
      }
    }

    setLoading(true);
    try {
      await admissionTrackingAPI.updateDeposit(appId, {
        depositPaid: Boolean(depositPaid),
        depositAmount: depositAmount !== '' ? parseFloat(depositAmount) : undefined
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
      <DialogContent className="max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#042C53]/5 flex items-center justify-center text-[#042C53]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                Tuition Deposit Details
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

            {/* Deposit Paid Toggle */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 block">
                Has Tuition Deposit Been Received?
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDepositPaid(true)}
                  className={`p-3.5 rounded-xl border text-left text-xs transition-all ${
                    depositPaid
                      ? 'border-[#042C53] bg-white ring-2 ring-blue-100 text-[#111827] font-bold shadow-sm'
                      : 'border-[#E5E7EB] bg-white hover:bg-gray-50 text-[#4B5563]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Yes, Paid</span>
                    {depositPaid && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <span className="text-[10px] text-[#6B7280] font-normal block mt-0.5">
                    Deposit received by institution
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDepositPaid(false)}
                  className={`p-3.5 rounded-xl border text-left text-xs transition-all ${
                    !depositPaid
                      ? 'border-gray-400 bg-white ring-2 ring-gray-200 text-[#111827] font-bold shadow-sm'
                      : 'border-[#E5E7EB] bg-white hover:bg-gray-50 text-[#4B5563]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>No, Pending</span>
                    {!depositPaid && <CheckCircle2 className="w-4 h-4 text-gray-500" />}
                  </div>
                  <span className="text-[10px] text-[#6B7280] font-normal block mt-0.5">
                    Deposit not yet received
                  </span>
                </button>
              </div>
            </div>

            {/* Deposit Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="depositAmount" className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span>Deposit Amount</span>
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
                  className="text-xs h-9 pl-12 bg-white"
                />
              </div>
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
              disabled={loading}
              className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs h-9 font-semibold px-4"
            >
              {loading ? 'Saving...' : 'Save Deposit Details'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
