import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { jobService, bookingService } from '../services/api';
import { useRoleStore } from '../utils/roleStore';
import { getCurrentLocation } from '../utils/location';
import PrimaryButton from '../components/PrimaryButton';

interface Job {
  _id: string;
  title: string;
  category: string;
  description: string;
  location: {
    label: string;
    latitude: number;
    longitude: number;
  };
  wageRate: number;
  duration: number;
  workersNeeded: number;
  employer: {
    _id: string;
    name: string;
    phone: string;
  };
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  construction: '🏗️',
  plumbing: '🔧',
  electrical: '⚡',
  painting: '🎨',
  carpentry: '🪚',
  cleaning: '🧹',
  gardening: '🌱',
  delivery: '📦',
};

export default function JobDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { currentRole } = useRoleStore();
  const jobId = route.params?.jobId;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const response: any = await jobService.getJobDetail(jobId);
      setJob(response.job || response);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load job details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!job) return;

    Alert.alert(
      'Apply for Job',
      `Are you sure you want to apply for this ${job.category} job?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setApplying(true);
            try {
              // Get worker's current location
              const workerLocation = await getCurrentLocation();
              
              if (!workerLocation) {
                Alert.alert('Error', 'Unable to get your location. Please enable location services.');
                setApplying(false);
                return;
              }

              // Create booking request
              await bookingService.requestBooking({
                workerId: 'current-user-id', // This should come from auth state
                workerCategory: job.category,
                employerLocation: workerLocation,
                destinationLocation: {
                  latitude: job.location.latitude,
                  longitude: job.location.longitude,
                },
                dailyWageRate: job.wageRate,
              });

              Alert.alert(
                'Success',
                'Job application submitted! The employer will be notified.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Bookings'),
                  },
                ]
              );
            } catch (err: any) {
              Alert.alert(
                'Error',
                err.response?.data?.message || 'Failed to apply for job'
              );
            } finally {
              setApplying(false);
            }
          },
        },
      ]
    );
  };

  const handleContact = () => {
    if (!job) return;
    Alert.alert(
      'Contact Employer',
      `Call ${job.employer.name}?\n${job.employer.phone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => {} }, // In real app, use Linking.openURL
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const categoryIcon = CATEGORY_ICONS[job.category] || '💼';
  const isWorker = currentRole === 'worker';
  const isJobOpen = job.status === 'open';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.iconContainer}>
            <Text style={styles.categoryIcon}>{categoryIcon}</Text>
          </View>
          <Text style={styles.title}>{job.title}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{job.category}</Text>
          </View>
          {job.status !== 'open' && (
            <View style={[styles.statusBadge, styles[`status_${job.status}`]]}>
              <Text style={styles.statusText}>{job.status.replace('_', ' ')}</Text>
            </View>
          )}
        </View>

        {/* Job Info Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💰</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Daily Wage</Text>
                <Text style={styles.infoValue}>₹{job.wageRate}/day</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{job.duration} day(s)</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👥</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Workers Needed</Text>
                <Text style={styles.infoValue}>{job.workersNeeded}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{job.location.label}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{job.description}</Text>
          </View>
        </View>

        {/* Employer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employer</Text>
          <View style={styles.employerCard}>
            <View style={styles.employerAvatar}>
              <Text style={styles.employerAvatarText}>
                {job.employer.name[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.employerInfo}>
              <Text style={styles.employerName}>{job.employer.name}</Text>
              <Text style={styles.employerPhone}>{job.employer.phone}</Text>
            </View>
            <Pressable style={styles.contactButton} onPress={handleContact}>
              <Text style={styles.contactIcon}>📞</Text>
            </Pressable>
          </View>
        </View>

        {/* Posted Date */}
        <View style={styles.section}>
          <Text style={styles.postedText}>
            Posted on {new Date(job.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      </ScrollView>

      {/* Action Button (for workers) */}
      {isWorker && isJobOpen && (
        <View style={styles.bottomActions}>
          {applying ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Submitting application...</Text>
            </View>
          ) : (
            <PrimaryButton
              label={`Apply for ₹${job.wageRate}/day`}
              onPress={handleApply}
              variant="primary"
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.danger,
  },
  headerCard: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  categoryIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: typography.size.xxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.badge,
    marginTop: spacing.xs,
  },
  categoryText: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.textOnPrimary,
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.badge,
    marginTop: spacing.sm,
  },
  status_in_progress: {
    backgroundColor: '#3B82F620',
  },
  status_completed: {
    backgroundColor: '#16A34A20',
  },
  status_cancelled: {
    backgroundColor: '#DC262620',
  },
  statusText: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.bold,
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: typography.size.xl,
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  infoValue: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  descriptionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow.card,
  },
  descriptionText: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  employerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow.card,
  },
  employerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  employerAvatarText: {
    fontSize: typography.size.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.textOnPrimary,
  },
  employerInfo: {
    flex: 1,
  },
  employerName: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  employerPhone: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  contactButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIcon: {
    fontSize: typography.size.lg,
  },
  postedText: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.floating,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
});
