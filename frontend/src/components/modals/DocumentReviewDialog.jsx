import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

const MODES = {
  CorrectionRequired: {
    title: 'Request More Information',
    description: 'Tell the agent what is missing or needs to change. They will be notified and can upload a replacement.',
    placeholder: 'e.g. The passport scan is blurred. Please upload a clear copy of the photo page.',
    confirm: 'Send Request',
    confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white'
  },
  Rejected: {
    title: 'Reject Document',
    description: 'Give the reason for rejecting this document. The agent will be notified.',
    placeholder: 'e.g. Document is not valid for this application.',
    confirm: 'Reject Document',
    confirmClass: 'bg-red-600 hover:bg-red-700 text-white'
  }
};

/**
 * Collects the required remarks for a document review that needs them
 * (More Information Required / Rejected). Replaces window.prompt().
 */
const DocumentReviewDialog = ({ open, onOpenChange, mode, documentLabel, onConfirm }) => {
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const config = MODES[mode] || MODES.CorrectionRequired;

  useEffect(() => {
    if (open) setRemarks('');
  }, [open, mode]);

  const handleConfirm = async () => {
    if (!remarks.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(remarks.trim());
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {documentLabel ? `${documentLabel}: ` : ''}{config.description}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder={config.placeholder}
          className="text-sm resize-none"
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            disabled={!remarks.trim() || submitting}
            onClick={handleConfirm}
            className={config.confirmClass}
          >
            {submitting ? 'Saving...' : config.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentReviewDialog;
