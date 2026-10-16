import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const ACTIONS = {
  'request-correction': {
    title: 'Request changes',
    description: 'Tell the agent what to correct. They can edit their application and resubmit.',
    remarksLabel: 'What needs to change?',
    remarksRequired: true,
    confirm: 'Send back to agent',
    success: 'Changes requested',
  },
  verify: {
    title: 'Verify application',
    description: 'All required documents must already be approved. The Head of Admission is notified to approve.',
    remarksLabel: 'Note (optional)',
    remarksRequired: false,
    confirm: 'Verify application',
    success: 'Application verified',
  },
  approve: {
    title: 'Approve application',
    description: 'This is the final approval. The agent is notified.',
    remarksLabel: 'Note (optional)',
    remarksRequired: false,
    confirm: 'Approve agent',
    success: 'Agent approved',
  },
  reject: {
    title: 'Reject application',
    description: 'The agent is told the reason you give here.',
    remarksLabel: 'Reason for rejection',
    remarksRequired: true,
    confirm: 'Reject application',
    success: 'Application rejected',
    destructive: true,
  },
};

/**
 * Remarks dialog for review actions that need or accept a note.
 * `action` is one of request-correction | verify | approve | reject; null closes it.
 */
const AgentReviewDialog = ({ agent, action, onClose }) => {
  const { reviewAgentOnboarding } = useData();
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const config = ACTIONS[action];

  useEffect(() => {
    setRemarks('');
  }, [action, agent?.id]);

  if (!config || !agent) return null;

  const handleConfirm = async () => {
    if (config.remarksRequired && !remarks.trim()) {
      toast.error(`${config.remarksLabel} is required`);
      return;
    }
    setSubmitting(true);
    try {
      await reviewAgentOnboarding(agent.id, action, { remarks: remarks.trim() });
      toast.success(config.success, { description: agent.name });
      onClose();
    } catch {
      // reviewAgentOnboarding already showed the error toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!action} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="agent-review-dialog">
        <DialogHeader>
          <DialogTitle className="font-['Outfit']">{config.title}</DialogTitle>
          <DialogDescription>
            {agent.name}{agent.agencyName ? ` · ${agent.agencyName}` : ''}. {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="review-remarks" className="text-sm font-medium">{config.remarksLabel}</label>
          <textarea
            id="review-remarks"
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:ring-2 focus:ring-primary outline-none resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className={config.destructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#042C53] hover:bg-[#0C447C] text-white'}
          >
            {submitting ? 'Working...' : config.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgentReviewDialog;
