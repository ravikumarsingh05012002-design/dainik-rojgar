import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import GoOnlineToggle from '../components/GoOnlineToggle';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import JobAlertSheet from '../components/JobAlertSheet';
import { useRoleStore } from '../utils/roleStore';
import { colors, spacing, typography } from '../theme';
import { bookingService, userService } from '../services/api';

/**
 * Worker Home View — Online/Offline Dashboard.
 * Massive Go Online/Offline toggle → earnings analytics grid →
 * incoming job alert modal sheet (pulsing countdown + Accept CTA).
 */
export default function WorkerHomeScreen() {
  const { isOnline, setOnline } = useRoleStore();
  const [incomingJob, setIncomingJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [earnings, setEarnings] = useState({ today: 0, hours: 0, completed: 0, rating: 4.5 });
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [workerName, setWorkerName] = useState('Worker');
    const stopPolling = React.useCallback(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }, []);

    const startPolling = React.useCallback(() => {
      stopPolling();
      pollingIntervalRef.current = setInterval(() => {
        fetchPendingBookings();
      }, 5000);
    }, [stopPolling]);

    const fetchWorkerProfile = async () => {
      try {
        const response: any = await userService.getProfile();
        const name = response?.user?.name || response?.name;
        if (name) {
          setWorkerName(name);
        }
      } catch (err: any) {
        // Keep default fallback name; profile loading failure is non-blocking.
        console.error('Error fetching worker profile:', err.message);
      }
    };

  const fadeIn = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, translateY]);

  // Fetch pending bookings (job alerts)
  const fetchPendingBookings = async () => {
    try {
      const response: any = await bookingService.getWorkerPendingBookings();
      const pending = response.bookings || [];
      if (pending.length > 0) {
        // Take the first pending booking
        setIncomingJob(pending[0]);
      }
    } catch (err: any) {
      console.error('Error fetching pending bookings:', err.message);
    }
  };

  // Toggle online status
  const handleToggleOnline = async (next: boolean) => {
    setTogglingOnline(true);
    try {
      // Call API to update online status
      await userService.toggleOnlineStatus(next);
      setOnline(next);

      if (next) {
        // Start polling for incoming jobs when going online
        startPolling();
        fetchPendingBookings(); // Fetch immediately
      } else {
        // Stop polling when going offline
        stopPolling();
        setIncomingJob(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
      setOnline(!next); // Revert toggle on error
    } finally {
      setTogglingOnline(false);
    }
  };

  // Accept job
  const handleAccept = async () => {
    if (!incomingJob) return;

    setLoading(true);
    try {
      await bookingService.respondToBooking(incomingJob._id, { action: 'accept' });
      Alert.alert('Success', 'Job accepted!');
      setIncomingJob(null);
      // Fetch next pending job
      fetchPendingBookings();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to accept job');
    } finally {
      setLoading(false);
    }
  };

  // Decline job
  const handleDecline = async () => {
    if (!incomingJob) return;

    setLoading(true);
    try {
      await bookingService.respondToBooking(incomingJob._id, { action: 'decline' });
      setIncomingJob(null);
      // Fetch next pending job
      fetchPendingBookings();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to decline job');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data on mount
  useFocusEffect(
    React.useCallback(() => {
      fetchWorkerProfile();

      if (isOnline) {
        fetchPendingBookings();
        startPolling();
      }

      return () => {
        stopPolling();
      };
    }, [isOnline, startPolling, stopPolling])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeIn, transform: [{ translateY }] }}
      >
        <Card style={styles.heroCard} floating>
          <Text style={styles.heroEyebrow}>Worker Control Center</Text>
          <Text style={styles.heroGreeting}>Namaste, {workerName} 👋</Text>
          <Text style={styles.heroSubGreeting}>
            {isOnline
              ? 'You are live in marketplace. Keep response time fast to win more jobs.'
              : 'Go online to appear in nearby search and start getting instant requests.'}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, isOnline ? styles.statusPillOnline : styles.statusPillOffline]}>
              <Text style={styles.statusPillText}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
            <Text style={styles.statusHint}>{incomingJob ? '1 request waiting' : 'No pending request'}</Text>
          </View>
        </Card>

        <View style={styles.toggleWrap}>
          <GoOnlineToggle isOnline={isOnline} onToggle={handleToggleOnline} disabled={togglingOnline} />
          {togglingOnline && <ActivityIndicator style={styles.toggleLoader} color={colors.primary} />}
        </View>

        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="💰" label="Today's Earnings" value={`₹${earnings.today}`} />
          <StatCard icon="⏱️" label="Hours Worked" value={`${earnings.hours} hrs`} />
        </View>
        <View style={styles.statsGrid}>
          <StatCard icon="✅" label="Jobs Completed" value={earnings.completed.toString()} />
          <StatCard icon="⭐" label="Rating" value={earnings.rating.toFixed(1)} highlight />
        </View>

        <Card style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            Stay online during peak hours (8–11 AM, 5–8 PM) to receive more job requests.
          </Text>
        </Card>

        <Card style={styles.insightCard}>
          <Text style={styles.insightTitle}>Boost your visibility</Text>
          <View style={styles.insightBulletRow}>
            <Text style={styles.insightBullet}>•</Text>
            <Text style={styles.insightText}>Keep profile details complete for higher trust.</Text>
          </View>
          <View style={styles.insightBulletRow}>
            <Text style={styles.insightBullet}>•</Text>
            <Text style={styles.insightText}>Respond in under 2 minutes to improve acceptance rank.</Text>
          </View>
          <View style={styles.insightBulletRow}>
            <Text style={styles.insightBullet}>•</Text>
            <Text style={styles.insightText}>Stay online near demand hotspots for more bookings.</Text>
          </View>
        </Card>
      </Animated.ScrollView>

      {incomingJob && (
        <JobAlertSheet
          visible={isOnline && !!incomingJob && !loading}
          employerName={incomingJob.employerName || 'Employer'}
          employerLocationLabel={incomingJob.employerLocation?.label || 'Location'}
          dailyWageRate={incomingJob.dailyWageRate || 500}
          distanceKm={incomingJob.distance || 0}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greeting: {
    fontSize: typography.size.xxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  heroCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.textPrimary,
    borderColor: '#1F2937',
  },
  heroEyebrow: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  heroGreeting: {
    fontSize: typography.size.xxl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textInverse,
  },
  heroSubGreeting: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: '#D1D5DB',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  subGreeting: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusPillOnline: {
    backgroundColor: '#DCFCE7',
  },
  statusPillOffline: {
    backgroundColor: '#F3F4F6',
  },
  statusPillText: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusHint: {
    fontSize: typography.size.xs,
    color: '#D1D5DB',
    fontFamily: typography.fontFamily.medium,
  },
  toggleWrap: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  toggleLoader: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    marginTop: spacing.md,
  },
  tipIcon: {
    fontSize: typography.size.xl,
    marginRight: spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textPrimary,
    lineHeight: typography.lineHeight.sm,
  },
  insightCard: {
    marginTop: spacing.md,
  },
  insightTitle: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  insightBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  insightBullet: {
    marginRight: spacing.xs,
    color: colors.accent,
    fontSize: typography.size.base,
    lineHeight: typography.lineHeight.base,
  },
  insightText: {
    flex: 1,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.medium,
  },
});
