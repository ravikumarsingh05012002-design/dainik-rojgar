import React, { useMemo, useState, useEffect } from 'react';
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import GeoPill from '../components/GeoPill';
import CategoryBentoGrid, { BentoCategory } from '../components/CategoryBentoGrid';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, spacing, typography } from '../theme';
import { userService } from '../services/api';
import { getCurrentLocation, Coordinates } from '../utils/location';

const categories: BentoCategory[] = [
  { key: 'helper', label: 'Helper', icon: '⛑️' },
  { key: 'mason', label: 'Mason', icon: '🧱' },
  { key: 'painter', label: 'Painter', icon: '🎨' },
  { key: 'electrician', label: 'Electrician', icon: '⚡' },
  { key: 'plumber', label: 'Plumber', icon: '🔧' },
  { key: 'all', label: 'View All', icon: '➡️' },
];

const filterChips = [
  { id: 'near_me', label: 'Near Me' },
  { id: 'available_today', label: 'Available Today' },
  { id: 'top_rated', label: 'Top Rated' },
];

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Employer Home View — Discovery & Map Interface.
 * Persistent app bar with geo pill → bento categories grid →
 * "Nearest Available Workers" real-time feed with Hire Now CTAs.
 */
export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<Coordinates>({ latitude: 26.8, longitude: 75.8 }); // Default: Jaipur
  const [locationName, setLocationName] = useState('Jaipur, Rajasthan');
  const fadeIn = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, translateY]);

  // Get user's real location on mount
  useEffect(() => {
    const getUserLocation = async () => {
      const coords = await getCurrentLocation();
      if (coords) {
        setLocation(coords);
        setLocationName('Current Location'); // Can be enhanced with reverse geocoding
      }
    };
    getUserLocation();
  }, []);

  // Fetch nearest available workers
  const fetchWorkers = async () => {
    setLoading(true);
    setError('');

    try {
      const category = activeCategory && activeCategory !== 'all' ? activeCategory : undefined;
      const response: any = await userService.getNearestAvailableWorkers({
        latitude: location.latitude,
        longitude: location.longitude,
        category: category || 'helper', // Default category
        radiusInKm: 15,
      });

      // Transform API response to match component expectations
      const transformedWorkers = (response.workers || []).map((w: any, idx: number) => ({
        id: w._id || `w${idx}`,
        name: w.name || 'Unknown Worker',
        profession: w.workerCategory || 'Helper',
        rating: w.rating || 4.5,
        completedJobs: w.completedJobs || 0,
        distance: w.distanceKm || 0,
        price: w.dailyRate || 500,
        available: w.is_available && w.is_online,
        category: w.workerCategory || 'helper',
        profileColor: ['#FFE7A0', '#FFDD8A', '#FFEFC2'][idx % 3],
      }));

      setWorkers(transformedWorkers);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load workers';
      setError(errorMsg);
      console.error('Worker fetch error:', err);
      // Fall back to empty list on error
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch workers on mount and when category changes
  useFocusEffect(
    React.useCallback(() => {
      fetchWorkers();
    }, [activeCategory, location])
  );

  const toggleChip = (id: string) => {
    setActiveChips((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const filteredWorkers = useMemo(() => {
    const next = workers.filter((w: any) => {
      if (activeChips.includes('available_today') && !w.available) return false;
      if (activeChips.includes('top_rated') && w.rating < 4.5) return false;
      if (
        searchText &&
        !(`${w.profession} ${w.name}`.toLowerCase().includes(searchText.toLowerCase()))
      ) {
        return false;
      }
      return true;
    });

    if (activeChips.includes('near_me')) {
      return next.sort((a: any, b: any) => a.distance - b.distance);
    }

    return next;
  }, [activeChips, searchText, workers]);

  const onlineCount = filteredWorkers.filter((w: any) => w.available).length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Persistent global app bar */}
      <View style={styles.appBar}>
        <GeoPill label={locationName} onPress={() => {}} />
        <Pressable style={styles.notificationButton}>
          <Text style={styles.notificationIcon}>🔔</Text>
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>3</Text>
          </View>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <PrimaryButton label="Retry" onPress={fetchWorkers} style={styles.retryButton} />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY }] }}>
        <Card style={styles.heroCard} floating>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroEyebrow}>Live Marketplace</Text>
              <Text style={styles.heroTitle}>Hire trusted workers in minutes</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeLabel}>{onlineCount} online</Text>
            </View>
          </View>
          <Text style={styles.heroSubtitle}>
            Real-time matching based on your location, category, rating and availability.
          </Text>
          <View style={styles.quickActionsRow}>
            <Pressable style={styles.quickAction} onPress={() => fetchWorkers()}>
              <Text style={styles.quickActionIcon}>⟳</Text>
              <Text style={styles.quickActionLabel}>Refresh</Text>
            </Pressable>
            <Pressable
              style={styles.quickAction}
              onPress={() => navigation.navigate?.('PostJob')}
            >
              <Text style={styles.quickActionIcon}>✍️</Text>
              <Text style={styles.quickActionLabel}>Post Job</Text>
            </Pressable>
            <Pressable style={styles.quickAction} onPress={() => setActiveChips([])}>
              <Text style={styles.quickActionIcon}>⌫</Text>
              <Text style={styles.quickActionLabel}>Clear Filters</Text>
            </Pressable>
          </View>
        </Card>
        </Animated.View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search painter, mistri, helper..."
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {filterChips.map((chip) => {
            const active = activeChips.includes(chip.id);
            return (
              <Pressable
                key={chip.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleChip(chip.id)}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Categories bento grid */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <CategoryBentoGrid
          categories={categories}
          activeKey={activeCategory}
          onSelect={(key) => setActiveCategory((prev) => (prev === key ? null : key))}
        />

        {/* CTA banner */}
        <Card style={styles.ctaBanner}>
          <View style={styles.ctaTextWrap}>
            <Text style={styles.ctaTitle}>Need multiple workers?</Text>
            <Text style={styles.ctaSubtitle}>Post a bulk requirement and get instant matches</Text>
          </View>
          <PrimaryButton
            label="Post Requirement"
            onPress={() => navigation.navigate?.('PostJob')}
            fullWidth={false}
            style={styles.ctaButton}
          />
        </Card>

        {/* Nearest Available Workers feed */}
        <Text style={styles.sectionTitle}>Nearest Available Workers</Text>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Finding nearby workers...</Text>
          </View>
        ) : filteredWorkers.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No workers found in your area</Text>
            <PrimaryButton label="Refresh" onPress={fetchWorkers} style={styles.refreshButton} />
          </View>
        ) : (
          <Animated.FlatList
            style={{ opacity: fadeIn, transform: [{ translateY }] }}
            data={filteredWorkers}
            keyExtractor={(item: any) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.workerList}
            renderItem={({ item }: { item: any }) => (
              <Card style={styles.workerCard}>
                <View style={styles.workerRow}>
                  <View style={[styles.avatar, { backgroundColor: item.profileColor }]}>
                    <Text style={styles.avatarText}>{initials(item.name)}</Text>
                  </View>
                  <View style={styles.workerInfo}>
                    <View style={styles.workerNameRow}>
                      <Text style={styles.workerName}>{item.name}</Text>
                      <View style={[styles.statusPill, item.available ? styles.statusAvailable : styles.statusBusy]}>
                        <Text style={styles.statusPillText}>{item.available ? 'Available' : 'Busy'}</Text>
                      </View>
                    </View>
                    <Text style={styles.workerProfession}>{item.profession}</Text>
                    <Text style={styles.workerMeta}>
                      ⭐ {item.rating} · {item.completedJobs} jobs · {item.distance.toFixed(1)}km away
                    </Text>
                  </View>
                  <View style={styles.priceWrap}>
                    <Text style={styles.priceValue}>₹{item.price}</Text>
                    <Text style={styles.priceUnit}>/day</Text>
                  </View>
                </View>
                <PrimaryButton
                  label={item.available ? 'Hire Now' : 'Currently Busy'}
                  onPress={() => {
                    if (item.available) {
                      navigation.navigate?.('JobDetail', { workerId: item.id });
                    }
                  }}
                  disabled={!item.available}
                  style={styles.hireButton}
                />
              </Card>
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    fontSize: typography.size.lg,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    fontSize: 9,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textInverse,
  },
  errorContainer: {
    marginHorizontal: spacing.screenHorizontal,
    marginTop: spacing.md,
    backgroundColor: '#FFE8E8',
    borderRadius: radius.card,
    padding: spacing.base,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  refreshButton: {
    paddingHorizontal: spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.textPrimary,
    borderColor: '#1F2937',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  heroEyebrow: {
    fontSize: typography.size.xs,
    color: '#9CA3AF',
    fontFamily: typography.fontFamily.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroTitle: {
    width: '85%',
    color: colors.textInverse,
    fontSize: typography.size.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    lineHeight: typography.lineHeight.xl,
  },
  heroSubtitle: {
    color: '#D1D5DB',
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    marginBottom: spacing.base,
    fontFamily: typography.fontFamily.medium,
  },
  heroBadge: {
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroBadgeLabel: {
    fontSize: typography.size.xs,
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    borderRadius: radius.button,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    fontSize: typography.size.base,
    marginBottom: 2,
  },
  quickActionLabel: {
    color: '#E5E7EB',
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.semiBold,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingHorizontal: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: typography.size.base,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.textPrimary,
  },
  chipsRow: {
    marginBottom: spacing.lg,
  },
  chip: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.card,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipLabel: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.semiBold,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.textOnPrimary,
  },
  sectionTitle: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.lg,
  },
  ctaTextWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  ctaTitle: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  ctaButton: {
    paddingHorizontal: spacing.lg,
  },
  workerList: {
    gap: spacing.md,
  },
  workerCard: {
    marginBottom: spacing.md,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: spacing.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusAvailable: {
    backgroundColor: '#DCFCE7',
  },
  statusBusy: {
    backgroundColor: '#F3F4F6',
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workerProfession: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  workerMeta: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  priceUnit: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  hireButton: {
    paddingVertical: spacing.sm + 2,
  },
});

