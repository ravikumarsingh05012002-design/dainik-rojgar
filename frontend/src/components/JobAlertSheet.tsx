import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Pressable } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { colors, radius, spacing, typography } from '../theme';

interface JobAlertSheetProps {
  visible: boolean;
  employerName: string;
  employerLocationLabel: string;
  dailyWageRate: number;
  distanceKm: number;
  /** Countdown duration in seconds before the alert auto-expires (declines) */
  countdownSeconds?: number;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Incoming job "ping" alert — slides up from the bottom as a modal sheet
 * with a pulsing countdown ring, employer location + wage rate, and a
 * prominent Yellow Accept button.
 */
export default function JobAlertSheet({
  visible,
  employerName,
  employerLocationLabel,
  dailyWageRate,
  distanceKm,
  countdownSeconds = 20,
  onAccept,
  onDecline,
}: JobAlertSheetProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);

  // Slide-up entrance
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  // Pulsing countdown ring
  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, pulseAnim]);

  // Countdown timer — auto-declines when it hits zero
  useEffect(() => {
    if (!visible) {
      setSecondsLeft(countdownSeconds);
      return;
    }
    if (secondsLeft <= 0) {
      onDecline();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, secondsLeft, countdownSeconds, onDecline]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [420, 0] });

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.scrim}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>New Job Request</Text>
              <Text style={styles.subtitle}>{employerName}</Text>
            </View>
            <Animated.View style={[styles.countdownRing, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.countdownText}>{secondsLeft}s</Text>
            </Animated.View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailLabel} numberOfLines={1}>
                {employerLocationLabel}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📏</Text>
              <Text style={styles.detailLabel}>{distanceKm.toFixed(1)} km away</Text>
            </View>
          </View>

          <View style={styles.wageBanner}>
            <Text style={styles.wageLabel}>Daily Wage Rate</Text>
            <Text style={styles.wageValue}>₹{dailyWageRate}</Text>
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={styles.declineButton} onPress={onDecline}>
              <Text style={styles.declineLabel}>Decline</Text>
            </Pressable>
            <View style={styles.acceptButtonWrapper}>
              <PrimaryButton label="Accept ✓" onPress={onAccept} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card + 8,
    borderTopRightRadius: radius.card + 8,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  headerText: {
    flexShrink: 1,
  },
  title: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  countdownRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: spacing.base,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
    flexShrink: 1,
  },
  detailIcon: {
    fontSize: typography.size.sm,
    marginRight: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  wageBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  wageLabel: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
  },
  wageValue: {
    fontSize: typography.size.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  declineButton: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.md,
  },
  declineLabel: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.semiBold,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  acceptButtonWrapper: {
    flex: 1,
  },
});
