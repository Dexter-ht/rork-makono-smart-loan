import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLoans } from '@/contexts/LoanContext';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/loan';
import {
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  Users,
  Percent,
  Settings,
  Shield,
  Upload,
  Camera,
  Clock,
  UserPlus,
  Eye,
  Mail,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  ReceiptText,
  Bell,
  BellOff,
  Smartphone,
  MessageCircle,
  Send,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { sendExternalNotification, isWhatsAppAvailable } from '@/services/NotificationService';

export default function AdminScreen() {
  const { loans, getAdminStats, approveLoan, rejectLoan, currentInterestRate, updateInterestRate, requestSecurityDocuments, uploadDocument, getLoanDocuments, getAllLoansForUser, getLoanPayments, getLoanRollover, payments, rollovers } = useLoans();
  const { isSuperAdmin, canApproveLoans, canUploadPayment, createAccount, getAllAdmins, user } = useAuth();
  const stats = getAdminStats();
  const [newRate, setNewRate] = useState<string>(currentInterestRate.toString());
  const [showRateModal, setShowRateModal] = useState<boolean>(false);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Notification settings state
  const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
  const [smsEnabled, setSmsEnabled] = useState<boolean>(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(true);
  const [showNotifSettings, setShowNotifSettings] = useState<boolean>(false);
  const [testNumber, setTestNumber] = useState<string>('');

  const [showAdminsModal, setShowAdminsModal] = useState<boolean>(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState<boolean>(false);
  const [accountName, setAccountName] = useState<string>('');
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [accountPhone, setAccountPhone] = useState<string>('');
  const [accountRole, setAccountRole] = useState<'admin_viewer' | 'user'>('user');

  const borrowers = useMemo(() => {
    const userIds = new Set(loans.map(l => l.userId));
    return Array.from(userIds).map(userId => {
      const userLoans = getAllLoansForUser(userId);
      const totalBorrowed = userLoans
        .filter(l => l.status === 'approved' || l.status === 'active' || l.status === 'disbursed')
        .reduce((sum, l) => sum + l.amount, 0);
      const activeLoanCount = userLoans.filter(l => 
        l.status === 'active' || l.status === 'disbursed' || l.status === 'overdue'
      ).length;
      
      return {
        userId,
        totalLoans: userLoans.length,
        activeLoanCount,
        totalBorrowed,
        loans: userLoans,
      };
    });
  }, [loans, getAllLoansForUser]);

  const handleApproveLoan = async (loanId: string) => {
    if (!canApproveLoans()) {
      Alert.alert('Permission Denied', 'Only super admins can approve loans');
      return;
    }

    Alert.alert(
      'Approve Loan',
      'Are you sure you want to approve this loan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const result = await approveLoan(loanId);
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Loan approved successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to approve loan');
            }
          },
        },
      ]
    );
  };

  const handleRejectLoan = async (loanId: string) => {
    if (!canApproveLoans()) {
      Alert.alert('Permission Denied', 'Only super admins can reject loans');
      return;
    }

    Alert.alert(
      'Reject Loan',
      'Are you sure you want to reject this loan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const result = await rejectLoan(loanId);
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Loan rejected');
            } else {
              Alert.alert('Error', result.error || 'Failed to reject loan');
            }
          },
        },
      ]
    );
  };

  const handleUpdateInterestRate = async () => {
    if (!isSuperAdmin()) {
      Alert.alert('Permission Denied', 'Only super admins can change interest rates');
      return;
    }

    const rate = parseFloat(newRate);
    if (isNaN(rate)) {
      Alert.alert('Error', 'Please enter a valid number');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await updateInterestRate(rate);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Interest rate updated successfully');
      setShowRateModal(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', result.error || 'Failed to update interest rate');
    }
  };

  const handleRequestSecurityDocs = async (loanId: string) => {
    Alert.alert(
      'Request Security Documents',
      'This will notify the customer to upload security documents.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const result = await requestSecurityDocuments(loanId);
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Security documents requested');
            } else {
              Alert.alert('Error', result.error || 'Failed to request documents');
            }
          },
        },
      ]
    );
  };

  const handleCreateAccount = async () => {
    if (!accountName.trim() || !accountEmail.trim() || !accountPhone.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accountEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await createAccount(accountName, accountEmail, accountPhone, accountRole);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Success',
        `Account created successfully.\nTemporary Password: ${result.password}\n\nPlease save this password, it will not be shown again.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowCreateAccountModal(false);
              setAccountName('');
              setAccountEmail('');
              setAccountPhone('');
              setAccountRole('user');
            },
          },
        ]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', result.error || 'Failed to create account');
    }
  };

  const handleUploadPaymentProof = async (loanId: string) => {
    if (!canUploadPayment()) {
      Alert.alert('Permission Denied', 'Only super admins can upload payment proof');
      return;
    }

    Alert.alert(
      'Upload Proof of Payment',
      'Choose how to upload:',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission needed', 'Camera permission is required');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              await uploadPaymentProof(loanId, result.assets[0].uri, `payment_proof_${Date.now()}.jpg`);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Permission needed', 'Gallery permission is required');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              await uploadPaymentProof(loanId, result.assets[0].uri, `payment_proof_${Date.now()}.jpg`);
            }
          },
        },
        {
          text: 'Choose Document',
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['image/*', 'application/pdf'],
            });

            if (!result.canceled && result.assets[0]) {
              await uploadPaymentProof(loanId, result.assets[0].uri, result.assets[0].name);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadPaymentProof = async (loanId: string, uri: string, fileName: string) => {
    if (!canUploadPayment()) {
      Alert.alert('Permission Denied', 'Only super admins can upload payment proof');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await uploadDocument('payment_proof', uri, fileName, loanId);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Payment proof uploaded successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to upload proof');
    }
  };

  const generateBorrowerReport = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const borrowersData = borrowers.map(borrower => {
        const totalBorrowed = borrower.totalBorrowed;
        const loansHtml = borrower.loans.map(loan => `
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${loan.loanType}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">MKW ${loan.amount.toLocaleString()}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${loan.status}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${new Date(loan.createdAt).toLocaleDateString()}</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'N/A'}</td>
          </tr>
        `).join('');

        return `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3 style="color: #7c3aed; margin-bottom: 10px;">User ID: ${borrower.userId.substring(0, 30)}...</h3>
            <p><strong>Total Loans:</strong> ${borrower.totalLoans} | <strong>Active Loans:</strong> ${borrower.activeLoanCount} | <strong>Total Borrowed:</strong> MKW ${totalBorrowed.toLocaleString()}</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background-color: #f3e8ff;">
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Loan Type</th>
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Amount</th>
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Status</th>
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Applied</th>
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Due Date</th>
                </tr>
              </thead>
              <tbody>
                ${loansHtml}
              </tbody>
            </table>
          </div>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Makono Smart Loan - Borrowers Report</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              padding: 40px;
              color: #1e293b;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #7c3aed;
            }
            .header h1 {
              color: #7c3aed;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              color: #64748b;
              margin: 10px 0 0 0;
            }
            .stats {
              display: flex;
              justify-content: space-around;
              margin-bottom: 30px;
              padding: 20px;
              background-color: #f8fafc;
              border-radius: 8px;
            }
            .stat-item {
              text-align: center;
            }
            .stat-value {
              font-size: 24px;
              font-weight: bold;
              color: #7c3aed;
            }
            .stat-label {
              font-size: 12px;
              color: #64748b;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Makono Smart Loan</h1>
            <p>Borrowers Database Report</p>
            <p style="font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
          </div>
          <div class="stats">
            <div class="stat-item">
              <div class="stat-value">${borrowers.length}</div>
              <div class="stat-label">Total Borrowers</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.totalLoans}</div>
              <div class="stat-label">Total Loans</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.approvedLoans}</div>
              <div class="stat-label">Approved</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${stats.pendingLoans}</div>
              <div class="stat-label">Pending</div>
            </div>
          </div>
          ${borrowersData}
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Borrowers Report',
        UTI: 'com.adobe.pdf',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to generate borrower report:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  const generateAdminReport = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const loansHtml = loans.map(loan => `
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 11px;">${loan.id.substring(0, 15)}...</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${loan.loanType}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">MKW ${loan.amount.toLocaleString()}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${loan.repaymentPeriod}m</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${loan.interestRate}%</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">MKW ${loan.monthlyPayment.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">MKW ${loan.totalPayable.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">
            <span style="padding: 4px 8px; background-color: ${getStatusBadgeColor(loan.status)}; color: white; border-radius: 4px; font-size: 10px;">${loan.status}</span>
          </td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 10px;">${new Date(loan.createdAt).toLocaleDateString()}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Makono Smart Loan - Admin Report</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              padding: 30px;
              color: #1e293b;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #7c3aed;
            }
            .header h1 {
              color: #7c3aed;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              color: #64748b;
              margin: 10px 0 0 0;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .stat-card {
              text-align: center;
              padding: 15px;
              background-color: #f8fafc;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .stat-value {
              font-size: 22px;
              font-weight: bold;
              color: #7c3aed;
            }
            .stat-label {
              font-size: 11px;
              color: #64748b;
              margin-top: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            thead {
              background-color: #7c3aed;
              color: white;
            }
            th {
              padding: 10px 8px;
              text-align: left;
              font-size: 11px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Makono Smart Loan</h1>
            <p>Admin Database Report - Full Loan Details</p>
            <p style="font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
            <p style="font-size: 10px; color: #7c3aed; margin-top: 5px;">CONFIDENTIAL - For Administrative Use Only</p>
          </div>
          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">${stats.totalLoans}</div>
              <div class="stat-label">Total Loans</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.approvedLoans}</div>
              <div class="stat-label">Approved</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.rejectedLoans}</div>
              <div class="stat-label">Rejected</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${stats.pendingLoans}</div>
              <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">MKW ${stats.totalRevenue.toLocaleString()}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
          </div>
          <h3 style="color: #1e293b; margin-top: 30px;">All Loan Applications</h3>
          <table>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Period</th>
                <th>Rate</th>
                <th>Monthly</th>
                <th>Total Payable</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${loansHtml}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Admin Report',
        UTI: 'com.adobe.pdf',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to generate admin report:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  const generateStatementOfAccount = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let totalPrincipal = 0;
      let totalInterest = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;
      let totalPenalties = 0;
      let totalRolloverAmount = 0;
      let activeLoanCount = 0;
      let overdueLoanCount = 0;

      const loansHtmlContent = loans
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(loan => {
          const loanPayments = getLoanPayments(loan.id);
          const rollover = getLoanRollover(loan.id);
          const totalPaidForLoan = loanPayments.reduce((sum, p) => sum + p.amount, 0);
          const principal = loan.amount;
          const interest = loan.totalPayable - principal;
          const outstanding = Math.max(0, loan.totalPayable - totalPaidForLoan);
          const penalty = loan.latePaymentPenalty || 0;

          totalPrincipal += principal;
          totalInterest += interest;
          totalPaid += totalPaidForLoan;
          totalOutstanding += outstanding;
          totalPenalties += penalty;
          if (rollover) totalRolloverAmount += rollover.rolloverTotalPayable;

          if (loan.status === 'active' || loan.status === 'disbursed') activeLoanCount++;
          if (loan.status === 'overdue') overdueLoanCount++;

          const paymentsRows = loanPayments.length > 0
            ? loanPayments.map(p => `
              <tr>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 10px;">${p.id.substring(0, 12)}...</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 10px;">MKW ${p.amount.toLocaleString()}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 10px;">${p.isPartial ? 'Partial' : 'Full'}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 10px;">MKW ${p.remainingAfter.toLocaleString()}</td>
                <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 10px;">${new Date(p.paidAt).toLocaleDateString()}</td>
              </tr>
            `).join('')
            : '<tr><td colspan="5" style="padding: 8px; text-align: center; color: #94a3b8; font-size: 11px;">No payments recorded</td></tr>';

          const rolloverHtmlBlock = rollover
            ? `<div style="margin-top: 10px; padding: 10px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <strong style="font-size: 12px;">Roll-over Created:</strong>
              <table style="width: 100%; margin-top: 6px; font-size: 10px;">
                <tr><td style="padding: 3px;">Original Amount:</td><td style="padding: 3px; font-weight: 600;">MKW ${rollover.originalAmount.toLocaleString()}</td></tr>
                <tr><td style="padding: 3px;">Amount Paid:</td><td style="padding: 3px; font-weight: 600;">MKW ${rollover.paidAmount.toLocaleString()}</td></tr>
                <tr><td style="padding: 3px;">Remaining Principal:</td><td style="padding: 3px; font-weight: 600;">MKW ${rollover.remainingPrincipal.toLocaleString()}</td></tr>
                <tr><td style="padding: 3px;">Roll-over Interest:</td><td style="padding: 3px; font-weight: 600;">MKW ${rollover.rolloverInterest.toLocaleString()}</td></tr>
                <tr><td style="padding: 3px;">New Total Payable:</td><td style="padding: 3px; font-weight: 600; color: #f59e0b;">MKW ${rollover.rolloverTotalPayable.toLocaleString()}</td></tr>
                <tr><td style="padding: 3px;">New Loan ID:</td><td style="padding: 3px; font-weight: 600;">${rollover.rolloverLoanId}</td></tr>
              </table>
            </div>`
            : '';

          return `
            <div style="margin-bottom: 24px; padding: 20px; background-color: #fff; border-radius: 8px; border: 1px solid #e2e8f0; page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                  <h3 style="margin: 0; color: #1e293b; font-size: 15px;">${loan.loanType} - ${loan.purpose}</h3>
                  <p style="margin: 4px 0 0; color: #64748b; font-size: 11px;">Loan ID: ${loan.id} | User: ${loan.userId.substring(0, 24)}...</p>
                </div>
                <span style="padding: 4px 12px; background-color: ${getStatusBadgeColor(loan.status)}; color: white; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: capitalize;">${loan.status}</span>
              </div>

              <table style="width: 100%; margin-bottom: 10px; font-size: 11px;">
                <tr>
                  <td style="padding: 4px; color: #64748b;">Principal:</td>
                  <td style="padding: 4px; font-weight: 600;">MKW ${principal.toLocaleString()}</td>
                  <td style="padding: 4px; color: #64748b;">Interest Rate:</td>
                  <td style="padding: 4px; font-weight: 600;">${loan.interestRate}% monthly</td>
                </tr>
                <tr>
                  <td style="padding: 4px; color: #64748b;">Total Interest:</td>
                  <td style="padding: 4px; font-weight: 600;">MKW ${interest.toLocaleString()}</td>
                  <td style="padding: 4px; color: #64748b;">Period:</td>
                  <td style="padding: 4px; font-weight: 600;">${loan.repaymentPeriod} months</td>
                </tr>
                <tr>
                  <td style="padding: 4px; color: #64748b;">Total Payable:</td>
                  <td style="padding: 4px; font-weight: 600;">MKW ${loan.totalPayable.toLocaleString()}</td>
                  <td style="padding: 4px; color: #64748b;">Monthly:</td>
                  <td style="padding: 4px; font-weight: 600;">MKW ${loan.monthlyPayment.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px; color: #64748b;">Total Paid:</td>
                  <td style="padding: 4px; font-weight: 600; color: #10b981;">MKW ${totalPaidForLoan.toLocaleString()}</td>
                  <td style="padding: 4px; color: #64748b;">Outstanding:</td>
                  <td style="padding: 4px; font-weight: 600; color: ${outstanding > 0 ? '#ef4444' : '#10b981'};">MKW ${outstanding.toLocaleString()}</td>
                </tr>
                ${penalty > 0 ? `<tr>
                  <td style="padding: 4px; color: #64748b;">Late Penalty:</td>
                  <td style="padding: 4px; font-weight: 600; color: #ef4444;">MKW ${penalty.toLocaleString()}</td>
                  <td></td><td></td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 4px; color: #64748b;">Applied:</td>
                  <td style="padding: 4px; font-size: 10px;">${new Date(loan.createdAt).toLocaleDateString()}</td>
                  <td style="padding: 4px; color: #64748b;">Due:</td>
                  <td style="padding: 4px; font-size: 10px;">${loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'N/A'}</td>
                </tr>
              </table>

              ${paymentsRows.length > 0 ? `
                <h4 style="font-size: 12px; color: #1e293b; margin: 10px 0 6px;">Payment History</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <thead>
                    <tr style="background-color: #f1f5f9;">
                      <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left;">Payment ID</th>
                      <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left;">Amount</th>
                      <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left;">Type</th>
                      <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left;">Remaining</th>
                      <th style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left;">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${paymentsRows}
                  </tbody>
                </table>
              ` : ''}

              ${rolloverHtmlBlock}
            </div>
          `;
        }).join('');

      const totalRevenue = totalInterest + totalPenalties + totalRolloverAmount;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Makono Smart Loan - Statement of Account</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              padding: 30px;
              color: #1e293b;
              background-color: #f8fafc;
            }
            .header {
              text-align: center;
              margin-bottom: 24px;
              padding: 24px;
              background-color: #fff;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            .header h1 {
              color: #7c3aed;
              margin: 0;
              font-size: 26px;
            }
            .header p {
              color: #64748b;
              margin: 6px 0 0 0;
            }
            .header .confidential {
              font-size: 10px;
              color: #7c3aed;
              margin-top: 8px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }
            .summary-card {
              text-align: center;
              padding: 16px 12px;
              background-color: #fff;
              border-radius: 10px;
              border: 1px solid #e2e8f0;
            }
            .summary-value {
              font-size: 20px;
              font-weight: bold;
              color: #7c3aed;
            }
            .summary-value.green { color: #10b981; }
            .summary-value.red { color: #ef4444; }
            .summary-value.amber { color: #f59e0b; }
            .summary-label {
              font-size: 10px;
              color: #64748b;
              margin-top: 4px;
            }
            .grand-total {
              background: linear-gradient(135deg, #7c3aed, #8b5cf6);
              color: white;
              padding: 20px;
              border-radius: 12px;
              margin-bottom: 24px;
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              text-align: center;
            }
            .grand-item {
              padding: 4px;
            }
            .grand-value {
              font-size: 22px;
              font-weight: bold;
            }
            .grand-label {
              font-size: 10px;
              opacity: 0.85;
              margin-top: 4px;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              margin-top: 20px;
              font-size: 10px;
              color: #94a3b8;
            }
            @page {
              margin: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Makono Smart Loan</h1>
            <p>Statement of Account - All Loans</p>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Generated on ${new Date().toLocaleString()} | Current Interest Rate: ${currentInterestRate}% monthly</p>
            <p class="confidential">Confidential - For Administrative Use Only</p>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-value">${loans.length}</div>
              <div class="summary-label">Total Loans</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${activeLoanCount}</div>
              <div class="summary-label">Active Loans</div>
            </div>
            <div class="summary-card">
              <div class="summary-value red">${overdueLoanCount}</div>
              <div class="summary-label">Overdue</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${borrowers.length}</div>
              <div class="summary-label">Borrowers</div>
            </div>
          </div>

          <div class="grand-total">
            <div class="grand-item">
              <div class="grand-value">MKW ${totalPrincipal.toLocaleString()}</div>
              <div class="grand-label">Total Principal Lent</div>
            </div>
            <div class="grand-item">
              <div class="grand-value">MKW ${totalInterest.toLocaleString()}</div>
              <div class="grand-label">Total Interest Earned</div>
            </div>
            <div class="grand-item">
              <div class="grand-value">MKW ${totalPaid.toLocaleString()}</div>
              <div class="grand-label">Total Payments Received</div>
            </div>
            <div class="grand-item">
              <div class="grand-value">MKW ${totalOutstanding.toLocaleString()}</div>
              <div class="grand-label">Total Outstanding</div>
            </div>
          </div>

          <h2 style="font-size: 18px; color: #1e293b; margin-bottom: 16px;">Loan Details & Payment History</h2>

          ${loansHtmlContent || '<p style="color: #94a3b8; text-align: center; padding: 40px;">No loans recorded yet.</p>'}

          <div class="grand-total" style="margin-top: 24px;">
            <div class="grand-item">
              <div class="grand-value">MKW ${totalPenalties.toLocaleString()}</div>
              <div class="grand-label">Total Penalties</div>
            </div>
            <div class="grand-item">
              <div class="grand-value">MKW ${totalRolloverAmount.toLocaleString()}</div>
              <div class="grand-label">Roll-over Amounts</div>
            </div>
            <div class="grand-item">
              <div class="grand-value">MKW ${totalRevenue.toLocaleString()}</div>
              <div class="grand-label">Gross Revenue</div>
            </div>
            <div class="grand-item">
              <div class="grand-value">${rollovers.length}</div>
              <div class="grand-label">Roll-overs</div>
            </div>
          </div>

          <div class="footer">
            <p>This is a computer-generated statement of account issued by Makono Smart Loan.</p>
            <p>All amounts are in Malawian Kwacha (MKW). For any discrepancies, please contact the Super Administrator.</p>
            <p style="margin-top: 8px;">Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Statement of Account',
        UTI: 'com.adobe.pdf',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to generate statement of account:', error);
      Alert.alert('Error', 'Failed to generate Statement of Account PDF');
    }
  };

  const handleTestNotification = async (channel: 'email' | 'sms' | 'whatsapp') => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const to = channel === 'email' ? user.email : testNumber || user.phone;
    if (!to) {
      Alert.alert('Error', `No ${channel === 'email' ? 'email' : 'phone number'} available`);
      return;
    }

    const result = await sendExternalNotification({
      to,
      channel,
      subject: 'Makono Smart Loan - Test Notification',
      message: `Hello ${user.name}, this is a test ${channel} notification from Makono.`,
      recipientName: user.name,
    });

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Test ${channel} sent to ${to}`);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', result.error || `Failed to send ${channel}`);
    }
  };

  const handleSendBulkReminders = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Send Bulk Reminders',
      'This will send payment reminders to all active borrowers via their enabled channels.',
      [
        { text: 'Cancel', style: 'cancel' as const },
        {
          text: 'Send All',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Done', 'Reminders are being sent to all active borrowers.');
          },
        },
      ]
    );
  };

  const handleRequestSecurityMedia = async (loanId: string) => {
    Alert.alert(
      'Request Security Media',
      'A notification will be sent to the customer to upload a video or picture of their security/collateral.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Request sent to customer');
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#fef3c7';
      case 'approved':
      case 'active':
      case 'disbursed':
        return '#d1fae5';
      case 'rejected':
        return '#fee2e2';
      case 'overdue':
        return '#fed7d7';
      default:
        return '#f1f5f9';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#fbbf24';
      case 'approved':
      case 'active':
      case 'disbursed':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'overdue':
        return '#dc2626';
      default:
        return '#94a3b8';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#7c3aed', '#8b5cf6']} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Admin Panel</Text>
              <Text style={styles.headerSubtitle}>
                {isSuperAdmin() ? 'Super Admin' : 'Viewer'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {isSuperAdmin() && (
                <>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => {
                      setShowAdminsModal(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Eye size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => {
                      setShowCreateAccountModal(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <UserPlus size={20} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.pdfButtonsRow}>
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={generateBorrowerReport}
          >
            <Download size={16} color="#fff" />
            <Text style={styles.pdfButtonText}>Borrowers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pdfButton, styles.pdfButtonAdmin]}
            onPress={generateAdminReport}
          >
            <Download size={16} color="#fff" />
            <Text style={styles.pdfButtonText}>Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pdfButton, styles.pdfButtonStatement]}
            onPress={generateStatementOfAccount}
          >
            <ReceiptText size={16} color="#fff" />
            <Text style={styles.pdfButtonText}>Statement</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <FileText size={24} color="#7c3aed" />
            </View>
            <Text style={styles.statValue}>{stats.totalLoans}</Text>
            <Text style={styles.statLabel}>Total Loans</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <CheckCircle size={24} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{stats.approvedLoans}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <XCircle size={24} color="#ef4444" />
            </View>
            <Text style={styles.statValue}>{stats.rejectedLoans}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Users size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{stats.pendingLoans}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.revenueCard}>
          <DollarSign size={32} color="#7c3aed" />
          <View style={styles.revenueContent}>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Text style={styles.revenueValue}>
              MKW {stats.totalRevenue.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Settings size={24} color="#7c3aed" />
            <Text style={styles.settingsTitle}>Interest Rate Settings</Text>
          </View>
          
          <View style={styles.rateDisplay}>
            <Percent size={28} color="#7c3aed" />
            <View style={styles.rateContent}>
              <Text style={styles.rateLabel}>Current Interest Rate</Text>
              <Text style={styles.rateValue}>{currentInterestRate}% monthly</Text>
            </View>
          </View>

          {showRateModal ? (
            <View style={styles.rateEditSection}>
              <Text style={styles.rateEditLabel}>New Interest Rate (%)</Text>
              <View style={styles.rateInputContainer}>
                <Percent size={20} color="#7c3aed" />
                <TextInput
                  style={styles.rateInput}
                  placeholder="Enter new rate"
                  placeholderTextColor="#94a3b8"
                  value={newRate}
                  onChangeText={setNewRate}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.rateButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowRateModal(false);
                    setNewRate(currentInterestRate.toString());
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateInterestRate}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            isSuperAdmin() ? (
              <TouchableOpacity
                style={styles.changeRateButton}
                onPress={() => {
                  setShowRateModal(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Settings size={16} color="#fff" />
                <Text style={styles.changeRateButtonText}>Change Rate</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.viewOnlyBadge}>
                <Eye size={16} color="#64748b" />
                <Text style={styles.viewOnlyText}>View Only</Text>
              </View>
            )
          )}
        </View>

        {/* Notification Settings Section */}
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingsHeader}
            onPress={() => {
              setShowNotifSettings(!showNotifSettings);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Bell size={24} color="#7c3aed" />
            <Text style={styles.settingsTitle}>Notification Channels</Text>
            {showNotifSettings ? (
              <ChevronUp size={20} color="#7c3aed" />
            ) : (
              <ChevronDown size={20} color="#7c3aed" />
            )}
          </TouchableOpacity>

          {showNotifSettings && (
            <View style={styles.notifSettingsContent}>
              <Text style={styles.notifSettingsDesc}>
                Configure how customers receive automatic reminders and adjustment notifications.
              </Text>

              {/* Email Toggle */}
              <View style={styles.notifChannelRow}>
                <View style={styles.notifChannelInfo}>
                  <Mail size={20} color="#7c3aed" />
                  <View style={styles.notifChannelText}>
                    <Text style={styles.notifChannelLabel}>Email</Text>
                    <Text style={styles.notifChannelDesc}>Send reminders to borrower email addresses</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.toggleButton, emailEnabled && styles.toggleButtonActive]}
                  onPress={() => {
                    setEmailEnabled(!emailEnabled);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.toggleText, emailEnabled && styles.toggleTextActive]}>
                    {emailEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SMS Toggle */}
              <View style={styles.notifChannelRow}>
                <View style={styles.notifChannelInfo}>
                  <Smartphone size={20} color="#0891b2" />
                  <View style={styles.notifChannelText}>
                    <Text style={styles.notifChannelLabel}>SMS</Text>
                    <Text style={styles.notifChannelDesc}>Send text message reminders to borrower phones</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.toggleButton, smsEnabled && styles.toggleButtonActive]}
                  onPress={() => {
                    setSmsEnabled(!smsEnabled);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.toggleText, smsEnabled && styles.toggleTextActive]}>
                    {smsEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* WhatsApp Toggle */}
              <View style={styles.notifChannelRow}>
                <View style={styles.notifChannelInfo}>
                  <MessageCircle size={20} color="#10b981" />
                  <View style={styles.notifChannelText}>
                    <Text style={styles.notifChannelLabel}>WhatsApp</Text>
                    <Text style={styles.notifChannelDesc}>Send WhatsApp message reminders (opens WhatsApp)</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.toggleButton, whatsappEnabled && styles.toggleButtonActive]}
                  onPress={() => {
                    setWhatsappEnabled(!whatsappEnabled);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.toggleText, whatsappEnabled && styles.toggleTextActive]}>
                    {whatsappEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Test phone number input for SMS/WhatsApp testing */}
              <View style={styles.testSection}>
                <Text style={styles.testSectionTitle}>Test Notification</Text>
                <TextInput
                  style={styles.testInput}
                  placeholder="Phone number for SMS/WhatsApp test"
                  placeholderTextColor="#94a3b8"
                  value={testNumber}
                  onChangeText={setTestNumber}
                  keyboardType="phone-pad"
                />
                <View style={styles.testButtonsRow}>
                  <TouchableOpacity
                    style={styles.testEmailButton}
                    onPress={() => handleTestNotification('email')}
                  >
                    <Mail size={14} color="#fff" />
                    <Text style={styles.testButtonText}>Test Email</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.testSmsButton}
                    onPress={() => handleTestNotification('sms')}
                  >
                    <Smartphone size={14} color="#fff" />
                    <Text style={styles.testButtonText}>Test SMS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.testWaButton}
                    onPress={() => handleTestNotification('whatsapp')}
                  >
                    <MessageCircle size={14} color="#fff" />
                    <Text style={styles.testButtonText}>Test WA</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bulk Send Button */}
              <TouchableOpacity
                style={styles.bulkSendButton}
                onPress={handleSendBulkReminders}
              >
                <Send size={16} color="#fff" />
                <Text style={styles.bulkSendButtonText}>Send Reminders to All Active Borrowers</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Borrowers History</Text>

          {borrowers.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No borrowers yet</Text>
            </View>
          ) : (
            borrowers.map(borrower => {
              const isExpanded = expandedLoanId === borrower.userId;
              return (
                <View key={borrower.userId} style={styles.borrowerCard}>
                  <TouchableOpacity
                    style={styles.borrowerHeader}
                    onPress={() => {
                      setExpandedLoanId(isExpanded ? null : borrower.userId);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={styles.borrowerInfo}>
                      <View style={styles.borrowerIcon}>
                        <Users size={20} color="#7c3aed" />
                      </View>
                      <View style={styles.borrowerDetails}>
                        <Text style={styles.borrowerLabel}>User ID</Text>
                        <Text style={styles.borrowerId}>{borrower.userId.substring(0, 20)}...</Text>
                      </View>
                    </View>
                    <View style={styles.borrowerStats}>
                      <View style={styles.borrowerStatItem}>
                        <Text style={styles.borrowerStatValue}>{borrower.totalLoans}</Text>
                        <Text style={styles.borrowerStatLabel}>Total</Text>
                      </View>
                      <View style={styles.borrowerStatItem}>
                        <Text style={[styles.borrowerStatValue, { color: '#10b981' }]}>
                          {borrower.activeLoanCount}
                        </Text>
                        <Text style={styles.borrowerStatLabel}>Active</Text>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={20} color="#7c3aed" />
                      ) : (
                        <ChevronDown size={20} color="#7c3aed" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.borrowerLoansSection}>
                      <View style={styles.borrowerSummary}>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Total Borrowed</Text>
                          <Text style={styles.summaryValue}>
                            MKW {borrower.totalBorrowed.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.loansHistoryTitle}>Loan History</Text>
                      {borrower.loans.map(loan => (
                        <View key={loan.id} style={styles.historyLoanCard}>
                          <View style={styles.historyLoanHeader}>
                            <View>
                              <Text style={styles.historyLoanType}>{loan.loanType}</Text>
                              <Text style={styles.historyLoanAmount}>
                                MKW {loan.amount.toLocaleString()}
                              </Text>
                            </View>
                            <View style={[styles.historyStatusBadge, { backgroundColor: getStatusBadgeColor(loan.status) }]}>
                              <Text style={styles.historyStatusText}>{loan.status}</Text>
                            </View>
                          </View>
                          <View style={styles.historyLoanDetails}>
                            <Text style={styles.historyLoanDetailText}>
                              Applied: {new Date(loan.createdAt).toLocaleDateString()}
                            </Text>
                            {loan.dueDate && (
                              <Text style={styles.historyLoanDetailText}>
                                Due: {new Date(loan.dueDate).toLocaleDateString()}
                              </Text>
                            )}
                            {loan.isOverdue && loan.latePaymentPenalty && (
                              <Text style={[styles.historyLoanDetailText, { color: '#ef4444' }]}>
                                Penalty: MKW {loan.latePaymentPenalty.toFixed(2)}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Loan Applications</Text>

          {loans.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No loan applications yet</Text>
            </View>
          ) : (
            loans.map(loan => (
              <View
                key={loan.id}
                style={[
                  styles.loanCard,
                  { backgroundColor: getStatusColor(loan.status) },
                ]}
              >
                <View style={styles.loanHeader}>
                  <View style={styles.loanInfo}>
                    <Text style={styles.loanType}>{loan.loanType}</Text>
                    <Text style={styles.loanAmount}>
                      MKW {loan.amount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{loan.status}</Text>
                  </View>
                </View>

                <View style={styles.loanDetails}>
                  <View style={styles.loanDetail}>
                    <Text style={styles.loanDetailLabel}>Purpose</Text>
                    <Text style={styles.loanDetailValue}>{loan.purpose}</Text>
                  </View>
                  <View style={styles.loanDetail}>
                    <Text style={styles.loanDetailLabel}>Period</Text>
                    <Text style={styles.loanDetailValue}>
                      {loan.repaymentPeriod} months
                    </Text>
                  </View>
                </View>

                <View style={styles.loanDetails}>
                  <View style={styles.loanDetail}>
                    <Text style={styles.loanDetailLabel}>Monthly Payment</Text>
                    <Text style={styles.loanDetailValue}>
                      MKW {loan.monthlyPayment.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.loanDetail}>
                    <Text style={styles.loanDetailLabel}>Total Payable</Text>
                    <Text style={styles.loanDetailValue}>
                      MKW {loan.totalPayable.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {loan.status === 'pending' && canApproveLoans() && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApproveLoan(loan.id)}
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectLoan(loan.id)}
                    >
                      <XCircle size={16} color="#fff" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {loan.status === 'pending' && !canApproveLoans() && (
                  <View style={styles.viewOnlyBadge}>
                    <Eye size={16} color="#64748b" />
                    <Text style={styles.viewOnlyText}>View Only - Awaiting Super Admin Approval</Text>
                  </View>
                )}

                {loan.status === 'approved' && (
                  <View style={styles.approvedActions}>
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => {
                        setExpandedLoanId(expandedLoanId === loan.id ? null : loan.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={styles.expandButtonText}>
                        {expandedLoanId === loan.id ? 'Hide Actions' : 'Show Actions'}
                      </Text>
                    </TouchableOpacity>

                    {expandedLoanId === loan.id && (
                      <View style={styles.expandedContent}>
                        {!loan.securityDocsRequested && canApproveLoans() && (
                          <TouchableOpacity
                            style={styles.securityButton}
                            onPress={() => handleRequestSecurityDocs(loan.id)}
                          >
                            <Shield size={16} color="#fff" />
                            <Text style={styles.securityButtonText}>
                              Request Security Documents
                            </Text>
                          </TouchableOpacity>
                        )}

                        {loan.securityDocsRequested && !loan.securityDocsSubmitted && (
                          <View style={styles.statusInfo}>
                            <Clock size={16} color="#f59e0b" />
                            <Text style={styles.statusInfoText}>
                              Waiting for security documents
                            </Text>
                          </View>
                        )}

                        {loan.securityDocsSubmitted && (
                          <View style={styles.documentsSection}>
                            <Text style={styles.documentsSectionTitle}>
                              Security Documents:
                            </Text>
                            {getLoanDocuments(loan.id)
                              .filter(doc => doc.type === 'security')
                              .map(doc => (
                                <View key={doc.id} style={styles.documentItem}>
                                  <FileText size={16} color="#7c3aed" />
                                  <Text style={styles.documentName}>{doc.fileName}</Text>
                                </View>
                              ))}
                          </View>
                        )}

                        {!loan.paymentProofUploaded && canUploadPayment() && (
                          <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={() => handleUploadPaymentProof(loan.id)}
                          >
                            <Upload size={16} color="#fff" />
                            <Text style={styles.uploadButtonText}>
                              Upload Proof of Payment
                            </Text>
                          </TouchableOpacity>
                        )}

                        {loan.paymentProofUploaded && !loan.paymentAcknowledged && (
                          <View style={styles.statusInfo}>
                            <CheckCircle size={16} color="#10b981" />
                            <Text style={styles.statusInfoText}>
                              Payment proof uploaded, waiting for customer acknowledgment
                            </Text>
                          </View>
                        )}

                        {loan.paymentAcknowledged && (
                          <View style={styles.statusInfo}>
                            <CheckCircle size={16} color="#10b981" />
                            <Text style={styles.statusInfoText}>
                              Payment acknowledged by customer
                            </Text>
                          </View>
                        )}

                        {canApproveLoans() && (
                          <TouchableOpacity
                            style={styles.cameraButton}
                            onPress={() => handleRequestSecurityMedia(loan.id)}
                          >
                            <Camera size={16} color="#fff" />
                            <Text style={styles.cameraButtonText}>
                              Request Video/Picture of Security
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCreateAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Account</Text>
            <Text style={styles.modalSubtitle}>
              Create a new user or admin viewer account
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
                value={accountName}
                onChangeText={setAccountName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#7c3aed" />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#94a3b8"
                value={accountEmail}
                onChangeText={setAccountEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor="#94a3b8"
                value={accountPhone}
                onChangeText={setAccountPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.roleSelector}>
              <Text style={styles.roleSelectorLabel}>Account Type:</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    accountRole === 'user' && styles.roleButtonActive,
                  ]}
                  onPress={() => {
                    setAccountRole('user');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      accountRole === 'user' && styles.roleButtonTextActive,
                    ]}
                  >
                    User
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    accountRole === 'admin_viewer' && styles.roleButtonActive,
                  ]}
                  onPress={() => {
                    setAccountRole('admin_viewer');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      accountRole === 'admin_viewer' && styles.roleButtonTextActive,
                    ]}
                  >
                    Admin Viewer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreateAccountModal(false);
                  setAccountName('');
                  setAccountEmail('');
                  setAccountPhone('');
                  setAccountRole('user');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCreateAccount}
              >
                <Text style={styles.modalConfirmText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAdminsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdminsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Admin Viewers</Text>
            <Text style={styles.modalSubtitle}>
              Users with view-only access
            </Text>

            <ScrollView style={styles.adminsList}>
              {getAllAdmins().length === 0 ? (
                <View style={styles.emptyAdmins}>
                  <Users size={48} color="#cbd5e1" />
                  <Text style={styles.emptyAdminsText}>
                    No admin viewers yet
                  </Text>
                </View>
              ) : (
                getAllAdmins().map((admin: User) => (
                  <View key={admin.id} style={styles.adminItem}>
                    <View style={styles.adminIcon}>
                      <Eye size={20} color="#7c3aed" />
                    </View>
                    <View style={styles.adminInfo}>
                      <Text style={styles.adminEmail}>{admin.email}</Text>
                      <Text style={styles.adminDate}>
                        Invited {new Date(admin.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowAdminsModal(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingBottom: 24,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  revenueCard: {
    backgroundColor: '#f3e8ff',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  revenueContent: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600' as const,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#7c3aed',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
  loanCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  loanInfo: {
    flex: 1,
  },
  loanType: {
    fontSize: 14,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  loanAmount: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginTop: 4,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  loanDetails: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  loanDetail: {
    flex: 1,
  },
  loanDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  loanDetailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  rateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f3e8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  rateContent: {
    flex: 1,
  },
  rateLabel: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600' as const,
  },
  rateValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#7c3aed',
    marginTop: 4,
  },
  changeRateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
  },
  changeRateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  rateEditSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  rateEditLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 8,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  rateInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 12,
  },
  rateButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  approvedActions: {
    marginTop: 16,
  },
  expandButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  expandedContent: {
    marginTop: 12,
    gap: 12,
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    borderRadius: 12,
  },
  securityButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 12,
  },
  cameraButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 12,
    borderRadius: 12,
  },
  statusInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500' as const,
  },
  documentsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 12,
    borderRadius: 12,
  },
  documentsSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  documentName: {
    fontSize: 12,
    color: '#64748b',
  },
  viewOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  viewOnlyText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  adminsList: {
    maxHeight: 300,
    marginBottom: 24,
  },
  emptyAdmins: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyAdminsText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
  adminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  adminIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminInfo: {
    flex: 1,
  },
  adminEmail: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  adminDate: {
    fontSize: 12,
    color: '#64748b',
  },
  modalCloseButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  roleSelector: {
    marginBottom: 24,
  },
  roleSelectorLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleButtonActive: {
    backgroundColor: '#f3e8ff',
    borderColor: '#7c3aed',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  roleButtonTextActive: {
    color: '#7c3aed',
  },
  borrowerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  borrowerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  borrowerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  borrowerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  borrowerDetails: {
    flex: 1,
  },
  borrowerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  borrowerId: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  borrowerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  borrowerStatItem: {
    alignItems: 'center',
  },
  borrowerStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#7c3aed',
  },
  borrowerStatLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  borrowerLoansSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  borrowerSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  loansHistoryTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 12,
  },
  historyLoanCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  historyLoanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyLoanType: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  historyLoanAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginTop: 2,
  },
  historyStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
    textTransform: 'capitalize',
  },
  historyLoanDetails: {
    gap: 4,
  },
  historyLoanDetailText: {
    fontSize: 11,
    color: '#64748b',
  },
  pdfButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  pdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  pdfButtonAdmin: {
    backgroundColor: '#7c3aed',
  },
  pdfButtonStatement: {
    backgroundColor: '#0891b2',
  },
  pdfButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  notifSettingsContent: {
    paddingTop: 16,
  },
  notifSettingsDesc: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  notifChannelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  notifChannelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  notifChannelText: {
    flex: 1,
  },
  notifChannelLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  notifChannelDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#7c3aed',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#fff',
  },
  testSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  testSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 12,
  },
  testInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  testButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testEmailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    borderRadius: 10,
  },
  testSmsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0891b2',
    paddingVertical: 10,
    borderRadius: 10,
  },
  testWaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 10,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  bulkSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  bulkSendButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
