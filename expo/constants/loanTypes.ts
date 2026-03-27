export const LOAN_TYPES = [
  { id: 'personal', label: 'Personal Loan', icon: '👤' },
  { id: 'emergency', label: 'Emergency Loan', icon: '🚨' },
] as const;

export const MAX_REPAYMENT_MONTHS = 2;

export const DEFAULT_INTEREST_RATE = 30;

export const LOAN_PURPOSES = [
  'Medical expenses',
  'Business expansion',
  'Education',
  'Home renovation',
  'Debt consolidation',
  'Emergency',
  'Vehicle purchase',
  'Wedding',
  'Other',
] as const;
