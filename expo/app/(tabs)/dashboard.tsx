import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLoans } from '@/contexts/LoanContext';
import { useRouter } from 'expo-router';
import { DollarSign, FileText, LogOut, Clock, CheckCircle, XCircle, Upload, Shield, Bell, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { getUserLoans, acknowledgePayment, uploadDocument, getLoanDocuments, getUserNotifications, markNotificationAsRead } = useLoans();
  const userLoans = getUserLoans();
  const notifications = getUserNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const [refreshing, setRefreshing] = React.useState(false);
  const [expandedLoanId, setExpandedLoanId] = React.useState<string | null>(null);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleUploadSecurityDocs = async (loanId: string) => {
    Alert.alert(
      'Upload Security Documents',
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
              await uploadSecurityDoc(loanId, result.assets[0].uri, `security_${Date.now()}.jpg`);
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
              mediaTypes: ['images', 'videos'],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              const fileName = result.assets[0].type === 'video' 
                ? `security_video_${Date.now()}.mp4`
                : `security_${Date.now()}.jpg`;
              await uploadSecurityDoc(loanId, result.assets[0].uri, fileName);
            }
          },
        },
        {
          text: 'Choose Document',
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['image/*', 'video/*', 'application/pdf'],
            });

            if (!result.canceled && result.assets[0]) {
              await uploadSecurityDoc(loanId, result.assets[0].uri, result.assets[0].name);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadSecurityDoc = async (loanId: string, uri: string, fileName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await uploadDocument('security', uri, fileName, loanId);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Security document uploaded successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to upload document');
    }
  };

  const handleAcknowledgePayment = async (loanId: string) => {
    Alert.alert(
      'Acknowledge Payment',
      'Confirm that you have received the loan amount?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const result = await acknowledgePayment(loanId);
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Payment acknowledged successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to acknowledge payment');
            }
          },
        },
      ]
    );
  };

  const totalBorrowed = userLoans
    .filter(l => l.status === 'approved')
    .reduce((sum, l) => sum + l.amount, 0);

  const pendingLoans = userLoans.filter(l => l.status === 'pending').length;
  const approvedLoans = userLoans.filter(l => l.status === 'approved').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} color="#f59e0b" />;
      case 'approved':
        return <CheckCircle size={20} color="#10b981" />;
      case 'rejected':
        return <XCircle size={20} color="#ef4444" />;
      default:
        return null;
    }
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

  const handleNotificationPress = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0891b2', '#06b6d4']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.name}</Text>
            </View>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length > 0 && (
          <View style={styles.notificationsSection}>
            <View style={styles.notificationsHeader}>
              <Bell size={20} color="#0891b2" />
              <Text style={styles.notificationsTitle}>Notifications</Text>
            </View>
            {notifications.slice(0, 3).map(notif => (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notificationCard, !notif.read && styles.notificationCardUnread]}
                onPress={() => handleNotificationPress(notif.id)}
              >
                <View style={styles.notificationIcon}>
                  {notif.type === 'loan_disbursed' && <CheckCircle size={16} color="#10b981" />}
                  {notif.type === 'payment_reminder' && <Clock size={16} color="#f59e0b" />}
                  {notif.type === 'payment_overdue' && <AlertCircle size={16} color="#ef4444" />}
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notif.title}</Text>
                  <Text style={styles.notificationMessage}>{notif.message}</Text>
                  <Text style={styles.notificationTime}>
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <DollarSign size={24} color="#0891b2" />
            </View>
            <Text style={styles.statValue}>
              MKW {totalBorrowed.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Borrowed</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <FileText size={24} color="#0891b2" />
            </View>
            <Text style={styles.statValue}>{approvedLoans}</Text>
            <Text style={styles.statLabel}>Active Loans</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Clock size={24} color="#0891b2" />
            </View>
            <Text style={styles.statValue}>{pendingLoans}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Loans</Text>
          {userLoans.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No loans yet</Text>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => router.push('/apply')}
              >
                <Text style={styles.applyButtonText}>Apply for a Loan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            userLoans.map(loan => (
              <View key={loan.id} style={[styles.loanCard, { backgroundColor: getStatusColor(loan.status) }]}>
                <View style={styles.loanHeader}>
                  <View>
                    <Text style={styles.loanType}>{loan.loanType}</Text>
                    <Text style={styles.loanAmount}>MKW {loan.amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    {getStatusIcon(loan.status)}
                    <Text style={styles.statusText}>{loan.status}</Text>
                  </View>
                </View>
                <View style={styles.loanDetails}>
                  <View style={styles.loanDetail}>
                    <Text style={styles.loanDetailLabel}>Repayment Period</Text>
                    <Text style={styles.loanDetailValue}>
                      {loan.repaymentPeriod} months
                    </Text>
                  </View>
                  <View style={styles.loanDetail}>
                    <Text style={styles.loanDetailLabel}>Total Payable</Text>
                    <Text style={styles.loanDetailValue}>
                      MKW {loan.totalPayable.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {loan.dueDate && (
                  <View style={styles.dueDateSection}>
                    <Clock size={14} color="#64748b" />
                    <Text style={styles.dueDateText}>
                      Due: {new Date(loan.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {loan.isOverdue && loan.latePaymentPenalty && (
                  <View style={styles.penaltySection}>
                    <AlertCircle size={14} color="#ef4444" />
                    <Text style={styles.penaltyText}>
                      Late payment penalty: MKW {loan.latePaymentPenalty.toFixed(2)} (2%)
                    </Text>
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
                        {expandedLoanId === loan.id ? 'Hide Details' : 'View Details'}
                      </Text>
                    </TouchableOpacity>

                    {expandedLoanId === loan.id && (
                      <View style={styles.expandedContent}>
                        <View style={styles.repaymentTermsSection}>
                          <Text style={styles.repaymentTermsTitle}>Repayment Terms</Text>
                          <View style={styles.termRow}>
                            <Text style={styles.termLabel}>Loan Amount:</Text>
                            <Text style={styles.termValue}>MKW {loan.amount.toLocaleString()}</Text>
                          </View>
                          <View style={styles.termRow}>
                            <Text style={styles.termLabel}>Interest Rate:</Text>
                            <Text style={styles.termValue}>{loan.interestRate}% monthly</Text>
                          </View>
                          <View style={styles.termRow}>
                            <Text style={styles.termLabel}>Repayment Period:</Text>
                            <Text style={styles.termValue}>{loan.repaymentPeriod} months</Text>
                          </View>
                          <View style={styles.termRow}>
                            <Text style={styles.termLabel}>Total Interest:</Text>
                            <Text style={styles.termValue}>
                              MKW {(loan.totalPayable - loan.amount).toFixed(2)}
                            </Text>
                          </View>
                          <View style={[styles.termRow, styles.termRowTotal]}>
                            <Text style={styles.termLabelTotal}>Total Payable:</Text>
                            <Text style={styles.termValueTotal}>
                              MKW {loan.totalPayable.toFixed(2)}
                            </Text>
                          </View>
                        </View>

                        {loan.securityDocsRequested && !loan.securityDocsSubmitted && (
                          <View style={styles.requestSection}>
                            <View style={styles.requestHeader}>
                              <Shield size={20} color="#f59e0b" />
                              <Text style={styles.requestTitle}>Security Documents Requested</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.uploadActionButton}
                              onPress={() => handleUploadSecurityDocs(loan.id)}
                            >
                              <Upload size={16} color="#fff" />
                              <Text style={styles.uploadActionButtonText}>Upload Documents</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {loan.securityDocsSubmitted && (
                          <View style={styles.statusSection}>
                            <CheckCircle size={16} color="#10b981" />
                            <Text style={styles.statusSectionText}>Security documents submitted</Text>
                          </View>
                        )}

                        {loan.paymentProofUploaded && !loan.paymentAcknowledged && (
                          <View style={styles.requestSection}>
                            <View style={styles.requestHeader}>
                              <DollarSign size={20} color="#10b981" />
                              <Text style={styles.requestTitle}>Payment Proof Available</Text>
                            </View>
                            <View style={styles.documentsList}>
                              {getLoanDocuments(loan.id)
                                .filter(doc => doc.type === 'payment_proof')
                                .map(doc => (
                                  <View key={doc.id} style={styles.documentItemCustomer}>
                                    <FileText size={16} color="#0891b2" />
                                    <Text style={styles.documentNameCustomer}>{doc.fileName}</Text>
                                  </View>
                                ))}
                            </View>
                            <TouchableOpacity
                              style={styles.acknowledgeButton}
                              onPress={() => handleAcknowledgePayment(loan.id)}
                            >
                              <CheckCircle size={16} color="#fff" />
                              <Text style={styles.acknowledgeButtonText}>Acknowledge Receipt</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {loan.paymentAcknowledged && (
                          <View style={styles.statusSection}>
                            <CheckCircle size={16} color="#10b981" />
                            <Text style={styles.statusSectionText}>Payment acknowledged</Text>
                          </View>
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
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 4,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
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
    marginBottom: 24,
  },
  applyButton: {
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  approvedActions: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 16,
  },
  expandButton: {
    backgroundColor: '#0891b2',
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
  requestSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  uploadActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadActionButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 12,
    borderRadius: 12,
  },
  statusSectionText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500' as const,
  },
  documentsList: {
    gap: 8,
    marginBottom: 12,
  },
  documentItemCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  documentNameCustomer: {
    fontSize: 13,
    color: '#1e293b',
    flex: 1,
  },
  acknowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
  },
  acknowledgeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: 32,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  notificationBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  notificationsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  notificationsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  notificationCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  notificationCardUnread: {
    backgroundColor: '#e0f2fe',
    borderLeftWidth: 4,
    borderLeftColor: '#0891b2',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  dueDateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  dueDateText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  penaltySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  penaltyText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600' as const,
    flex: 1,
  },
  repaymentTermsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  repaymentTermsTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 12,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  termLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  termValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  termRowTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  termLabelTotal: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  termValueTotal: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#0891b2',
  },
});
