import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLoans } from '@/contexts/LoanContext';
import {
  DollarSign,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Camera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function PaymentsScreen() {
  const {
    getUserLoans,
    getUserPayments,
    getUserRollovers,
    getLoanRollover,
    recordPayment,
    getLoanPayments,
  } = useLoans();

  const userLoans = getUserLoans();
  const allPayments = getUserPayments();
  const userRollovers = getUserRollovers();

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const activeLoans = userLoans.filter(
    l => l.status === 'approved' || l.status === 'disbursed' || l.status === 'active'
  );

  const selectedLoan = activeLoans.find(l => l.id === selectedLoanId);
  const loanRollover = selectedLoanId ? getLoanRollover(selectedLoanId) : undefined;
  const loanPayments = selectedLoanId ? getLoanPayments(selectedLoanId) : [];

  const handlePickProof = async () => {
    Alert.alert('Upload Proof', 'Choose how to upload your payment proof:', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission Required', 'Camera permission is required');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            setProofImage(result.assets[0].uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission Required', 'Gallery permission is required');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            setProofImage(result.assets[0].uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            setProofImage(result.assets[0].uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmitPayment = async () => {
    if (!selectedLoanId) {
      Alert.alert('Error', 'Please select a loan');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    if (!proofImage) {
      Alert.alert('Error', 'Please upload proof of payment');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await recordPayment(selectedLoanId, amount, proofImage, 'payment_proof.jpg');

    setIsSubmitting(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.rolloverCalculated) {
        Alert.alert(
          'Payment Recorded',
          'Your partial payment has been recorded. The remaining balance has been rolled over into a new loan. Check the roll-over details below.',
        );
      } else {
        Alert.alert('Success', 'Payment recorded successfully');
      }
      setPaymentAmount('');
      setProofImage(null);
      setSelectedLoanId(null);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', result.error || 'Failed to record payment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
      case 'disbursed':
        return '#d1fae5';
      case 'overdue':
        return '#fee2e2';
      default:
        return '#f1f5f9';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0891b2', '#06b6d4']} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <Text style={styles.headerTitle}>Payment History</Text>
          <Text style={styles.headerSubtitle}>
            Record payments and view roll-overs
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {activeLoans.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No active loans</Text>
            <Text style={styles.emptySubtext}>
              Payments can be recorded once your loan is approved
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Record a Payment</Text>

              <View style={styles.loanPicker}>
                <Text style={styles.label}>Select Loan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {activeLoans.map(loan => (
                    <TouchableOpacity
                      key={loan.id}
                      style={[
                        styles.loanChip,
                        selectedLoanId === loan.id && styles.loanChipSelected,
                        { backgroundColor: getStatusColor(loan.status) },
                      ]}
                      onPress={() => {
                        setSelectedLoanId(loan.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={styles.loanChipType}>{loan.loanType}</Text>
                      <Text style={styles.loanChipAmount}>
                        MKW {loan.amount.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {selectedLoan && (
                <View style={styles.paymentForm}>
                  <View style={styles.loanSummary}>
                    <View style={styles.loanSummaryRow}>
                      <Text style={styles.loanSummaryLabel}>Total Payable:</Text>
                      <Text style={styles.loanSummaryValue}>
                        MKW {selectedLoan.totalPayable.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.loanSummaryRow}>
                      <Text style={styles.loanSummaryLabel}>Paid So Far:</Text>
                      <Text style={[styles.loanSummaryValue, { color: '#10b981' }]}>
                        MKW {(selectedLoan.totalPaidSoFar ?? 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.loanSummaryRow}>
                      <Text style={styles.loanSummaryLabel}>Remaining:</Text>
                      <Text style={[styles.loanSummaryValue, { color: '#ef4444' }]}>
                        MKW {(selectedLoan.remainingBalance ?? selectedLoan.totalPayable).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Payment Amount (MKW)</Text>
                    <View style={styles.inputContainer}>
                      <DollarSign size={20} color="#0891b2" />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter amount"
                        placeholderTextColor="#94a3b8"
                        value={paymentAmount}
                        onChangeText={setPaymentAmount}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Proof of Payment</Text>
                    {proofImage ? (
                      <View style={styles.proofPreview}>
                        <Image source={{ uri: proofImage }} style={styles.proofImage} />
                        <TouchableOpacity
                          style={styles.changeProofButton}
                          onPress={handlePickProof}
                        >
                          <Text style={styles.changeProofText}>Change</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.uploadButton} onPress={handlePickProof}>
                        <Camera size={24} color="#0891b2" />
                        <Text style={styles.uploadButtonText}>Upload Proof</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmitPayment}
                    disabled={isSubmitting}
                  >
                    <Upload size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>
                      {isSubmitting ? 'Recording...' : 'Record Payment'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {loanRollover && (
                <View style={styles.rolloverCard}>
                  <View style={styles.rolloverHeader}>
                    <RefreshCw size={20} color="#f59e0b" />
                    <Text style={styles.rolloverTitle}>Roll-over Details</Text>
                  </View>
                  <View style={styles.rolloverRow}>
                    <Text style={styles.rolloverLabel}>Original Amount:</Text>
                    <Text style={styles.rolloverValue}>
                      MKW {loanRollover.originalAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.rolloverRow}>
                    <Text style={styles.rolloverLabel}>Amount Paid:</Text>
                    <Text style={[styles.rolloverValue, { color: '#10b981' }]}>
                      MKW {loanRollover.paidAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.rolloverRow}>
                    <Text style={styles.rolloverLabel}>Remaining Principal:</Text>
                    <Text style={styles.rolloverValue}>
                      MKW {loanRollover.remainingPrincipal.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.rolloverDivider} />
                  <View style={styles.rolloverRow}>
                    <Text style={styles.rolloverLabel}>Roll-over Interest:</Text>
                    <Text style={styles.rolloverValue}>
                      MKW {loanRollover.rolloverInterest.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.rolloverRow}>
                    <Text style={styles.rolloverLabel}>New Total Payable:</Text>
                    <Text style={[styles.rolloverValue, { color: '#0891b2', fontWeight: '700' }]}>
                      MKW {loanRollover.rolloverTotalPayable.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.rolloverRow}>
                    <Text style={styles.rolloverLabel}>New Period:</Text>
                    <Text style={styles.rolloverValue}>
                      {loanRollover.rolloverPeriod} months
                    </Text>
                  </View>
                  <View style={styles.rolloverRow}>
                    <Text style={styles.rolloverLabel}>Monthly Payment:</Text>
                    <Text style={styles.rolloverValue}>
                      MKW {loanRollover.rolloverMonthlyPayment.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              {allPayments.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Clock size={32} color="#cbd5e1" />
                  <Text style={styles.emptyHistoryText}>No payments yet</Text>
                </View>
              ) : (
                allPayments.map(payment => {
                  const relatedLoan = userLoans.find(l => l.id === payment.loanId);
                  return (
                    <View key={payment.id} style={styles.paymentCard}>
                      <View style={styles.paymentHeader}>
                        <View style={styles.paymentIcon}>
                          {payment.isPartial ? (
                            <AlertCircle size={20} color="#f59e0b" />
                          ) : (
                            <CheckCircle size={20} color="#10b981" />
                          )}
                        </View>
                        <View style={styles.paymentInfo}>
                          <Text style={styles.paymentAmount}>
                            MKW {payment.amount.toLocaleString()}
                          </Text>
                          <Text style={styles.paymentLoan}>
                            {relatedLoan?.loanType ?? 'Loan'} — {relatedLoan ? `MKW ${relatedLoan.amount.toLocaleString()}` : ''}
                          </Text>
                        </View>
                        <View style={styles.paymentMeta}>
                          {payment.isPartial && (
                            <View style={styles.partialBadge}>
                              <Text style={styles.partialBadgeText}>Partial</Text>
                            </View>
                          )}
                          {payment.rolloverCalculated && (
                            <View style={styles.rolloverBadge}>
                              <Text style={styles.rolloverBadgeText}>Roll-over</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.paymentDetails}>
                        <Text style={styles.paymentDate}>
                          {new Date(payment.paidAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        {payment.rolloverCalculated && (
                          <View style={styles.paymentRolloverInfo}>
                            <RefreshCw size={12} color="#f59e0b" />
                            <Text style={styles.paymentRolloverText}>
                              New balance: MKW {payment.rolloverTotalPayable?.toFixed(2)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
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
    paddingBottom: 40,
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
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 8,
  },
  loanPicker: {
    marginBottom: 20,
  },
  loanChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minWidth: 140,
    alignItems: 'center',
  },
  loanChipSelected: {
    borderColor: '#0891b2',
  },
  loanChipType: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1e293b',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  loanChipAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  paymentForm: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  loanSummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  loanSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  loanSummaryLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  loanSummaryValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  inputGroup: {
    marginBottom: 16,
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
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0f2fe',
    borderStyle: 'dashed',
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#0891b2',
  },
  proofPreview: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  proofImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeProofButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#0891b2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeProofText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0891b2',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  rolloverCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  rolloverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  rolloverTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#92400e',
  },
  rolloverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rolloverLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  rolloverValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  rolloverDivider: {
    height: 1,
    backgroundColor: '#fde68a',
    marginVertical: 12,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  paymentLoan: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  paymentMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  partialBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  partialBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#92400e',
  },
  rolloverBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rolloverBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#0891b2',
  },
  paymentDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  paymentDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  paymentRolloverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  paymentRolloverText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500' as const,
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
  emptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyHistory: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
});
