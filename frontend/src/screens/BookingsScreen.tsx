import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { useRoleStore } from '../utils/roleStore';
import { bookingService } from '../services/api';
import PrimaryButton from '../components/PrimaryButton';

interface Booking {
  _id: string;
  status: 'pending' | 'accepted' | 'en_route' | 'ongoing' | 'completed' | 'cancelled';
  employerName?: string;
  workerName?: string;
  workerCategory?: string;
  destinationLocation?: {
    label: string;
  };
  dailyWageRate?: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  accepted: '#3B82F6',
  en_route: '#8B5CF6',
  ongoing: '#06B6D4',
  completed: '#16A34A',
  cancelled: '#DC2626',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  en_route: 'En Route',
  ongoing: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function BookingsScreen() {
  const navigation = useNavigation<any>();
  const { currentRole } = useRoleStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Fetch bookings on screen focus
  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, [currentRole, activeTab])
  );

  const fetchBookings = async () => {
    setLoading(true);
    try {
      // In a real app, you'd call different endpoints based on role
      // For now, using a mock implementation
      const response = await bookingService.getMyBookings();
      setBookings(response.bookings || []);
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err);
      // Set empty array on error for graceful degradation
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const handleBookingPress = (booking: Booking) => {
    if (booking.status === 'en_route' || booking.status === 'ongoing') {
      navigation.navigate('LiveTracking', { bookingId: booking._id });
    } else {
      Alert.alert(
        'Booking Details',
        `Status: ${STATUS_LABELS[booking.status]}\nRate: ₹${booking.dailyWageRate || 0}/day`,
        [{ text: 'OK' }]
      );
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (activeTab === 'active') {
      return ['pending', 'accepted', 'en_route', 'ongoing'].includes(booking.status);
    } else {
      return ['completed', 'cancelled'].includes(booking.status);
    }
  });

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const isEmployer = currentRole === 'employer';
    const otherPartyName = isEmployer ? item.workerName : item.employerName;
    const category = item.workerCategory;

    return (
      <Pressable
        style={styles.bookingCard}
        onPress={() => handleBookingPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>
              {otherPartyName || 'Unknown User'}
            </Text>
            {category && (
              <Text style={styles.cardCategory}>{category}</Text>
            )}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[item.status] + '20' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: STATUS_COLORS[item.status] },
              ]}
            >
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText}>
              {item.destinationLocation?.label || 'Location not specified'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>💰</Text>
            <Text style={styles.detailText}>
              ₹{item.dailyWageRate || 0}/day
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {(item.status === 'en_route' || item.status === 'ongoing') && (
          <View style={styles.cardFooter}>
            <PrimaryButton
              label="Track Live"
              onPress={() => handleBookingPress(item)}
              variant="primary"
            />
          </View>
        )}
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>
        {activeTab === 'active' ? '📋' : '📦'}
      </Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'active' ? 'No Active Bookings' : 'No Booking History'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'active'
          ? currentRole === 'employer'
            ? 'Hire workers to see your bookings here'
            : 'Accept job requests to start working'
          : 'Your completed bookings will appear here'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>
          {currentRole === 'employer' ? 'Your Hired Workers' : 'Your Jobs'}
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'active' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.tabTextActive,
            ]}
          >
            Active
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'history' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.tabTextActive,
            ]}
          >
            History
          </Text>
        </Pressable>
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
  },
  headerTitle: {
    fontSize: typography.size.xxl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.bold,
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
  listContent: {
    padding: spacing.lg,
  },
  bookingCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardCategory: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.badge,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.bold,
    textTransform: 'uppercase',
  },
  cardBody: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: typography.size.md,
    marginRight: spacing.sm,
  },
  detailText: {
    flex: 1,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  cardFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 3,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
