import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/src/integrations/supabase/types';
import { LoanApplication, Document, LoanCalculation, AmortizationEntry, RepaymentSchedule, Notification, PaymentRecord, RolloverLoan } from '@/types/loan';
import { DEFAULT_INTEREST_RATE } from '@/constants/loanTypes';
import { useAuth } from './AuthContext';
import {
  sendToAllUserChannels,
  buildDueDateReminderMessage,
  buildOverdueMessage,
  buildApprovalMessage,
  buildDisbursementMessage,
  buildRateChangeMessage,
  buildRolloverMessage,
  buildAdjustmentMessage,
} from '@/services/NotificationService';

type LoanRow = Database['public']['Tables']['loans']['Row'];
type DocumentRow = Database['public']['Tables']['documents']['Row'];

function mapLoanRow(row: LoanRow): LoanApplication {
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number(row.amount),
    repaymentPeriod: row.repayment_period,
    loanType: row.loan_type,
    purpose: row.purpose,
    interestRate: Number(row.interest_rate),
    totalPayable: Number(row.total_payable),
    monthlyPayment: Number(row.monthly_payment),
    status: row.status as LoanApplication['status'],
    createdAt: row.created_at ?? new Date().toISOString(),
    approvedAt: row.approved_at ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    disbursedAt: row.disbursed_at ?? undefined,
    dueDate: row.due_date ?? undefined,
    securityDocsRequested: row.security_docs_requested ?? undefined,
    securityDocsSubmitted: row.security_docs_submitted ?? undefined,
    paymentProofUploaded: row.payment_proof_uploaded ?? undefined,
    paymentAcknowledged: row.payment_acknowledged ?? undefined,
    latePaymentPenalty: row.late_payment_penalty ? Number(row.late_payment_penalty) : undefined,
    isOverdue: row.is_overdue ?? undefined,
    remindersSent: row.reminders_sent ?? undefined,
    lastReminderAt: row.last_reminder_at ?? undefined,
    totalPaidSoFar: row.total_paid_so_far ? Number(row.total_paid_so_far) : undefined,
    remainingBalance: row.remaining_balance ? Number(row.remaining_balance) : undefined,
    rolloverId: row.rollover_id ?? undefined,
    isRollover: row.is_rollover ?? undefined,
  };
}

function mapDocumentRow(row: DocumentRow): Document {
  return {
    id: row.id,
    userId: row.user_id,
    loanId: row.loan_id ?? undefined,
    type: row.type as Document['type'],
    uri: row.uri,
    fileName: row.file_name,
    uploadedAt: row.uploaded_at ?? new Date().toISOString(),
    isRequested: row.is_requested ?? undefined,
    requestedBy: row.requested_by ?? undefined,
  };
}

