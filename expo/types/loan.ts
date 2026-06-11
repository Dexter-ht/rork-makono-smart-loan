export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  isAdmin?: boolean;
  role?: 'super_admin' | 'admin_viewer' | 'user';
  invitedBy?: string;
  createdAt: string;
  notificationPreferences?: NotificationPreferences;
}

export interface OTP {
  userId: string;
  code: string;
  expiresAt: string;
  verified: boolean;
}

export interface LoanApplication {
  id: string;
  userId: string;
  amount: number;
  repaymentPeriod: number;
  loanType: string;
  purpose: string;
  interestRate: number;
  totalPayable: number;
  monthlyPayment: number;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'active' | 'overdue' | 'completed';
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  disbursedAt?: string;
  dueDate?: string;
  securityDocsRequested?: boolean;
  securityDocsSubmitted?: boolean;
  paymentProofUploaded?: boolean;
  paymentAcknowledged?: boolean;
  latePaymentPenalty?: number;
  isOverdue?: boolean;
  remindersSent?: number;
  lastReminderAt?: string;
  totalPaidSoFar?: number;
  remainingBalance?: number;
  rolloverId?: string;
  isRollover?: boolean;
}

export interface Document {
  id: string;
  userId: string;
  loanId?: string;
  type: 'id' | 'payslip' | 'collateral' | 'security' | 'payment_proof';
  uri: string;
  fileName: string;
  uploadedAt: string;
  isRequested?: boolean;
  requestedBy?: string;
}

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface LoanCalculation {
  loanAmount: number;
  interestRate: number;
  months: number;
  monthlyPayment: number;
  totalPayable: number;
  totalInterest: number;
  amortizationSchedule: AmortizationEntry[];
}

export interface RepaymentSchedule {
  loanId: string;
  schedule: AmortizationEntry[];
  paidMonths: number[];
  nextPaymentDate?: string;
  totalPaid?: number;
}

export interface PaymentRecord {
  id: string;
  loanId: string;
  userId: string;
  amount: number;
  proofUri?: string;
  proofFileName?: string;
  isPartial: boolean;
  remainingAfter: number;
  rolloverCalculated: boolean;
  rolloverRemaining?: number;
  rolloverInterest?: number;
  rolloverTotalPayable?: number;
  rolloverDueDate?: string;
  paidAt: string;
}

export interface RolloverLoan {
  originalLoanId: string;
  rolloverLoanId: string;
  originalAmount: number;
  paidAmount: number;
  remainingPrincipal: number;
  rolloverInterest: number;
  rolloverTotalPayable: number;
  rolloverPeriod: number;
  rolloverMonthlyPayment: number;
  reason: 'partial_payment';
  calculatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  loanId?: string;
  type: 'loan_approved' | 'loan_disbursed' | 'payment_reminder' | 'payment_overdue' | 'partial_payment' | 'rollover';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface LoanHistory {
  loanId: string;
  userId: string;
  loanType: string;
  amount: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  totalPaid?: number;
}
