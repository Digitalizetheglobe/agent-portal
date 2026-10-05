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
import { FinancialStatusBadge } from '../common/FinancialStatusBadge';
import { formatCurrency } from '../../utils/financialFormatters';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';

/**
 * PayoffSettlementModal allows Admin to record official offline payment settlement
 * for approved agent commission payoffs.
 */
const PayoffSettlementModal = ({
  open,
  onOpenChange,
  payoff,
  invoice,
  onSuccess
}) => {
  const { settlePayoff, updateInvoiceStatus, fetchInvoices, fetchPayoffs } = useData();

  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [batchReference, setBatchReference] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Target payoff or derived from invoice
  const activePayoff = payoff || invoice?.payoff;
  const activeInvoice = invoice || payoff?.invoiceId;

  useEffect(() => {
    if (open) {
      setFormError('');
      setPaymentReference(`UTR-${Date.now().toString().slice(-6)}`);
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setBatchReference('');
      setSettlementNotes('Bank wire transfer settlement confirmed.');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!paymentReference.trim()) {
      setFormError('Settlement reference / UTR is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (activePayoff?.id) {
        // Direct authoritative Payoff settlement
        await settlePayoff(activePayoff.id, {
          settlementReference: paymentReference.trim(),
          settledAt: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
          settlementNotes: settlementNotes.trim() || undefined,
          batchReference: batchReference.trim() || undefined
        });

        toast.success('Offline settlement recorded successfully', {
          description: `Payoff ${activePayoff.payoffNumber || ''} marked as Settled.`
        });
      } else if (activeInvoice?.id) {
        // Fallback to legacy invoice settlement which auto-settles associated payoff via backend
        const combinedRemarks = [
          paymentReference.trim() ? `Ref: ${paymentReference.trim()}` : '',
          paymentDate ? `Date: ${paymentDate}` : '',
          batchReference.trim() ? `Batch: ${batchReference.trim()}` : '',
          settlementNotes.trim() ? `Notes: ${settlementNotes.trim()}` : ''
        ].filter(Boolean).join(' | ');

        await updateInvoiceStatus(activeInvoice.id, {
          status: 'Paid',
          remarks: combinedRemarks
        });

        toast.success('Payoff settlement recorded successfully', {
          description: `Invoice ${activeInvoice.invoiceNumber} settlement recorded.`
        });
      } else {
        throw new Error('No payoff or invoice provided to settle.');
      }

      if (fetchPayoffs) await fetchPayoffs();
      if (fetchInvoices) await fetchInvoices();

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Payoff settlement error:', err);
      const msg = formatApiError(err);
      setFormError(msg);
      toast.error('Failed to record settlement', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const apps = Array.isArray(activeInvoice?.applications) ? activeInvoice.applications : [];
  const payeeAgent = activePayoff?.agentId || activeInvoice?.agentId;
  const payoffAmount = activePayoff?.netAmount || activePayoff?.grossCommission || activeInvoice?.amount || 0;
  const isTerminal = activePayoff?.status === 'SETTLED' || activePayoff?.status === 'CANCELLED';

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
                Confirm Offline Settlement
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                Record bank transfer details for {activePayoff?.payoffNumber || activeInvoice?.invoiceNumber || 'Payoff'}
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

            {/* Offline Settlement Notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              <span className="font-bold block mb-0.5">Offline Bank Transfer Confirmation</span>
              <span className="text-[11px] text-blue-700">
                This action records that the funds were transferred externally (wire / bank transfer). The system does not process money or integrate with payment gateways.
              </span>
            </div>

            {/* Payoff Overview Banner */}
            <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Payee Agent</span>
                  <span className="text-sm font-bold text-gray-900 mt-0.5 block">{payeeAgent?.agencyName || payeeAgent?.name || 'Agent'}</span>
                  <span className="text-xs text-gray-500">{payeeAgent?.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Net Payoff Amount</span>
                  <span className="text-2xl font-bold text-[#042C53] font-['Outfit'] block mt-0.5 tabular-nums">
                    {formatCurrency(payoffAmount, activePayoff?.currency)}
                  </span>
                  <div className="mt-1 flex justify-end">
                    <FinancialStatusBadge status={activePayoff?.status || 'PENDING'} size="sm" />
                  </div>
                </div>
              </div>

              {/* Linked Applications preview */}
              {apps.length > 0 && (
                <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
                  <span className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Associated {apps.length} student {apps.length === 1 ? 'enrollment' : 'enrollments'}:
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
                Settlement Reference / UTR Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="paymentReference"
                placeholder="e.g. UTR-8923489234 or WIRE-CHASE-019"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                required
                disabled={isTerminal}
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
                disabled={isTerminal}
                className="text-xs h-9 bg-white"
              />
            </div>

            {/* Batch Reference (Optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="batchReference" className="text-xs font-semibold text-gray-700">
                Batch Reference <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="batchReference"
                placeholder="e.g. BATCH-2026-OCT-01"
                value={batchReference}
                onChange={(e) => setBatchReference(e.target.value)}
                disabled={isTerminal}
                className="text-xs h-9 bg-white font-mono"
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
                disabled={isTerminal}
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
              disabled={submitting || isTerminal || !paymentReference.trim()}
              className="text-xs h-9 px-5 bg-[#27500A] hover:bg-[#1E3D07] text-white font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {submitting ? 'Recording Settlement...' : 'Confirm Offline Settlement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PayoffSettlementModal;
