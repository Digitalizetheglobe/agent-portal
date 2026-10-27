import React from 'react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { getReviewActions } from '../../utils/onboarding';

const KIND_STYLE = {
  primary: 'bg-[#042C53] hover:bg-[#0C447C] text-white hover:text-white border-transparent',
  success: 'bg-[#27500A] hover:bg-[#1f3b08] text-white hover:text-white border-transparent',
  warn: 'bg-white border-orange-200 text-orange-800 hover:bg-orange-50 hover:text-orange-900',
  danger: 'bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800',
};

const SUCCESS_TOAST = {
  'start-review': 'Review started',
  recommend: 'Agent recommended',
};

/**
 * The review actions the signed-in staff member may take on this agent right now
 * (start review / recommend / verify / approve / request changes / reject).
 * Actions that need remarks go through `onOpenDialog(action)`; the rest run immediately.
 */
const ReviewActionButtons = ({ agent, onOpenDialog, className, buttonClassName }) => {
  const { reviewAgentOnboarding } = useData();
  const { user } = useAuth();
  const actions = getReviewActions(user, agent);

  if (!actions.length) return null;

  const run = async (a) => {
    if (!a.direct) return onOpenDialog(a.action);
    try {
      await reviewAgentOnboarding(agent.id, a.action);
      toast.success(SUCCESS_TOAST[a.action] || 'Done', { description: agent.name });
    } catch {
      // reviewAgentOnboarding already showed the error toast
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {actions.map((a) => (
        <Button
          key={a.action}
          size="sm"
          variant="outline"
          className={cn(KIND_STYLE[a.kind], buttonClassName)}
          onClick={() => run(a)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
};

export default ReviewActionButtons;
