import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { AlertCircle, XCircle } from 'lucide-react';

const StudentRejectionModal = ({
  open,
  onOpenChange,
  studentName = 'Student',
  onConfirm,
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setReason('');
    setError('');
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('A rejection reason is required and cannot be empty.');
      return;
    }
    setError('');
    try {
      await onConfirm(trimmed);
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to reject student');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[480px] p-0 overflow-hidden border border-slate-200 shadow-xl bg-white">
        <DialogHeader className="p-6 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 font-['Outfit']">
                Reject Student Verification
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Provide a mandatory reason for rejecting {studentName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="rejection-reason" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this student cannot be verified (e.g. missing identity docs, mismatch in transcripts, invalid passport)..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                rows={4}
                className="w-full text-sm resize-none focus:border-red-500 focus:ring-red-500"
                disabled={loading}
              />
              <p className="text-[11px] text-slate-400">
                This reason will be recorded in the verification history and visible to the assigned agent.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !reason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4"
            >
              {loading ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StudentRejectionModal;
