import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLoans } from '@/contexts/LoanContext';
import { DollarSign, Calendar, Percent, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function CalculatorScreen() {
  const { calculateLoan, currentInterestRate } = useLoans();
  const [amount, setAmount] = useState<string>('10000');
  const [months, setMonths] = useState<string>('1');
  const [interestRate, setInterestRate] = useState<string>(currentInterestRate.toString());

  const calculation = amount && months && interestRate
    ? calculateLoan(
        parseFloat(amount) || 0,
        parseFloat(interestRate) || 0,
        parseInt(months) || 1
      )
    : null;

  const handleInputChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0891b2', '#06b6d4']} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <Text style={styles.headerTitle}>Loan Calculator</Text>
          <Text style={styles.headerSubtitle}>
            Calculate your monthly payments
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.inputSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Loan Amount (MKW)</Text>
            <View style={styles.inputContainer}>
              <DollarSign size={20} color="#0891b2" />
              <TextInput
                style={styles.input}
                placeholder="10000"
                placeholderTextColor="#94a3b8"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  handleInputChange();
                }}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Repayment Period (months)</Text>
            <View style={styles.inputContainer}>
              <Calendar size={20} color="#0891b2" />
              <TextInput
                style={styles.input}
                placeholder="12"
                placeholderTextColor="#94a3b8"
                value={months}
                onChangeText={(text) => {
                  setMonths(text);
                  handleInputChange();
                }}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Interest Rate (% monthly)</Text>
            <View style={styles.inputContainer}>
              <Percent size={20} color="#0891b2" />
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor="#94a3b8"
                value={interestRate}
                onChangeText={(text) => {
                  setInterestRate(text);
                  handleInputChange();
                }}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {calculation && (
          <>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <TrendingUp size={28} color="#0891b2" />
                <Text style={styles.resultTitle}>Your Monthly Payment</Text>
              </View>
              <Text style={styles.resultValue}>
                MKW {calculation.monthlyPayment.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Loan Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Principal Amount</Text>
                <Text style={styles.summaryValue}>
                  MKW {calculation.loanAmount.toLocaleString()}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Interest</Text>
                <Text style={styles.summaryValue}>
                  MKW {calculation.totalInterest.toFixed(2)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>Total Payable</Text>
                <Text style={styles.summaryValueBold}>
                  MKW {calculation.totalPayable.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleTitle}>Amortization Schedule</Text>
              <View style={styles.scheduleHeader}>
                <Text style={[styles.scheduleHeaderText, { flex: 1 }]}>Month</Text>
                <Text style={[styles.scheduleHeaderText, { flex: 2 }]}>Payment</Text>
                <Text style={[styles.scheduleHeaderText, { flex: 2 }]}>Principal</Text>
                <Text style={[styles.scheduleHeaderText, { flex: 2 }]}>Interest</Text>
                <Text style={[styles.scheduleHeaderText, { flex: 2 }]}>Balance</Text>
              </View>

              <ScrollView style={styles.scheduleScroll} nestedScrollEnabled>
                {calculation.amortizationSchedule.map((entry) => (
                  <View key={entry.month} style={styles.scheduleRow}>
                    <Text style={[styles.scheduleCell, { flex: 1 }]}>
                      {entry.month}
                    </Text>
                    <Text style={[styles.scheduleCell, { flex: 2 }]}>
                      MKW {entry.payment.toFixed(2)}
                    </Text>
                    <Text style={[styles.scheduleCell, { flex: 2 }]}>
                      MKW {entry.principal.toFixed(2)}
                    </Text>
                    <Text style={[styles.scheduleCell, { flex: 2 }]}>
                      MKW {entry.interest.toFixed(2)}
                    </Text>
                    <Text style={[styles.scheduleCell, { flex: 2 }]}>
                      MKW {entry.balance.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
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
  },
  inputSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
    marginBottom: 8,
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
  resultCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#0891b2',
  },
  resultValue: {
    fontSize: 42,
    fontWeight: '700' as const,
    color: '#0891b2',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  summaryValueBold: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0891b2',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  scheduleHeaderText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#64748b',
    textAlign: 'center',
  },
  scheduleScroll: {
    maxHeight: 400,
  },
  scheduleRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  scheduleCell: {
    fontSize: 12,
    color: '#1e293b',
    textAlign: 'center',
  },
});
