import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Banknote, Shield, Zap, DollarSign } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0891b2', '#06b6d4', '#22d3ee']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Banknote size={48} color="#fff" strokeWidth={2.5} />
              </View>
              <Text style={styles.title}>Makono Smart Loan</Text>
              <Text style={styles.subtitle}>Your trusted financial partner</Text>
            </View>

            <View style={styles.features}>
              <View style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Zap size={24} color="#0891b2" />
                </View>
                <Text style={styles.featureTitle}>Quick Approval</Text>
                <Text style={styles.featureText}>Get approved in minutes</Text>
              </View>

              <View style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Shield size={24} color="#0891b2" />
                </View>
                <Text style={styles.featureTitle}>Secure & Safe</Text>
                <Text style={styles.featureText}>Your data is protected</Text>
              </View>

              <View style={styles.feature}>
                <View style={styles.featureIcon}>
                  <DollarSign size={24} color="#0891b2" />
                </View>
                <Text style={styles.featureTitle}>Low Interest</Text>
                <Text style={styles.featureText}>Competitive rates</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/register')}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.secondaryButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  feature: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  actions: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#0891b2',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
