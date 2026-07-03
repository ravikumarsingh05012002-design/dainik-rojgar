import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../theme';
import PrimaryButton from '../components/PrimaryButton';

type SignupScreenProps = {
  navigation: any;
};

/**
 * SignupScreen - Redirects to LoginScreen with OTP flow
 * 
 * In this app, we use OTP-based authentication which handles both
 * signup and login in a single unified flow. This screen informs
 * users about the process and redirects them to LoginScreen.
 */
export default function SignupScreen({ navigation }: SignupScreenProps) {
  const nav = useNavigation<any>();

  const handleGetStarted = () => {
    nav.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo/Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💼</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Welcome to Dainik Rojgar</Text>
        <Text style={styles.subtitle}>
          Your daily work marketplace
        </Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>👷</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>For Workers</Text>
              <Text style={styles.featureText}>
                Find daily jobs near you and earn money
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏢</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>For Employers</Text>
              <Text style={styles.featureText}>
                Hire skilled workers instantly for your projects
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📱</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Simple OTP Login</Text>
              <Text style={styles.featureText}>
                No passwords needed - just enter your phone number
              </Text>
            </View>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonContainer}>
          <PrimaryButton
            label="Get Started"
            onPress={handleGetStarted}
            variant="primary"
          />
          
          <Pressable
            style={styles.loginLink}
            onPress={handleGetStarted}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 2,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
    ...shadow.floating,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: typography.size.xxxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl * 2,
  },
  featuresContainer: {
    gap: spacing.lg,
    marginBottom: spacing.xl * 2,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow.card,
  },
  featureIcon: {
    fontSize: typography.size.xxl,
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  featureText: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  loginLink: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  loginLinkBold: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  footer: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
