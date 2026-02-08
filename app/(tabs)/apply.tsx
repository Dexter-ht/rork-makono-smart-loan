import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLoans } from '@/contexts/LoanContext';
import { LOAN_TYPES, LOAN_PURPOSES, MAX_REPAYMENT_MONTHS } from '@/constants/loanTypes';
import { FileText, DollarSign, Calendar, TrendingUp, Camera, CreditCard, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export default function ApplyScreen() {
  const router = useRouter();
  const { createLoanApplication, calculateLoan, currentInterestRate } = useLoans();

  const [amount, setAmount] = useState<string>('');
  const [repaymentPeriod, setRepaymentPeriod] = useState<string>('1');
  const [selectedType, setSelectedType] = useState<string>('personal');
  const [purpose, setPurpose] = useState<string>(LOAN_PURPOSES[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [nationalIdPhoto, setNationalIdPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);

  const calculation = amount
    ? calculateLoan(
        parseFloat(amount) || 0,
        currentInterestRate,
        parseInt(repaymentPeriod) || 1
      )
    : null;

  const pickImage = async (type: 'photo' | 'id') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'photo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'photo') {
          setUserPhoto(result.assets[0].uri);
        } else {
          setNationalIdPhoto(result.assets[0].uri);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async (type: 'photo' | 'id') => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: type === 'photo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'photo') {
          setUserPhoto(result.assets[0].uri);
        } else {
          setNationalIdPhoto(result.assets[0].uri);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const locationString = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
              setLocation(locationString);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
            (error) => {
              console.error('Geolocation error:', error);
              let errorMessage = 'Failed to get location';
              
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Location permission denied. Please allow location access in your browser settings.';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = 'Location information is unavailable. Please check your internet connection.';
                  break;
                case error.TIMEOUT:
                  errorMessage = 'Location request timed out. Please try again.';
                  break;
                default:
                  errorMessage = error.message || 'Failed to get location';
              }
              
              Alert.alert('Location Error', errorMessage);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        } else {
          Alert.alert('Error', 'Geolocation is not supported by this browser');
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Location permission is required to proceed');
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const locationString = `${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`;
        setLocation(locationString);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error('Error getting location:', error);
      const errorMessage = error?.message || 'Failed to get location. Please try again.';
      Alert.alert('Location Error', errorMessage);
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid loan amount');
      return;
    }

    const period = parseInt(repaymentPeriod);
    if (!repaymentPeriod || period <= 0) {
      Alert.alert('Error', 'Please enter a valid repayment period');
      return;
    }

    if (period > MAX_REPAYMENT_MONTHS) {
      Alert.alert('Error', `Maximum repayment period is ${MAX_REPAYMENT_MONTHS} months`);
      return;
    }

    if (!userPhoto) {
      Alert.alert('Error', 'Please upload your photo');
      return;
    }

    if (!nationalIdPhoto) {
      Alert.alert('Error', 'Please upload your national ID');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Please provide your location');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsLoading(true);
    const result = await createLoanApplication(
      parseFloat(amount),
      parseInt(repaymentPeriod),
      selectedType,
      purpose
    );
    setIsLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your loan application has been submitted!', [
        {
          text: 'OK',
          onPress: () => {
            setAmount('');
            setRepaymentPeriod('1');
            setUserPhoto(null);
            setNationalIdPhoto(null);
            setLocation(null);
            router.push('/(tabs)/dashboard');
          },
        },
      ]);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', result.error || 'Failed to submit application');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0891b2', '#06b6d4']} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <Text style={styles.headerTitle}>Apply for Loan</Text>
          <Text style={styles.headerSubtitle}>
            Get instant approval with low rates
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Loan Type</Text>
          <View style={styles.typeGrid}>
            {LOAN_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardSelected,
                ]}
                onPress={() => {
                  setSelectedType(type.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type.id && styles.typeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Loan Amount (MKW)</Text>
          <View style={styles.inputContainer}>
            <DollarSign size={20} color="#0891b2" />
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor="#94a3b8"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Repayment Period (max {MAX_REPAYMENT_MONTHS} months)</Text>
          <View style={styles.inputContainer}>
            <Calendar size={20} color="#0891b2" />
            <TextInput
              style={styles.input}
              placeholder="Enter months (max 2)"
              placeholderTextColor="#94a3b8"
              value={repaymentPeriod}
              onChangeText={setRepaymentPeriod}
              keyboardType="numeric"
              maxLength={1}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Purpose</Text>
          <View style={styles.inputContainer}>
            <FileText size={20} color="#0891b2" />
            <View style={styles.pickerContainer}>
              {LOAN_PURPOSES.map((p, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.purposeOption,
                    purpose === p && styles.purposeOptionSelected,
                  ]}
                  onPress={() => {
                    setPurpose(p);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    style={[
                      styles.purposeText,
                      purpose === p && styles.purposeTextSelected,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Required Documents</Text>
          
          <View style={styles.documentSection}>
            <Text style={styles.documentLabel}>Your Photo</Text>
            {userPhoto ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: userPhoto }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => {
                    Alert.alert('Choose Action', 'How would you like to add your photo?', [
                      { text: 'Take Photo', onPress: () => takePhoto('photo') },
                      { text: 'Choose from Library', onPress: () => pickImage('photo') },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}
                >
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => {
                  Alert.alert('Choose Action', 'How would you like to add your photo?', [
                    { text: 'Take Photo', onPress: () => takePhoto('photo') },
                    { text: 'Choose from Library', onPress: () => pickImage('photo') },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <Camera size={24} color="#0891b2" />
                <Text style={styles.uploadButtonText}>Upload Your Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.documentSection}>
            <Text style={styles.documentLabel}>National ID</Text>
            {nationalIdPhoto ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: nationalIdPhoto }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => {
                    Alert.alert('Choose Action', 'How would you like to add your ID?', [
                      { text: 'Take Photo', onPress: () => takePhoto('id') },
                      { text: 'Choose from Library', onPress: () => pickImage('id') },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}
                >
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => {
                  Alert.alert('Choose Action', 'How would you like to add your ID?', [
                    { text: 'Take Photo', onPress: () => takePhoto('id') },
                    { text: 'Choose from Library', onPress: () => pickImage('id') },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <CreditCard size={24} color="#0891b2" />
                <Text style={styles.uploadButtonText}>Upload National ID</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.documentSection}>
            <Text style={styles.documentLabel}>Location</Text>
            {location ? (
              <View style={styles.locationContainer}>
                <MapPin size={20} color="#0891b2" />
                <Text style={styles.locationText}>{location}</Text>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={getCurrentLocation}
                >
                  <Text style={styles.locationButtonText}>Update</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={getCurrentLocation}
              >
                <MapPin size={24} color="#0891b2" />
                <Text style={styles.uploadButtonText}>Get Current Location</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {calculation && (
          <View style={styles.calculationCard}>
            <View style={styles.calculationHeader}>
              <TrendingUp size={24} color="#0891b2" />
              <Text style={styles.calculationTitle}>Loan Summary</Text>
            </View>

            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Monthly Payment</Text>
              <Text style={styles.calculationValue}>
                MKW {calculation.monthlyPayment.toFixed(2)}
              </Text>
            </View>

            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Interest Rate</Text>
              <Text style={styles.calculationValue}>
                {currentInterestRate}% monthly
              </Text>
            </View>

            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Total Interest</Text>
              <Text style={styles.calculationValue}>
                MKW {calculation.totalInterest.toFixed(2)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabelBold}>Total Payable</Text>
              <Text style={styles.calculationValueBold}>
                MKW {calculation.totalPayable.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Submitting...' : 'Submit Application'}
          </Text>
        </TouchableOpacity>
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  typeCardSelected: {
    borderColor: '#0891b2',
    backgroundColor: '#e0f2fe',
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#64748b',
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: '#0891b2',
    fontWeight: '600' as const,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  pickerContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 12,
  },
  purposeOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  purposeOptionSelected: {
    backgroundColor: '#e0f2fe',
  },
  purposeText: {
    fontSize: 12,
    color: '#64748b',
  },
  purposeTextSelected: {
    color: '#0891b2',
    fontWeight: '600' as const,
  },
  calculationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  calculationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  calculationTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calculationLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  calculationValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  calculationLabelBold: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  calculationValueBold: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0891b2',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  submitButton: {
    backgroundColor: '#0891b2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  documentSection: {
    marginBottom: 20,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#64748b',
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
  imagePreview: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#0891b2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  locationButton: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  locationButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#0891b2',
  },
});
