import React from 'react';
import { Badge } from '../ui/badge';
import {
  FINANCIAL_STATUS_CONFIG,
  formatFinancialDate
} from '../../utils/financialFormatters';
import { CheckCircle2, Clock, XCircle, AlertCircle, Ban } from 'lucide-react';

/**
 * Standardized Financial Status Badge Component (FA-4.2)
 * Ensures 100% visual and token consistency across all financial lifecycle statuses.
 */
export const FinancialStatusBadge = ({
  status,
  size = 'md',
  showIcon = true,
  useShortLabel = false,
  customLabel,
  className = ''
}) => {
  const config = FINANCIAL_STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    shortLabel: status || 'Unknown',
    description: '',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: Clock,
    variant: 'default'
  };

  const Icon = config.icon || Clock;
  const label = customLabel || (useShortLabel ? config.shortLabel : config.label);

  const sizeClasses = {
    sm: 'text-[9px] px-2 py-0.2 h-5 tracking-wider',
    md: 'text-[10px] px-2.5 py-0.5 h-6 tracking-wider',
    lg: 'text-[11px] px-3 py-1 h-7 tracking-wide'
  }[size] || 'text-[10px] px-2.5 py-0.5 h-6 tracking-wider';

  const iconSizes = {
    sm: 'w-2.5 h-2.5 mr-1',
    md: 'w-3 h-3 mr-1.2',
    lg: 'w-3.5 h-3.5 mr-1.5'
  }[size] || 'w-3 h-3 mr-1.2';

  return (
    <Badge
      title={config.description}
      className={`rounded-full border font-bold uppercase inline-flex items-center justify-center whitespace-nowrap leading-none transition-colors select-none ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon className={`${iconSizes} shrink-0`} />}
      <span>{label}</span>
    </Badge>
  );
};

/**
 * Hierarchical Financial State Display Component (FA-4.2)
 * Correctly distinguishes Primary Review State from Secondary Payoff Stage and Settlement detail.
 *
 * Example:
 * [Approved] → [Payoff Pending]
 * [Approved] → [Settled Offline · Oct 03, 2026]
 */
export const FinancialStateHierarchy = ({
  reviewStatus,
  payoffStatus,
  settledAt,
  orientation = 'horizontal', // 'horizontal' | 'vertical' | 'stacked'
  size = 'md',
  className = ''
}) => {
  const isApproved = reviewStatus === 'Approved';
  const hasPayoff = Boolean(payoffStatus);

  if (orientation === 'stacked') {
    return (
      <div className={`flex flex-col gap-1 items-start ${className}`}>
        {/* Primary State */}
        <div className="flex items-center gap-1.5">
          <FinancialStatusBadge status={reviewStatus || 'PendingReview'} size={size} />
        </div>

        {/* Secondary Stage (only for approved invoices with associated payoff) */}
        {isApproved && hasPayoff && (
          <div className="flex items-center gap-1 pl-1">
            <span className="text-[10px] text-gray-400 font-medium">↳</span>
            <FinancialStatusBadge status={payoffStatus} size="sm" />
            {payoffStatus === 'SETTLED' && settledAt && (
              <span className="text-[10px] text-gray-500 font-medium font-['Outfit'] tabular-nums ml-1">
                ({formatFinancialDate(settledAt)})
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* Primary Review State */}
      <FinancialStatusBadge status={reviewStatus || 'PendingReview'} size={size} />

      {/* Secondary Payoff State */}
      {isApproved && hasPayoff && (
        <>
          <span className="text-gray-300 text-xs">/</span>
          <FinancialStatusBadge status={payoffStatus} size={size} />
          {payoffStatus === 'SETTLED' && settledAt && (
            <span className="text-[10px] text-[#27500A] font-semibold font-['Outfit'] tabular-nums bg-[#EAF3DE]/60 px-1.5 py-0.5 rounded border border-[#C0DD97]/60">
              {formatFinancialDate(settledAt)}
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default FinancialStatusBadge;
