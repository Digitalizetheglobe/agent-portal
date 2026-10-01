import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, FileText, CheckCircle2, Clock } from 'lucide-react';
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

/**
 * VisitModal handles both scheduling a university visit and completing it.
 */
const VisitModal = ({
  open,
  onOpenChange,
  mode = 'schedule',
  application,
  existingVisit,
  onSuccess
}) => {
  const isSchedule = mode === 'schedule';
  const appId = application?.id || application?._id;

  const [visitDate, setVisitDate] = useState('');
  const [visitLocation, setVisitLocation] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setFormError('');
      if (isSchedule) {
        if (existingVisit?.visitDate) {
          const d = new Date(existingVisit.visitDate);
          setVisitDate(d.toISOString().slice(0, 16));
        } else {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(10, 0, 0, 0);
          setVisitDate(tomorrow.toISOString().slice(0, 16));
        }
        setVisitLocation(existingVisit?.visitLocation || (application?.university?.name ? `${application.university.name} Main Campus` : ''));
        setVisitNotes(existingVisit?.visitNotes || '');
      } else {
        setVisitNotes(existingVisit?.visitNotes || '');
      }
    }
  }, [open, isSchedule, existingVisit, application]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appId) return;

    setFormError('');

    if (isSchedule) {
      if (!visitDate) {
        setFormError('Please select a scheduled visit date and time.');
        return;
      }
      const parsedDate = new Date(visitDate);
      if (isNaN(parsedDate.getTime())) {
        setFormError('Invalid date format.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSchedule) {
        await admissionTrackingAPI.scheduleVisit(appId, {
          visitDate: new Date(visitDate).toISOString(),
          visitLocation: visitLocation.trim() || undefined,
          visitNotes: visitNotes.trim() || undefined
        });
        toast.success('Campus visit scheduled successfully');
      } else {
        await admissionTrackingAPI.completeVisit(appId, {
          visitNotes: visitNotes.trim() || undefined
        });
        toast.success('Campus visit marked as completed');
      }

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Visit operation error:', err);
      const msg = formatApiError(err);
      setFormError(msg);
      toast.error(isSchedule ? 'Failed to schedule visit' : 'Failed to complete visit', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#042C53]/5 flex items-center justify-center text-[#042C53]">
              {isSchedule ? <Calendar className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                {isSchedule ? 'Schedule Campus Visit' : 'Complete Campus Visit'}
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

            {isSchedule ? (
              <>
                {/* Visit Date & Time */}
                <div className="space-y-1.5">
                  <Label htmlFor="visitDate" className="text-xs font-semibold text-gray-700">
                    Visit Date & Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="visitDate"
                    type="datetime-local"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    required
                    className="text-xs h-9 bg-white"
                  />
                </div>

                {/* Visit Location */}
                <div className="space-y-1.5">
                  <Label htmlFor="visitLocation" className="text-xs font-semibold text-gray-700">
                    Visit Location / Building
                  </Label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                    <Input
                      id="visitLocation"
                      type="text"
                      placeholder="e.g. Main Admissions Office, Room 204"
                      value={visitLocation}
                      onChange={(e) => setVisitLocation(e.target.value)}
                      className="text-xs h-9 pl-8 bg-white"
                    />
                  </div>
                </div>

                {/* Visit Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="visitNotes" className="text-xs font-semibold text-gray-700">
                    Visit Instructions & Notes
                  </Label>
                  <Textarea
                    id="visitNotes"
                    rows={3}
                    placeholder="Visitor passes, designated contact person, interview itinerary..."
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    className="text-xs resize-none bg-white"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Completion Overview */}
                <div className="p-4 bg-white border border-[#E5E7EB] rounded-xl text-xs space-y-1.5">
                  <div className="font-bold text-[#111827] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#042C53]" /> Scheduled Visit Details
                  </div>
                  <p className="text-[#4B5563]">
                    Date: <span className="font-semibold text-[#111827]">{existingVisit?.visitDate ? new Date(existingVisit.visitDate).toLocaleString() : 'Recorded'}</span>
                  </p>
                  {existingVisit?.visitLocation && (
                    <p className="text-[#4B5563]">
                      Location: <span className="font-semibold text-[#111827]">{existingVisit.visitLocation}</span>
                    </p>
                  )}
                </div>

                {/* Completion Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="completionNotes" className="text-xs font-semibold text-gray-700">
                    Visit Outcome & Completion Remarks
                  </Label>
                  <Textarea
                    id="completionNotes"
                    rows={4}
                    placeholder="Provide summary of visit outcomes, candidate interview feedback, or department observations..."
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    className="text-xs resize-none bg-white"
                  />
                </div>
              </>
            )}
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
              {loading
                ? isSchedule ? 'Scheduling...' : 'Completing...'
                : isSchedule ? 'Schedule Campus Visit' : 'Confirm Visit Completed'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VisitModal;
