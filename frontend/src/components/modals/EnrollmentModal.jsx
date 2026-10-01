import React, { useState, useEffect } from 'react';
import { CheckCircle2, Link2, Calendar, FileCheck2 } from 'lucide-react';
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
 * EnrollmentModal handles recording official university enrollment.
 */
const EnrollmentModal = ({
  open,
  onOpenChange,
  application,
  existingEnrollment,
  onSuccess
}) => {
  const appId = application?.id || application?._id;

  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [enrollmentProofUrl, setEnrollmentProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setFormError('');
      if (existingEnrollment?.enrollmentDate) {
        setEnrollmentDate(new Date(existingEnrollment.enrollmentDate).toISOString().slice(0, 10));
      } else {
        setEnrollmentDate(new Date().toISOString().slice(0, 10));
      }
      setEnrollmentProofUrl(existingEnrollment?.enrollmentProofUrl || '');
    }
  }, [open, existingEnrollment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appId) return;

    setFormError('');

    if (!enrollmentDate) {
      setFormError('Please select the official enrollment date.');
      return;
    }

    setLoading(true);
    try {
      await admissionTrackingAPI.enroll(appId, {
        enrollmentDate: new Date(enrollmentDate).toISOString(),
        enrollmentProofUrl: enrollmentProofUrl.trim() || undefined
      });

      toast.success('Student enrollment recorded successfully');
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Enrollment recording error:', err);
      const msg = formatApiError(err);
      setFormError(msg);
      toast.error('Failed to record student enrollment', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-700">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                Complete Student Enrollment
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

            <div className="p-3.5 bg-green-50/80 border border-green-200 rounded-xl space-y-1.5 text-xs text-green-900">
              <div className="font-bold flex items-center gap-1.5 text-green-800">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Terminal Enrollment Milestone
              </div>
              <p className="text-[11px] text-green-700 leading-relaxed">
                Recording enrollment locks the application into the <strong>Enrolled</strong> lifecycle state and qualifies it for commission invoicing.
              </p>
            </div>

            {/* Enrollment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="enrollmentDate" className="text-xs font-semibold text-gray-700">
                Official Enrollment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="enrollmentDate"
                type="date"
                value={enrollmentDate}
                onChange={(e) => setEnrollmentDate(e.target.value)}
                required
                className="text-xs h-9 bg-white"
              />
            </div>

            {/* Enrollment Proof URL */}
            <div className="space-y-1.5">
              <Label htmlFor="enrollmentProofUrl" className="text-xs font-semibold text-gray-700">
                Enrollment Proof Document / URL
              </Label>
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="enrollmentProofUrl"
                  type="text"
                  placeholder="https://storage.qstudy.com/enrollment-proof/... or certificate link"
                  value={enrollmentProofUrl}
                  onChange={(e) => setEnrollmentProofUrl(e.target.value)}
                  className="text-xs h-9 pl-8 bg-white"
                />
              </div>
              <span className="text-[10px] text-gray-400 block">
                E.g. Student ID card copy, official matriculation receipt, or university certificate.
              </span>
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
              className="bg-green-700 hover:bg-green-800 text-white text-xs h-9 font-semibold px-4"
            >
              {loading ? 'Recording...' : 'Mark as Officially Enrolled'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EnrollmentModal;
