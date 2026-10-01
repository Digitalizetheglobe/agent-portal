import React, { useState, useEffect } from 'react';
import { GraduationCap, Link2, Hash, Calendar, CheckCircle2 } from 'lucide-react';
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
 * AdmissionModal handles student admission confirmation.
 */
const AdmissionModal = ({
  open,
  onOpenChange,
  application,
  existingAdmission,
  onSuccess
}) => {
  const appId = application?.id || application?._id;

  const [admissionDate, setAdmissionDate] = useState('');
  const [universityStudentId, setUniversityStudentId] = useState('');
  const [admissionLetterUrl, setAdmissionLetterUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setFormError('');
      if (existingAdmission?.admissionDate) {
        setAdmissionDate(new Date(existingAdmission.admissionDate).toISOString().slice(0, 10));
      } else {
        setAdmissionDate(new Date().toISOString().slice(0, 10));
      }
      setUniversityStudentId(existingAdmission?.universityStudentId || '');
      setAdmissionLetterUrl(existingAdmission?.admissionLetterUrl || '');
    }
  }, [open, existingAdmission]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appId) return;

    setFormError('');

    if (!admissionDate) {
      setFormError('Please specify an official admission date.');
      return;
    }

    setLoading(true);
    try {
      await admissionTrackingAPI.confirmAdmission(appId, {
        admissionDate: new Date(admissionDate).toISOString(),
        admissionLetterUrl: admissionLetterUrl.trim() || undefined,
        universityStudentId: universityStudentId.trim() || undefined
      });

      toast.success('Student admission confirmed successfully');
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Admission confirmation error:', err);
      const msg = formatApiError(err);
      setFormError(msg);
      toast.error('Failed to confirm student admission', { description: msg });
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
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                Confirm University Admission
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

            <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl flex items-start gap-2.5 text-xs text-teal-800">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                Confirming admission formally locks in student acceptance at <strong>{application?.university?.name || 'the university'}</strong> for <strong>{application?.courseName}</strong>.
              </span>
            </div>

            {/* Admission Date */}
            <div className="space-y-1.5">
              <Label htmlFor="admissionDate" className="text-xs font-semibold text-gray-700">
                Admission Confirmation Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="admissionDate"
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                required
                className="text-xs h-9 bg-white"
              />
            </div>

            {/* University Student ID / Roll # */}
            <div className="space-y-1.5">
              <Label htmlFor="universityStudentId" className="text-xs font-semibold text-gray-700">
                University Student ID / Matriculation Number
              </Label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="universityStudentId"
                  type="text"
                  placeholder="e.g. STU-2026-9812 or UO-84729"
                  value={universityStudentId}
                  onChange={(e) => setUniversityStudentId(e.target.value)}
                  className="text-xs h-9 pl-8 bg-white"
                />
              </div>
            </div>

            {/* Admission Confirmation Letter URL */}
            <div className="space-y-1.5">
              <Label htmlFor="admissionLetterUrl" className="text-xs font-semibold text-gray-700">
                Admission Letter / Certificate Document URL
              </Label>
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="admissionLetterUrl"
                  type="text"
                  placeholder="https://storage.qstudy.com/admissions/... or document link"
                  value={admissionLetterUrl}
                  onChange={(e) => setAdmissionLetterUrl(e.target.value)}
                  className="text-xs h-9 pl-8 bg-white"
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
              {loading ? 'Confirming...' : 'Confirm Admission'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdmissionModal;
