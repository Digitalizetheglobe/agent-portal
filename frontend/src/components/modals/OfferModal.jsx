import React, { useState, useEffect } from 'react';
import { Award, AlertTriangle, FileText, Link2, CheckCircle2 } from 'lucide-react';
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
import { Badge } from '../ui/badge';
import { admissionTrackingAPI, formatApiError } from '../../utils/api';
import { toast } from 'sonner';

/**
 * OfferModal handles issuing both Unconditional and Conditional Offers.
 */
const OfferModal = ({
  open,
  onOpenChange,
  type = 'unconditional',
  application,
  existingOffer,
  onSuccess
}) => {
  const isConditional = type === 'conditional';
  const appId = application?.id || application?._id;

  const [offerDate, setOfferDate] = useState('');
  const [offerLetterUrl, setOfferLetterUrl] = useState('');
  const [offerConditions, setOfferConditions] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setFormError('');
      if (existingOffer?.offerDate) {
        setOfferDate(new Date(existingOffer.offerDate).toISOString().slice(0, 10));
      } else {
        setOfferDate(new Date().toISOString().slice(0, 10));
      }
      setOfferLetterUrl(existingOffer?.offerLetterUrl || '');
      setOfferConditions(existingOffer?.offerConditions || '');
    }
  }, [open, existingOffer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appId) return;

    setFormError('');

    if (!offerDate) {
      setFormError('Please provide an official offer date.');
      return;
    }

    if (isConditional && !offerConditions.trim()) {
      setFormError('Please specify the conditions or prerequisites for this conditional offer.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        offerDate: new Date(offerDate).toISOString(),
        offerLetterUrl: offerLetterUrl.trim() || undefined,
        offerConditions: offerConditions.trim() || undefined
      };

      if (isConditional) {
        await admissionTrackingAPI.createConditionalOffer(appId, payload);
        toast.success('Conditional offer recorded successfully');
      } else {
        await admissionTrackingAPI.createOffer(appId, payload);
        toast.success('University offer recorded successfully');
      }

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Offer recording error:', err);
      const msg = formatApiError(err);
      setFormError(msg);
      toast.error('Failed to record university offer', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isConditional ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isConditional ? <AlertTriangle className="w-5 h-5" /> : <Award className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                  {isConditional ? 'Issue Conditional Offer' : 'Issue University Offer'}
                </DialogTitle>
                <Badge
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isConditional
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-[#EAF3DE] text-[#27500A] border-[#C0DD97]'
                  }`}
                >
                  {isConditional ? 'Conditional' : 'Unconditional'}
                </Badge>
              </div>
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

            {isConditional ? (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Notice:</strong> This issues a <strong>Conditional Offer</strong>. The candidate must fulfill the academic, language, or document requirements detailed below before confirming admission.
                </span>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Issuing an <strong>Unconditional Offer</strong> indicates full acceptance by the partner university without outstanding entry prerequisites.
                </span>
              </div>
            )}

            {/* Offer Date */}
            <div className="space-y-1.5">
              <Label htmlFor="offerDate" className="text-xs font-semibold text-gray-700">
                Offer Letter Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="offerDate"
                type="date"
                value={offerDate}
                onChange={(e) => setOfferDate(e.target.value)}
                required
                className="text-xs h-9 bg-white"
              />
            </div>

            {/* Offer Letter Document URL */}
            <div className="space-y-1.5">
              <Label htmlFor="offerLetterUrl" className="text-xs font-semibold text-gray-700">
                Official Offer Letter Document / URL
              </Label>
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="offerLetterUrl"
                  type="text"
                  placeholder="https://storage.qstudy.com/offers/... or document link"
                  value={offerLetterUrl}
                  onChange={(e) => setOfferLetterUrl(e.target.value)}
                  className="text-xs h-9 pl-8 bg-white"
                />
              </div>
            </div>

            {/* Offer Conditions / Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="offerConditions" className="text-xs font-semibold text-gray-700">
                {isConditional ? 'Prerequisite Conditions & Requirements' : 'Offer Remarks & Details'}
                {isConditional && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="offerConditions"
                rows={3}
                placeholder={
                  isConditional
                    ? "e.g. 'Must submit verified Bachelor transcript with minimum 3.0 GPA and official IELTS 6.5 certificate by August 15, 2026.'"
                    : "Scholarship mentions, deposit deadline, orientation dates..."
                }
                value={offerConditions}
                onChange={(e) => setOfferConditions(e.target.value)}
                required={isConditional}
                className="text-xs resize-none bg-white"
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
              disabled={loading}
              className={`text-white text-xs h-9 font-semibold px-4 ${
                isConditional
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#042C53] hover:bg-[#0C447C]'
              }`}
            >
              {loading
                ? 'Recording...'
                : isConditional
                ? 'Confirm Conditional Offer'
                : 'Confirm Offer Received'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OfferModal;
