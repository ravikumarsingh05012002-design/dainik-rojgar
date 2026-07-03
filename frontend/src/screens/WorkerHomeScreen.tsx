import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, ActivityIndicator, Alert } from 'react-native';
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
  const [pollingInterval, setPollingInterval] = useState<any>(null);
  const [workerName, setWorkerName] = useState('Worker');

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
        const interval = setInterval(() => {
          fetchPendingBookings();
        }, 5000); // Poll every 5 seconds
        setPollingInterval(interval);
        fetchPendingBookings(); // Fetch immediately
      } else {
        // Stop polling when going offline
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
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
      if (isOnline) {
        fetchPendingBookings();
        const interval = setInterval(() => {
          fetchPendingBookings();
        }, 5000);
        setPollingInterval(interval);
      }

      return () => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
      };
    }, [isOnline])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>Namaste, {workerName} 👋</Text>
        <Text style={styles.subGreeting}>
          {isOnline ? "You're online — jobs will start pinging in." : 'Go online to start receiving job alerts.'}
        </Text>

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
      </ScrollView>

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
  subGreeting: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
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
});
