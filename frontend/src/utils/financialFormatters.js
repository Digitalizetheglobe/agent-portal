/**
 * Financial Formatters & Token System (FA-4.2)
 * Central source of truth for financial typography, currency representation,
 * date formatting, and status token configurations across Agent & Admin portals.
 */
import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Ban
} from 'lucide-react';

/**
 * Standard currency formatter supporting ISO currency codes and localized tabular grouping.
 * @param {number|string} amount - Monetary amount to format
 * @param {string} [currency='USD'] - 3-letter currency ISO code
 * @param {Object} [options] - Additional formatting options
 * @param {boolean} [options.compact=false] - If true, formats e.g. 15.2k
 * @param {number} [options.minimumFractionDigits=2] - Minimum decimals
 * @returns {string} Formatted currency string (e.g. "$15,000.00")
 */
export const formatCurrency = (amount, currency = 'USD', options = {}) => {
  const num = Number(amount);
  if (isNaN(num)) {
    return '$0.00';
  }

  const { compact = false, minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;

  if (compact && Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(num);
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(num);
  } catch (e) {
    // Fallback if currency code is non-standard
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

/**
 * Standard percentage formatter
 * @param {number|string} rate - Percentage rate (e.g. 12 or 12.5)
 * @returns {string} (e.g. "12.0%")
 */
export const formatPercentage = (rate) => {
  const num = Number(rate);
  if (isNaN(num) || num === null || num === undefined) {
    return '0.0%';
  }
  return `${num.toFixed(1)}%`;
};

/**
 * Standard date formatter for financial audit timestamps
 * @param {string|Date} date - ISO date string or Date object
 * @param {string} [fallback='—'] - Fallback when date is empty or invalid
 * @returns {string} (e.g. "Oct 03, 2026")
 */
export const formatFinancialDate = (date, fallback = '—') => {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(d);
};

/**
 * Standard date-time formatter for immutable financial audit trails
 * @param {string|Date} date
 * @returns {string} (e.g. "Oct 03, 2026 · 02:30 PM")
 */
export const formatFinancialDateTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';

  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(d);

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);

  return `${datePart} · ${timePart}`;
};

/**
 * Visual design tokens for all review, payoff, and payment states.
 */
export const FINANCIAL_STATUS_CONFIG = {
  // Review Statuses (Finance Review Lifecycle)
  PendingReview: {
    label: 'Pending Review',
    shortLabel: 'Pending',
    description: 'Submitted by agent, awaiting initial finance queue triage',
    bg: 'bg-[#FFF8E6]',
    text: 'text-[#8A5000]',
    border: 'border-[#FEE3A2]',
    icon: Clock,
    variant: 'amber'
  },
  UnderReview: {
    label: 'Under Review',
    shortLabel: 'In Review',
    description: 'Finance reviewer is actively auditing documents and milestones',
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1D4ED8]',
    border: 'border-[#BFDBFE]',
    icon: Clock,
    variant: 'blue'
  },
  CorrectionRequired: {
    label: 'Correction Required',
    shortLabel: 'Action Required',
    description: 'Finance returned claim with required changes',
    bg: 'bg-[#FFF4E5]',
    text: 'text-[#B45309]',
    border: 'border-[#FCD34D]',
    icon: AlertCircle,
    variant: 'warning'
  },
  Resubmitted: {
    label: 'Resubmitted',
    shortLabel: 'Resubmitted',
    description: 'Agent corrected remarks/memo and resubmitted for finance triage',
    bg: 'bg-[#FAF5FF]',
    text: 'text-[#6B21A8]',
    border: 'border-[#E9D5FF]',
    icon: Clock,
    variant: 'purple'
  },
  Approved: {
    label: 'Approved',
    shortLabel: 'Approved',
    description: 'Finance review complete; commission snapshot & payoff established',
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#15803D]',
    border: 'border-[#BBF7D0]',
    icon: CheckCircle2,
    variant: 'emerald'
  },
  Rejected: {
    label: 'Rejected',
    shortLabel: 'Rejected',
    description: 'Claim permanently declined by finance review',
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#FECACA]',
    icon: XCircle,
    variant: 'rose'
  },

  // Authoritative Payoff Statuses
  PENDING: {
    label: 'Settlement Pending',
    shortLabel: 'Pending Payoff',
    description: 'Approved commission exists; awaiting offline bank settlement confirmation',
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#92400E]',
    border: 'border-[#FDE68A]',
    icon: Clock,
    variant: 'amber'
  },
  SETTLED: {
    label: 'Settled Offline',
    shortLabel: 'Settled',
    description: 'Offline bank wire/manual transfer confirmed by finance admin',
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#15803D]',
    border: 'border-[#BBF7D0]',
    icon: CheckCircle2,
    variant: 'emerald'
  },
  CANCELLED: {
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    description: 'Payoff record cancelled and voided prior to settlement',
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#FECACA]',
    icon: Ban,
    variant: 'rose'
  },

  // Legacy invoice status mapping for backward compatibility
  Paid: {
    label: 'Settled',
    shortLabel: 'Settled',
    description: 'Settlement completed',
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#15803D]',
    border: 'border-[#BBF7D0]',
    icon: CheckCircle2,
    variant: 'emerald'
  },
  Pending: {
    label: 'Pending',
    shortLabel: 'Pending',
    description: 'Awaiting completion',
    bg: 'bg-[#FFF8E6]',
    text: 'text-[#8A5000]',
    border: 'border-[#FEE3A2]',
    icon: Clock,
    variant: 'amber'
  }
};
