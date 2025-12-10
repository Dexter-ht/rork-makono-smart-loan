import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { verifyOTP, generateOTP } = useAuth();
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit !== '') && newOtp.length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code: string) => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found');
      return;
    }

    setIsLoading(true);
    const result = await verifyOTP(userId, code);
    setIsLoading(false);

    if (result.success) {
      router.replace('/(tabs)/dashboard');
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!userId) return;

    const result = await generateOTP(userId);
    if (result.success) {
      Alert.alert('OTP Sent', `Your new OTP is: ${result.otp}`);
    } else {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0891b2', '#06b6d4']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to your phone
              </Text>
            </View>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => { inputRefs.current[index] = ref; }}
                  style={[styles.otpInput, digit && styles.otpInputFilled]}
                  value={digit}
                  onChangeText={value => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
            >
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Verifying...</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: 24,
    fontWeight: '600' as const,
    textAlign: 'center',
    color: '#0891b2',
  },
  otpInputFilled: {
    backgroundColor: '#fff',
  },
  resendButton: {
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600' as const,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    marginTop: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500' as const,
  },
});
