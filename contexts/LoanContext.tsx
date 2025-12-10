import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoanApplication, Document, LoanCalculation, AmortizationEntry, RepaymentSchedule, Notification } from '@/types/loan';
import { DEFAULT_INTEREST_RATE } from '@/constants/loanTypes';
import { useAuth } from './AuthContext';

const STORAGE_KEYS = {
  LOANS: 'makono_loans',
  DOCUMENTS: 'makono_documents',
  SCHEDULES: 'makono_schedules',
  INTEREST_RATE: 'makono_interest_rate',
  NOTIFICATIONS: 'makono_notifications',
} as const;

export const [LoanContext, useLoans] = createContextHook(() => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [schedules, setSchedules] = useState<RepaymentSchedule[]>([]);
  const [currentInterestRate, setCurrentInterestRate] = useState<number>(DEFAULT_INTEREST_RATE);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadLoans();
    loadDocuments();
    loadSchedules();
    loadInterestRate();
    loadNotifications();
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

  const loadLoans = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOANS);
      if (stored) {
        setLoans(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load loans:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (stored) {
        setDocuments(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadSchedules = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULES);
      if (stored) {
        setSchedules(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  };

  const loadInterestRate = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.INTEREST_RATE);
      if (stored) {
        setCurrentInterestRate(parseFloat(stored));
      }
    } catch (error) {
      console.error('Failed to load interest rate:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const createNotification = async (
    userId: string,
    type: 'loan_approved' | 'loan_disbursed' | 'payment_reminder' | 'payment_overdue',
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
    const updatedNotifications = [...notifications, newNotification];
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updatedNotifications));
    setNotifications(updatedNotifications);
    console.log(`Notification created: ${title}`);
  };

  const checkOverdueLoans = async () => {
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
        }
      }
    }

    if (hasChanges) {
      await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updatedLoans));
      setLoans(updatedLoans);
    }
  };

  const checkPaymentReminders = async () => {
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
          updatedLoans[i] = {
            ...loan,
            remindersSent: 1,
            lastReminderAt: now.toISOString(),
          };
          hasChanges = true;
          await createNotification(
            loan.userId,
            'payment_reminder',
            'Payment Reminder',
            `Your loan payment is due in 7 days. Please prepare MKW ${loan.totalPayable.toFixed(2)} for repayment.`,
            loan.id
          );
        } else if (daysUntilDue === 3 && remindersSent < 2) {
          updatedLoans[i] = {
            ...loan,
            remindersSent: 2,
            lastReminderAt: now.toISOString(),
          };
          hasChanges = true;
          await createNotification(
            loan.userId,
            'payment_reminder',
            'Payment Reminder',
            `Your loan payment is due in 3 days. Please ensure you have MKW ${loan.totalPayable.toFixed(2)} ready.`,
            loan.id
          );
        }
      }
    }

    if (hasChanges) {
      await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updatedLoans));
      setLoans(updatedLoans);
    }
  };

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

    return {
      loanAmount,
      interestRate,
      months,
      monthlyPayment,
      totalPayable,
      totalInterest,
      amortizationSchedule,
    };
  };

  const createLoanApplication = async (
    amount: number,
    repaymentPeriod: number,
    loanType: string,
    purpose: string
  ): Promise<{ success: boolean; loanId?: string; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

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

      const updatedLoans = [...loans, newLoan];
      await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updatedLoans));
      setLoans(updatedLoans);

      const newSchedule: RepaymentSchedule = {
        loanId: newLoan.id,
        schedule: calculation.amortizationSchedule,
        paidMonths: [],
      };
      const updatedSchedules = [...schedules, newSchedule];
      await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(updatedSchedules));
      setSchedules(updatedSchedules);

      return { success: true, loanId: newLoan.id };
    } catch (error) {
      console.error('Failed to create loan:', error);
      return { success: false, error: 'Failed to create loan application' };
    }
  };

  const uploadDocument = async (
    type: 'id' | 'payslip' | 'collateral' | 'security' | 'payment_proof',
    uri: string,
    fileName: string,
    loanId?: string
  ): Promise<{ success: boolean; documentId?: string; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        userId: user.id,
        loanId,
        type,
        uri,
        fileName,
        uploadedAt: new Date().toISOString(),
      };

      const updatedDocs = [...documents, newDoc];
      await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updatedDocs));
      setDocuments(updatedDocs);

      if (type === 'security' && loanId) {
        const updatedLoans = loans.map(loan =>
          loan.id === loanId
            ? { ...loan, securityDocsSubmitted: true }
            : loan
        );
        await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updatedLoans));
        setLoans(updatedLoans);
      }

      if (type === 'payment_proof' && loanId) {
        const updatedLoans = loans.map(loan =>
          loan.id === loanId
            ? { ...loan, paymentProofUploaded: true }
            : loan
        );
        await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updatedLoans));
        setLoans(updatedLoans);
      }

      return { success: true, documentId: newDoc.id };
    } catch (error) {
      console.error('Failed to upload document:', error);
      return { success: false, error: 'Failed to upload document' };
    }
  };

  const approveLoan = async (loanId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const updatedLoans = loans.map(loan =>
        loan.id === loanId
          ? { ...loan, status: 'approved' as const, approvedAt: new Date().toISOString() }
          : loan
      );
      await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updatedLoans));
      setLoans(updatedLoans);
      return { success: true };
    } catch (error) {
      console.error('Failed to approve loan:', error);
      return { success: false, error: 'Failed to approve loan' };
    }
  };

  const rejectLoan = async (loanId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const updatedLoans = loans.map(loan =>
        loan.id === loanId
          ? { ...loan, status: 'rejected' as const, rejectedAt: new Date().toISOString() }
          : loan
      );
      await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updatedLoans));
      setLoans(updatedLoans);
      return { success: true };
    } catch (error) {
      console.error('Failed to reject loan:', error);
      return { success: false, error: 'Failed to reject loan' };
    }
  };

  const getUserLoans = () => {
    if (!user) return [];
    return loans.filter(loan => loan.userId === user.id);
  };

  const getUserDocuments = () => {
    if (!user) return [];
    return documents.filter(doc => doc.userId === user.id);
  };

  const getLoanSchedule = (loanId: string) => {
    return schedules.find(s => s.loanId === loanId);
  };

  const getAdminStats = () => {
    const totalLoans = loans.length;
    const approvedLoans = loans.filter(l => l.status === 'approved').length;
    const rejectedLoans = loans.filter(l => l.status === 'rejected').length;
    const pendingLoans = loans.filter(l => l.status === 'pending').length;
    const totalRevenue = loans
      .filter(l => l.status === 'approved')
      .reduce((sum, l) => sum + (l.totalPayable - l.amount), 0);

    return {
      totalLoans,
      approvedLoans,
      rejectedLoans,
      pendingLoans,
      totalRevenue,
    };
  };

  const updateInterestRate = async (newRate: number): Promise<{ success: boolean; error?: string }> => {
    try {
      if (newRate <= 0 || newRate > 100) {
        return { success: false, error: 'Interest rate must be between 0 and 100' };
      }
      await AsyncStorage.setItem(STORAGE_KEYS.INTEREST_RATE, newRate.toString());
      setCurrentInterestRate(newRate);
      return { success: true };
    } catch (error) {
      console.error('Failed to update interest rate:', error);
      return { success: false, error: 'Failed to update interest rate' };
    }
  };

  const requestSecurityDocuments = async (loanId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const updatedLoans = loans.map(loan =>
        loan.id === loanId
          ? { ...loan, securityDocsRequested: true }
          : loan
      );
      await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updatedLoans));
      setLoans(updatedLoans);
      return { success: true };
    } catch (error) {
      console.error('Failed to request security documents:', error);
      return { success: false, error: 'Failed to request security documents' };
    }
  };

  const acknowledgePayment = async (loanId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const loan = loans.find(l => l.id === loanId);
      if (!loan) {
        return { success: false, error: 'Loan not found' };
      }

      const repaymentMonths = loan.repaymentPeriod;
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + repaymentMonths);

      const updatedLoans = loans.map(l =>
        l.id === loanId
          ? { 
              ...l, 
              paymentAcknowledged: true, 
              status: 'active' as const,
              disbursedAt: new Date().toISOString(),
              dueDate: dueDate.toISOString(),
              remindersSent: 0,
            }
          : l
      );
      await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(updatedLoans));
      setLoans(updatedLoans);

      await createNotification(
        loan.userId,
        'loan_disbursed',
        'Loan Disbursed',
        `Your loan of MKW ${loan.amount.toLocaleString()} has been disbursed. Total repayment: MKW ${loan.totalPayable.toFixed(2)} due on ${dueDate.toLocaleDateString()}.`,
        loanId
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to acknowledge payment:', error);
      return { success: false, error: 'Failed to acknowledge payment' };
    }
  };

  const getLoanDocuments = (loanId: string) => {
    return documents.filter(doc => doc.loanId === loanId);
  };

  const getUserNotifications = () => {
    if (!user) return [];
    return notifications.filter(n => n.userId === user.id).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const markNotificationAsRead = async (notificationId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const updatedNotifications = notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updatedNotifications));
      setNotifications(updatedNotifications);
      return { success: true };
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return { success: false, error: 'Failed to update notification' };
    }
  };

  const getLoanHistory = (userId?: string) => {
    const userLoans = userId ? loans.filter(l => l.userId === userId) : loans;
    return userLoans
      .filter(l => l.status === 'completed' || l.status === 'rejected')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getAllLoansForUser = (userId: string) => {
    return loans
      .filter(l => l.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  return {
    loans,
    documents,
    schedules,
    currentInterestRate,
    notifications,
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
  };
});