export const [LoanContext, useLoans] = createContextHook(() => {
  const { user, getUserById, getAllUsers } = useAuth();
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [schedules, setSchedules] = useState<RepaymentSchedule[]>([]);
  const [currentInterestRate, setCurrentInterestRate] = useState<number>(DEFAULT_INTEREST_RATE);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [rollovers, setRollovers] = useState<RolloverLoan[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    checkOverdueLoans();
    checkPaymentReminders();

    const interval = setInterval(() => {
      checkOverdueLoans();
      checkPaymentReminders();
    }, 60000);
    return () => clearInterval(interval);
  });

  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadLoans(),
      loadDocuments(),
      loadSchedules(),
      loadInterestRate(),
      loadNotifications(),
      loadPayments(),
      loadRollovers(),
    ]);
  }, []);

  const loadLoans = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('loans').select('*');
      if (error) { console.error('Failed to load loans:', error.message); return; }
      setLoans((data ?? []).map(mapLoanRow));
    } catch (error) { console.error('Failed to load loans:', error); }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('documents').select('*');
      if (error) { console.error('Failed to load documents:', error.message); return; }
      setDocuments((data ?? []).map(mapDocumentRow));
    } catch (error) { console.error('Failed to load documents:', error); }
  }, []);

  const loadSchedules = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('repayment_schedules').select('*');
      if (error) { console.error('Failed to load schedules:', error.message); return; }
      setSchedules((data ?? []).map(s => ({
        loanId: s.loan_id,
        schedule: (s.schedule as unknown as AmortizationEntry[]) ?? [],
        paidMonths: (s.paid_months as unknown as number[]) ?? [],
        nextPaymentDate: s.next_payment_date ?? undefined,
        totalPaid: s.total_paid ?? undefined,
      })));
    } catch (error) { console.error('Failed to load schedules:', error); }
  }, []);

  const loadInterestRate = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'interest_rate').single();
      if (error) {
        if (error.code !== 'PGRST116') console.error('Failed to load interest rate:', error.message);
        return;
      }
      if (data) setCurrentInterestRate(parseFloat(data.value));
    } catch (error) { console.error('Failed to load interest rate:', error); }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('notifications').select('*');
      if (error) { console.error('Failed to load notifications:', error.message); return; }
      setNotifications((data ?? []).map(n => ({
        id: n.id,
        userId: n.user_id,
        loanId: n.loan_id ?? undefined,
        type: n.type as Notification['type'],
        title: n.title,
        message: n.message,
        read: n.read ?? false,
        createdAt: n.created_at ?? new Date().toISOString(),
      })));
    } catch (error) { console.error('Failed to load notifications:', error); }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('payment_records').select('*');
      if (error) { console.error('Failed to load payments:', error.message); return; }
      setPayments((data ?? []).map(p => ({
        id: p.id,
        loanId: p.loan_id,
        userId: p.user_id,
        amount: Number(p.amount),
        proofUri: p.proof_uri ?? undefined,
        proofFileName: p.proof_file_name ?? undefined,
        isPartial: p.is_partial ?? false,
        remainingAfter: Number(p.remaining_after ?? 0),
        rolloverCalculated: p.rollover_calculated ?? false,
        rolloverRemaining: p.rollover_remaining ? Number(p.rollover_remaining) : undefined,
        rolloverInterest: p.rollover_interest ? Number(p.rollover_interest) : undefined,
        rolloverTotalPayable: p.rollover_total_payable ? Number(p.rollover_total_payable) : undefined,
        rolloverDueDate: p.rollover_due_date ?? undefined,
        paidAt: p.paid_at ?? new Date().toISOString(),
      })));
    } catch (error) { console.error('Failed to load payments:', error); }
  }, []);

  const loadRollovers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('rollover_loans').select('*');
      if (error) { console.error('Failed to load rollovers:', error.message); return; }
      setRollovers((data ?? []).map(r => ({
        originalLoanId: r.original_loan_id,
        rolloverLoanId: r.rollover_loan_id,
        originalAmount: Number(r.original_amount),
        paidAmount: Number(r.paid_amount),
        remainingPrincipal: Number(r.remaining_principal),
        rolloverInterest: Number(r.rollover_interest),
        rolloverTotalPayable: Number(r.rollover_total_payable),
        rolloverPeriod: r.rollover_period,
        rolloverMonthlyPayment: Number(r.rollover_monthly_payment),
        reason: r.reason as 'partial_payment',
        calculatedAt: r.calculated_at ?? new Date().toISOString(),
      })));
    } catch (error) { console.error('Failed to load rollovers:', error); }
  }, []);

  const createNotification = useCallback(async (
    userId: string,
    type: 'loan_approved' | 'loan_disbursed' | 'payment_reminder' | 'payment_overdue' | 'partial_payment' | 'rollover',
    title: string,
    message: string,
    loanId?: string
  ) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      userId,
      loanId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from('notifications').insert({
      id: newNotification.id,
      user_id: userId,
      loan_id: loanId ?? null,
      type,
      title,
      message,
      read: false,
      created_at: newNotification.createdAt,
    });
    if (error) { console.error('Failed to create notification:', error.message); return; }
    setNotifications(prev => [...prev, newNotification]);
    console.log(`Notification created: ${title}`);
  }, []);

  const checkOverdueLoans = useCallback(async () => {
    const now = new Date();
    const updatedLoans = [...loans];
    let hasChanges = false;

    for (let i = 0; i < updatedLoans.length; i++) {
      const loan = updatedLoans[i];
      if ((loan.status === 'active' || loan.status === 'disbursed') && loan.dueDate && !loan.isOverdue) {
        const dueDate = new Date(loan.dueDate);
        if (now > dueDate) {
          const penalty = loan.totalPayable * 0.02;
          updatedLoans[i] = {
            ...loan,
            isOverdue: true,
            latePaymentPenalty: penalty,
            totalPayable: loan.totalPayable + penalty,
            status: 'overdue',
          };
          hasChanges = true;
          await createNotification(
            loan.userId,
            'payment_overdue',
            'Payment Overdue',
            `Your loan payment is overdue. A 2% penalty (MKW ${penalty.toFixed(2)}) has been added to your total payable amount.`,
            loan.id
          );

          const overdueUser = getUserById(loan.userId);
          if (overdueUser) {
            const { subject, message: msg } = buildOverdueMessage(
              overdueUser.name,
              loan.loanType,
              loan.amount,
              loan.totalPayable,
              penalty,
              loan.dueDate!,
              loan.id
            );
            await sendToAllUserChannels(overdueUser, subject, msg, loan.id);
          }
        }
      }
    }

    if (hasChanges) {
      for (const loan of updatedLoans) {
        await supabase.from('loans').update({
          is_overdue: loan.isOverdue,
          late_payment_penalty: loan.latePaymentPenalty ?? 0,
          total_payable: loan.totalPayable,
          status: loan.status,
        }).eq('id', loan.id);
      }
      setLoans(updatedLoans);
    }
  }, [loans, createNotification, getUserById]);

  const checkPaymentReminders = useCallback(async () => {
    const now = new Date();
    const updatedLoans = [...loans];
    let hasChanges = false;

    for (let i = 0; i < updatedLoans.length; i++) {
      const loan = updatedLoans[i];
      if ((loan.status === 'active' || loan.status === 'disbursed') && loan.dueDate) {
        const dueDate = new Date(loan.dueDate);
        const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const remindersSent = loan.remindersSent || 0;

        if (daysUntilDue === 7 && remindersSent < 1) {
          updatedLoans[i] = { ...loan, remindersSent: 1, lastReminderAt: now.toISOString() };
          hasChanges = true;
          await createNotification(loan.userId, 'payment_reminder', 'Payment Reminder',
            `Your loan payment is due in 7 days. Please prepare MKW ${loan.totalPayable.toFixed(2)} for repayment.`, loan.id);
          const reminderUser = getUserById(loan.userId);
          if (reminderUser) {
            const { subject, message: msg } = buildDueDateReminderMessage(reminderUser.name, loan.loanType, loan.amount, loan.totalPayable, loan.dueDate!, 7, loan.id);
            await sendToAllUserChannels(reminderUser, subject, msg, loan.id);
          }
        } else if (daysUntilDue === 3 && remindersSent < 2) {
          updatedLoans[i] = { ...loan, remindersSent: 2, lastReminderAt: now.toISOString() };
          hasChanges = true;
          await createNotification(loan.userId, 'payment_reminder', 'Payment Reminder',
            `Your loan payment is due in 3 days. Please ensure you have MKW ${loan.totalPayable.toFixed(2)} ready.`, loan.id);
          const reminderUser3 = getUserById(loan.userId);
          if (reminderUser3) {
            const { subject, message: msg } = buildDueDateReminderMessage(reminderUser3.name, loan.loanType, loan.amount, loan.totalPayable, loan.dueDate!, 3, loan.id);
            await sendToAllUserChannels(reminderUser3, subject, msg, loan.id);
          }
        }
      }
    }

    if (hasChanges) {
      for (const loan of updatedLoans) {
        await supabase.from('loans').update({
          reminders_sent: loan.remindersSent,
          last_reminder_at: loan.lastReminderAt,
        }).eq('id', loan.id);
      }
      setLoans(updatedLoans);
    }
  }, [loans, createNotification, getUserById]);

  const calculateLoan = (
    loanAmount: number,
    interestRate: number,
    months: number
  ): LoanCalculation => {
    const monthlyRate = interestRate / 100;
    const totalInterest = loanAmount * monthlyRate * months;
    const totalPayable = loanAmount + totalInterest;
    const monthlyPayment = totalPayable / months;

    const amortizationSchedule: AmortizationEntry[] = [];
    let balance = loanAmount;

    for (let month = 1; month <= months; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;

      amortizationSchedule.push({
        month,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance),
      });
    }

    return { loanAmount, interestRate, months, monthlyPayment, totalPayable, totalInterest, amortizationSchedule };
  };

  const createLoanApplication = useCallback(async (
    amount: number,
    repaymentPeriod: number,
    loanType: string,
    purpose: string
  ): Promise<{ success: boolean; loanId?: string; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'User not authenticated' };

      const calculation = calculateLoan(amount, currentInterestRate, repaymentPeriod);

      const newLoan: LoanApplication = {
        id: `loan-${Date.now()}`,
        userId: user.id,
        amount,
        repaymentPeriod,
        loanType,
        purpose,
        interestRate: currentInterestRate,
        totalPayable: calculation.totalPayable,
        monthlyPayment: calculation.monthlyPayment,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const { error } = await supabase.from('loans').insert({
        id: newLoan.id,
        user_id: user.id,
        amount,
        repayment_period: repaymentPeriod,
        loan_type: loanType,
        purpose,
        interest_rate: currentInterestRate,
        total_payable: calculation.totalPayable,
        monthly_payment: calculation.monthlyPayment,
        status: 'pending',
        created_at: newLoan.createdAt,
      });

      if (error) { console.error('Failed to create loan:', error.message); return { success: false, error: 'Failed to create loan application' }; }

      setLoans(prev => [...prev, newLoan]);

      const newSchedule: RepaymentSchedule = {
        loanId: newLoan.id,
        schedule: calculation.amortizationSchedule,
        paidMonths: [],
      };
      await supabase.from('repayment_schedules').insert({
        loan_id: newLoan.id,
        schedule: JSON.parse(JSON.stringify(calculation.amortizationSchedule)),
        paid_months: [],
      });
      setSchedules(prev => [...prev, newSchedule]);

      return { success: true, loanId: newLoan.id };
    } catch (error) {
      console.error('Failed to create loan:', error);
      return { success: false, error: 'Failed to create loan application' };
    }
  }, [user, currentInterestRate]);

  const uploadDocument = useCallback(async (
    type: 'id' | 'payslip' | 'collateral' | 'security' | 'payment_proof',
    uri: string,
    fileName: string,
    loanId?: string
  ): Promise<{ success: boolean; documentId?: string; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'User not authenticated' };

      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        userId: user.id,
        loanId,
        type,
        uri,
        fileName,
        uploadedAt: new Date().toISOString(),
      };

      const { error } = await supabase.from('documents').insert({
        id: newDoc.id,
        user_id: user.id,
        loan_id: loanId ?? null,
        type,
        uri,
        file_name: fileName,
        uploaded_at: newDoc.uploadedAt,
      });

      if (error) { console.error('Failed to upload document:', error.message); return { success: false, error: 'Failed to upload document' }; }

      setDocuments(prev => [...prev, newDoc]);

      if (type === 'security' && loanId) {
        const { error: updateError } = await supabase.from('loans').update({ security_docs_submitted: true }).eq('id', loanId);
        if (!updateError) setLoans(prev => prev.map(l => l.id === loanId ? { ...l, securityDocsSubmitted: true } : l));
      }

      if (type === 'payment_proof' && loanId) {
        const { error: updateError } = await supabase.from('loans').update({ payment_proof_uploaded: true }).eq('id', loanId);
        if (!updateError) setLoans(prev => prev.map(l => l.id === loanId ? { ...l, paymentProofUploaded: true } : l));
      }

      return { success: true, documentId: newDoc.id };
    } catch (error) {
      console.error('Failed to upload document:', error);
      return { success: false, error: 'Failed to upload document' };
    }
  }, [user]);

  const approveLoan = useCallback(async (loanId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('loans').update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      }).eq('id', loanId);

      if (error) { console.error('Failed to approve loan:', error.message); return { success: false, error: 'Failed to approve loan' }; }

      setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'approved', approvedAt: new Date().toISOString() } : l));

      const approvedLoan = loans.find(l => l.id === loanId);
      const approvedUser = approvedLoan ? getUserById(approvedLoan.userId) : undefined;
      if (approvedUser && approvedLoan) {
        const { subject, message: msg } = buildApprovalMessage(approvedUser.name, approvedLoan.loanType, approvedLoan.amount, approvedLoan.totalPayable, approvedLoan.repaymentPeriod, approvedLoan.interestRate, loanId);
        await sendToAllUserChannels(approvedUser, subject, msg, loanId);
      }

      return { success: true };
    } catch (error) { console.error('Failed to approve loan:', error); return { success: false, error: 'Failed to approve loan' }; }
  }, [loans, getUserById]);

  const rejectLoan = useCallback(async (loanId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('loans').update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
      }).eq('id', loanId);

      if (error) { console.error('Failed to reject loan:', error.message); return { success: false, error: 'Failed to reject loan' }; }

      setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status: 'rejected', rejectedAt: new Date().toISOString() } : l));

      const rejectedLoan = loans.find(l => l.id === loanId);
      const rejectedUser = rejectedLoan ? getUserById(rejectedLoan.userId) : undefined;
      if (rejectedUser && rejectedLoan) {
        const { subject, message: msg } = buildAdjustmentMessage(rejectedUser.name, 'Loan Rejection',
          `Your ${rejectedLoan.loanType} loan application for MKW ${rejectedLoan.amount.toLocaleString()} has been rejected. Contact Makono support for details.`, loanId);
        await sendToAllUserChannels(rejectedUser, subject, msg, loanId);
      }

      return { success: true };
    } catch (error) { console.error('Failed to reject loan:', error); return { success: false, error: 'Failed to reject loan' }; }
  }, [loans, getUserById]);

  const getUserLoans = useCallback(() => {
    if (!user) return [];
    return loans.filter(loan => loan.userId === user.id);
  }, [user, loans]);

  const getUserDocuments = useCallback(() => {
    if (!user) return [];
    return documents.filter(doc => doc.userId === user.id);
  }, [user, documents]);

  const getLoanSchedule = useCallback((loanId: string) => {
    return schedules.find(s => s.loanId === loanId);
  }, [schedules]);

  const getAdminStats = useCallback(() => {
    const totalLoans = loans.length;
    const approvedLoans = loans.filter(l => l.status === 'approved').length;
    const rejectedLoans = loans.filter(l => l.status === 'rejected').length;
    const pendingLoans = loans.filter(l => l.status === 'pending').length;
    const totalRevenue = loans
      .filter(l => l.status === 'approved')
      .reduce((sum, l) => sum + (l.totalPayable - l.amount), 0);

    return { totalLoans, approvedLoans, rejectedLoans, pendingLoans, totalRevenue };
  }, [loans]);

  const updateInterestRate = useCallback(async (newRate: number): Promise<{ success: boolean; error?: string }> => {
    try {
      if (newRate <= 0 || newRate > 100) {
        return { success: false, error: 'Interest rate must be between 0 and 100' };
      }

      const { error } = await supabase.from('app_settings').upsert({
        key: 'interest_rate',
        value: newRate.toString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

      if (error) { console.error('Failed to update interest rate:', error.message); return { success: false, error: 'Failed to update interest rate' }; }

      setCurrentInterestRate(newRate);

      const allUsers = getAllUsers();
      const borrowerIds = new Set(loans.map(l => l.userId));
      for (const borrowerUser of allUsers) {
        if (borrowerIds.has(borrowerUser.id)) {
          const { subject, message: msg } = buildRateChangeMessage(borrowerUser.name, currentInterestRate, newRate);
          await sendToAllUserChannels(borrowerUser, subject, msg);
        }
      }

      return { success: true };
    } catch (error) { console.error('Failed to update interest rate:', error); return { success: false, error: 'Failed to update interest rate' }; }
  }, [currentInterestRate, loans, getAllUsers]);

  const requestSecurityDocuments = useCallback(async (loanId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('loans').update({ security_docs_requested: true }).eq('id', loanId);
      if (error) { console.error('Failed to request security docs:', error.message); return { success: false, error: 'Failed to request security documents' }; }
      setLoans(prev => prev.map(l => l.id === loanId ? { ...l, securityDocsRequested: true } : l));
      return { success: true };
    } catch (error) { console.error('Failed to request security documents:', error); return { success: false, error: 'Failed to request security documents' }; }
  }, []);

  const acknowledgePayment = useCallback(async (loanId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const loan = loans.find(l => l.id === loanId);
      if (!loan) return { success: false, error: 'Loan not found' };

      const repaymentMonths = loan.repaymentPeriod;
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + repaymentMonths);
      const dueDateISO = dueDate.toISOString();
      const nowISO = new Date().toISOString();

      const { error } = await supabase.from('loans').update({
        payment_acknowledged: true,
        status: 'active',
        disbursed_at: nowISO,
        due_date: dueDateISO,
        reminders_sent: 0,
      }).eq('id', loanId);

      if (error) { console.error('Failed to acknowledge payment:', error.message); return { success: false, error: 'Failed to acknowledge payment' }; }

      setLoans(prev => prev.map(l => l.id === loanId ? {
        ...l,
        paymentAcknowledged: true,
        status: 'active',
        disbursedAt: nowISO,
        dueDate: dueDateISO,
        remindersSent: 0,
      } : l));

      await createNotification(loan.userId, 'loan_disbursed', 'Loan Disbursed',
        `Your loan of MKW ${loan.amount.toLocaleString()} has been disbursed. Total repayment: MKW ${loan.totalPayable.toFixed(2)} due on ${dueDate.toLocaleDateString()}.`, loanId);

      const disbursedUser = getUserById(loan.userId);
      if (disbursedUser) {
        const { subject, message: msg } = buildDisbursementMessage(disbursedUser.name, loan.loanType, loan.amount, loan.totalPayable, dueDateISO, loanId);
        await sendToAllUserChannels(disbursedUser, subject, msg, loanId);
      }

      return { success: true };
    } catch (error) { console.error('Failed to acknowledge payment:', error); return { success: false, error: 'Failed to acknowledge payment' }; }
  }, [loans, createNotification, getUserById]);

  const getLoanDocuments = useCallback((loanId: string) => {
    return documents.filter(doc => doc.loanId === loanId);
  }, [documents]);

  const getUserNotifications = useCallback(() => {
    if (!user) return [];
    return notifications.filter(n => n.userId === user.id).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [user, notifications]);

  const markNotificationAsRead = useCallback(async (notificationId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
      if (error) { console.error('Failed to mark notification as read:', error.message); return { success: false, error: 'Failed to update notification' }; }
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      return { success: true };
    } catch (error) { console.error('Failed to mark notification as read:', error); return { success: false, error: 'Failed to update notification' }; }
  }, []);

  const getLoanHistory = useCallback((userId?: string) => {
    const userLoans = userId ? loans.filter(l => l.userId === userId) : loans;
    return userLoans
      .filter(l => l.status === 'completed' || l.status === 'rejected')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [loans]);

  const getAllLoansForUser = useCallback((userId: string) => {
    return loans
      .filter(l => l.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [loans]);

  const recordPayment = useCallback(async (
    loanId: string,
    amount: number,
    proofUri?: string,
    proofFileName?: string
  ): Promise<{ success: boolean; paymentId?: string; rolloverCalculated?: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'User not authenticated' };

      const loan = loans.find(l => l.id === loanId);
      if (!loan) return { success: false, error: 'Loan not found' };

      if (amount <= 0) return { success: false, error: 'Payment amount must be greater than 0' };

      const totalPaidSoFar = (loan.totalPaidSoFar || 0) + amount;
      const totalPayable = loan.totalPayable;
      const isPartial = totalPaidSoFar < totalPayable;
      const remainingAfter = Math.max(0, totalPayable - totalPaidSoFar);

      const paymentRecord: PaymentRecord = {
        id: `pay-${Date.now()}`,
        loanId,
        userId: user.id,
        amount,
        proofUri,
        proofFileName,
        isPartial,
        remainingAfter,
        rolloverCalculated: false,
        paidAt: new Date().toISOString(),
      };

      let rolloverCalculated = false;
      let updatedLoans = [...loans];
      const updatedPayments = [...payments, paymentRecord];
      const updatedRollovers = [...rollovers];

      if (isPartial) {
        const remainingPrincipal = loan.amount - totalPaidSoFar;
        if (remainingPrincipal > 0) {
          const rolloverPeriod = loan.repaymentPeriod;
          const rolloverInterest = remainingPrincipal * (loan.interestRate / 100) * rolloverPeriod;
          const rolloverTotalPayable = remainingPrincipal + rolloverInterest;
          const rolloverMonthlyPayment = rolloverTotalPayable / rolloverPeriod;
          const rolloverDueDate = new Date();
          rolloverDueDate.setMonth(rolloverDueDate.getMonth() + rolloverPeriod);

          const rolloverLoan: RolloverLoan = {
            originalLoanId: loanId,
            rolloverLoanId: `loan-rollover-${Date.now()}`,
            originalAmount: loan.amount,
            paidAmount: totalPaidSoFar,
            remainingPrincipal,
            rolloverInterest,
            rolloverTotalPayable,
            rolloverPeriod,
            rolloverMonthlyPayment,
            reason: 'partial_payment',
            calculatedAt: new Date().toISOString(),
          };

          updatedRollovers.push(rolloverLoan);

          const rolloverApplication: LoanApplication = {
            id: rolloverLoan.rolloverLoanId,
            userId: loan.userId,
            amount: remainingPrincipal,
            repaymentPeriod: rolloverPeriod,
            loanType: loan.loanType,
            purpose: loan.purpose,
            interestRate: loan.interestRate,
            totalPayable: rolloverTotalPayable,
            monthlyPayment: rolloverMonthlyPayment,
            status: 'approved' as const,
            createdAt: new Date().toISOString(),
            approvedAt: new Date().toISOString(),
            isRollover: true,
          };

          updatedLoans.push(rolloverApplication);

          paymentRecord.rolloverCalculated = true;
          paymentRecord.rolloverRemaining = remainingPrincipal;
          paymentRecord.rolloverInterest = rolloverInterest;
          paymentRecord.rolloverTotalPayable = rolloverTotalPayable;
          paymentRecord.rolloverDueDate = rolloverDueDate.toISOString();

          updatedLoans = updatedLoans.map(l =>
            l.id === loanId
              ? {
                  ...l,
                  status: 'completed' as const,
                  totalPaidSoFar,
                  remainingBalance: remainingAfter,
                  rolloverId: rolloverLoan.rolloverLoanId,
                }
              : l
          );

          rolloverCalculated = true;

          await createNotification(loan.userId, 'rollover', 'Roll-over Loan Created',
            `Your partial payment of MKW ${amount.toLocaleString()} was received. Remaining balance of MKW ${remainingPrincipal.toLocaleString()} has been rolled over. New total payable: MKW ${rolloverTotalPayable.toFixed(2)} (${rolloverPeriod} months at ${loan.interestRate}% monthly).`,
            rolloverLoan.rolloverLoanId);

          const rolloverUser = getUserById(loan.userId);
          if (rolloverUser) {
            const { subject, message: msg } = buildRolloverMessage(rolloverUser.name, loan.amount, totalPaidSoFar, remainingPrincipal, rolloverTotalPayable, rolloverPeriod, loan.interestRate, rolloverLoan.rolloverLoanId);
            await sendToAllUserChannels(rolloverUser, subject, msg, rolloverLoan.rolloverLoanId);
          }
        }
      } else {
        updatedLoans = updatedLoans.map(l =>
          l.id === loanId
            ? { ...l, status: 'completed', totalPaidSoFar, remainingBalance: 0 }
            : l
        );
      }

      // Persist to Supabase
      await supabase.from('payment_records').insert({
        id: paymentRecord.id,
        loan_id: loanId,
        user_id: user.id,
        amount,
        proof_uri: proofUri ?? null,
        proof_file_name: proofFileName ?? null,
        is_partial: isPartial,
        remaining_after: remainingAfter,
        rollover_calculated: paymentRecord.rolloverCalculated,
        rollover_remaining: paymentRecord.rolloverRemaining ?? null,
        rollover_interest: paymentRecord.rolloverInterest ?? null,
        rollover_total_payable: paymentRecord.rolloverTotalPayable ?? null,
        rollover_due_date: paymentRecord.rolloverDueDate ?? null,
        paid_at: paymentRecord.paidAt,
      });

      for (const l of updatedLoans) {
        const exists = loans.find(el => el.id === l.id);
        if (exists) {
          await supabase.from('loans').update({
            status: l.status,
            total_paid_so_far: l.totalPaidSoFar ?? 0,
            remaining_balance: l.remainingBalance ?? 0,
            rollover_id: l.rolloverId ?? null,
          }).eq('id', l.id);
        } else {
          await supabase.from('loans').insert({
            id: l.id,
            user_id: l.userId,
            amount: l.amount,
            repayment_period: l.repaymentPeriod,
            loan_type: l.loanType,
            purpose: l.purpose,
            interest_rate: l.interestRate,
            total_payable: l.totalPayable,
            monthly_payment: l.monthlyPayment,
            status: l.status,
            created_at: l.createdAt,
            approved_at: l.approvedAt ?? null,
            is_rollover: l.isRollover ?? false,
          });
        }
      }

      for (const r of updatedRollovers) {
        const exists = rollovers.find(er => er.originalLoanId === r.originalLoanId);
        if (!exists) {
          await supabase.from('rollover_loans').insert({
            original_loan_id: r.originalLoanId,
            rollover_loan_id: r.rolloverLoanId,
            original_amount: r.originalAmount,
            paid_amount: r.paidAmount,
            remaining_principal: r.remainingPrincipal,
            rollover_interest: r.rolloverInterest,
            rollover_total_payable: r.rolloverTotalPayable,
            rollover_period: r.rolloverPeriod,
            rollover_monthly_payment: r.rolloverMonthlyPayment,
            reason: r.reason,
            calculated_at: r.calculatedAt,
          });
        }
      }

      setLoans(updatedLoans);
      setPayments(updatedPayments);
      setRollovers(updatedRollovers);

      await createNotification(loan.userId, 'partial_payment', 'Payment Recorded',
        `Your payment of MKW ${amount.toLocaleString()} has been recorded. ${isPartial ? `Remaining: MKW ${remainingAfter.toLocaleString()}` : 'Loan fully paid!'}`, loanId);

      return { success: true, paymentId: paymentRecord.id, rolloverCalculated };
    } catch (error) { console.error('Failed to record payment:', error); return { success: false, error: 'Failed to record payment' }; }
  }, [user, loans, payments, rollovers, createNotification, getUserById]);

  const getUserPayments = useCallback(() => {
    if (!user) return [];
    return payments.filter(p => p.userId === user.id).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }, [user, payments]);

  const getLoanPayments = useCallback((loanId: string) => {
    return payments.filter(p => p.loanId === loanId).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }, [payments]);

  const getLoanRollover = useCallback((loanId: string) => {
    return rollovers.find(r => r.originalLoanId === loanId);
  }, [rollovers]);

  const getUserRollovers = useCallback(() => {
    if (!user) return [];
    const userLoanIds = new Set(loans.filter(l => l.userId === user.id).map(l => l.id));
    return rollovers.filter(r => userLoanIds.has(r.originalLoanId));
  }, [user, loans, rollovers]);

  return {
    loans,
    documents,
    schedules,
    currentInterestRate,
    notifications,
    payments,
    rollovers,
    calculateLoan,
    createLoanApplication,
    uploadDocument,
    approveLoan,
    rejectLoan,
    getUserLoans,
    getUserDocuments,
    getLoanSchedule,
    getAdminStats,
    updateInterestRate,
    requestSecurityDocuments,
    acknowledgePayment,
    getLoanDocuments,
    getUserNotifications,
    markNotificationAsRead,
    getLoanHistory,
    getAllLoansForUser,
    recordPayment,
    getUserPayments,
    getLoanPayments,
    getLoanRollover,
    getUserRollovers,
  };
});
