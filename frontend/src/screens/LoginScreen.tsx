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
  Pressable,
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
        <View style={styles.backdropBlobTop} />
        <View style={styles.backdropBlobBottom} />

        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>💼</Text>
          </View>
          <Text style={styles.appName}>Dainik Rojgar</Text>
          <Text style={styles.tagline}>Find Work, Find Help — Instantly</Text>
        </View>

        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepConnector, otpSent && styles.stepConnectorActive]} />
          <View style={[styles.stepDot, otpSent && styles.stepDotActive]} />
        </View>

        <Text style={styles.stepLabel}>{otpSent ? 'Step 2: Verify OTP' : 'Step 1: Mobile Verification'}</Text>

        <View style={styles.authCard}>
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

          {otpSent ? (
            <Pressable onPress={handleSendOtp} disabled={loading}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </Pressable>
          ) : null}
        </View>

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
  backdropBlobTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 120,
    backgroundColor: colors.spotlight,
    top: -40,
    right: -60,
  },
  backdropBlobBottom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.accentSoft,
    bottom: 40,
    left: -70,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primaryDark,
  },
  stepConnector: {
    width: 42,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  stepConnectorActive: {
    backgroundColor: colors.primaryDark,
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    fontFamily: typography.fontFamily.semiBold,
  },
  authCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.xl,
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
    marginBottom: spacing.md,
  },
  resendText: {
    textAlign: 'center',
    fontSize: typography.size.sm,
    color: colors.primaryDark,
    fontFamily: typography.fontFamily.semiBold,
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
