import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  ShieldCheck
} from 'lucide-react';
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
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { invoiceAPI, formatApiError } from '../../utils/api';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';

/**
 * PayoffSettlementModal allows Admin to record official payment settlement
 * for approved agent commission invoices.
 */
const PayoffSettlementModal = ({
  open,
  onOpenChange,
  invoice,
  onSuccess
}) => {
  const { updateInvoiceStatus, fetchInvoices } = useData();

  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setFormError('');
      setPaymentReference(`PAY-${Date.now().toString().slice(-6)}`);
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setSettlementNotes('Bank wire transfer settlement processed.');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoice?.id) return;

    setFormError('');

    if (!paymentReference.trim()) {
      setFormError('Payment reference / transaction ID is required.');
      return;
    }

    setSubmitting(true);
    try {
      const combinedRemarks = [
        paymentReference.trim() ? `Ref: ${paymentReference.trim()}` : '',
        paymentDate ? `Date: ${paymentDate}` : '',
        settlementNotes.trim() ? `Notes: ${settlementNotes.trim()}` : ''
      ].filter(Boolean).join(' | ');

      await updateInvoiceStatus(invoice.id, {
        status: 'Paid',
        remarks: combinedRemarks
      });

      toast.success('Payoff settlement recorded successfully', {
        description: `Commission invoice ${invoice.invoiceNumber} marked as Paid.`
      });

      if (fetchInvoices) {
        await fetchInvoices();
      }

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Payoff settlement error:', err);
      const msg = formatApiError(err);
      setFormError(msg);
      toast.error('Failed to record settlement', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const apps = Array.isArray(invoice?.applications) ? invoice.applications : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EAF3DE] flex items-center justify-center text-[#27500A]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                Execute Commission Payoff
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                Record payment settlement for {invoice?.invoiceNumber || 'Invoice'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 bg-[#F9FAFB] max-h-[70vh] overflow-y-auto space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Payoff Overview Banner */}
            <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Payee Agent</span>
                  <span className="text-sm font-bold text-gray-900 mt-0.5 block">{invoice?.agentId?.agencyName || invoice?.agentId?.name || 'Agent'}</span>
                  <span className="text-xs text-gray-500">{invoice?.agentId?.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Net Payoff Amount</span>
                  <span className="text-2xl font-bold text-[#042C53] font-['Outfit'] block mt-0.5">
                    ${Number(invoice?.amount || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {invoice?.commissionRate ? `${invoice.commissionRate}% Commission` : 'Commission Settled'}
                  </span>
                </div>
              </div>

              {/* Linked Applications preview */}
              {apps.length > 0 && (
                <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
                  <span className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Settling {apps.length} student {apps.length === 1 ? 'enrollment' : 'enrollments'}:
                  </span>
                  <div className="space-y-1">
                    {apps.slice(0, 3).map((a, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px]">
                        <span>{a.student?.name || a.applicationNumber} &bull; {a.university?.name || a.courseName}</span>
                        <span className="font-semibold text-gray-800">{a.tuitionFee ? `$${Number(a.tuitionFee).toLocaleString()}` : 'Unknown'}</span>
                      </div>
                    ))}
                    {apps.length > 3 && (
                      <span className="text-[10px] text-gray-400 italic">+ {apps.length - 3} more applications</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Reference */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentReference" className="text-xs font-semibold text-gray-700">
                Payment Reference / Transaction ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="paymentReference"
                placeholder="e.g. TXN-892348 or WIRE-CHASE-019"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                required
                className="text-xs h-9 bg-white font-mono"
              />
            </div>

            {/* Settlement Date */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentDate" className="text-xs font-semibold text-gray-700">
                Settlement / Transfer Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="text-xs h-9 bg-white"
              />
            </div>

            {/* Settlement Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="settlementNotes" className="text-xs font-semibold text-gray-700">
                Settlement Details / Bank Notes
              </Label>
              <Textarea
                id="settlementNotes"
                rows={2}
                placeholder="Add payment method, receiving agency bank details, or transfer confirmation..."
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
                className="text-xs bg-white resize-none"
              />
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-gray-100 bg-white flex flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !paymentReference.trim()}
              className="text-xs h-9 px-5 bg-[#27500A] hover:bg-[#1E3D07] text-white font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {submitting ? 'Recording Settlement...' : 'Confirm Payout'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PayoffSettlementModal;
