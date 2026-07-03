import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import RoleToggleSwitch, { ToggleRole } from '../components/RoleToggleSwitch';
import { useRoleStore } from '../utils/roleStore';
import { colors, radius, spacing, typography } from '../theme';
import { authService, storageService } from '../services/api';

type LoginScreenProps = {
  navigation: any;
};

/**
 * Unified Auth & Role-Selection screen.
 * Minimalist centered logo → floating-label phone/OTP input → prominent
 * glassmorphism role toggle (Employer ⇄ Worker) → primary CTA.
 */
export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { currentRole, setRole } = useRoleStore();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const phoneLabelAnim = useRef(new Animated.Value(0)).current;
  const otpLabelAnim = useRef(new Animated.Value(0)).current;

  const animateLabel = (anim: Animated.Value, focused: boolean, hasValue: boolean) => {
    Animated.timing(anim, {
      toValue: focused || hasValue ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  };

  const floatingLabelStyle = (anim: Animated.Value) => ({
    top: anim.interpolate({ inputRange: [0, 1], outputRange: [18, -9] }),
    fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [typography.size.base, typography.size.xs] }),
    color: colors.textSecondary,
  });

  // Send OTP via API
  const handleSendOtp = async () => {
    if (phone.trim().length < 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Call backend OTP endpoint
      await authService.sendOTP(phone);
      setOtpSent(true);
      Alert.alert('Success', 'OTP sent to your phone number');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and login
  const handleVerifyOtp = async () => {
    if (otp.trim().length < 6) {
      setError('Enter the 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Verify OTP with backend
      const response: any = await authService.verifyOTP(phone, otp);
      
      // Store token and user data
      if (response.token) {
        await storageService.setToken(response.token);
        if (response.user) {
          await storageService.setUser(response.user);
        }

        // Set role based on response or default to currentRole
        if (response.user?.currentRole) {
          setRole(response.user.currentRole);
        }

        // Navigate to main app
        Alert.alert('Success', 'Login successful!');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        throw new Error('No token received from server');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: ToggleRole) => {
    setRole(role);
    setError(''); // Clear any previous errors
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>💼</Text>
          </View>
          <Text style={styles.appName}>Dainik Rojgar</Text>
          <Text style={styles.tagline}>Find Work, Find Help — Instantly</Text>
        </View>

        {/* Error message */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        <View style={styles.floatingField}>
          <Animated.Text style={[styles.floatingLabel, floatingLabelStyle(phoneLabelAnim)]}>
            Mobile Number
          </Animated.Text>
          <TextInput
            style={styles.floatingInput}
            value={phone}
            keyboardType="phone-pad"
            editable={!otpSent && !loading}
            onFocus={() => animateLabel(phoneLabelAnim, true, phone.length > 0)}
            onBlur={() => animateLabel(phoneLabelAnim, false, phone.length > 0)}
            onChangeText={(text) => {
              setPhone(text);
              animateLabel(phoneLabelAnim, true, text.length > 0);
            }}
            placeholder="10 digit mobile"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {otpSent && (
          <View style={styles.floatingField}>
            <Animated.Text style={[styles.floatingLabel, floatingLabelStyle(otpLabelAnim)]}>
              Enter OTP
            </Animated.Text>
            <TextInput
              style={styles.floatingInput}
              value={otp}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
              onFocus={() => animateLabel(otpLabelAnim, true, otp.length > 0)}
              onBlur={() => animateLabel(otpLabelAnim, false, otp.length > 0)}
              onChangeText={(text) => {
                setOtp(text);
                animateLabel(otpLabelAnim, true, text.length > 0);
              }}
              placeholder="6 digit OTP"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )}

        <PrimaryButton
          label={otpSent ? 'Verify & Continue' : 'Send OTP'}
          onPress={otpSent ? handleVerifyOtp : handleSendOtp}
          loading={loading}
          disabled={loading}
          style={styles.ctaSpacing}
        />

        <Text style={styles.sectionLabel}>Continue as</Text>
        <RoleToggleSwitch value={currentRole} onChange={handleRoleChange} />

        <Text style={styles.footerNote} onPress={() => navigation.navigate?.('Signup')}>
          New here? Create an account
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  logoEmoji: {
    fontSize: 32,
  },
  appName: {
    fontSize: typography.size.xxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tagline: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorBox: {
    backgroundColor: '#FFE8E8',
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
  },
  floatingField: {
    marginBottom: spacing.lg,
  },
  floatingLabel: {
    position: 'absolute',
    left: spacing.base,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    fontFamily: typography.fontFamily.medium,
    zIndex: 1,
  },
  floatingInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
  ctaSpacing: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.semiBold,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  footerNote: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primaryDark,
  },
});
