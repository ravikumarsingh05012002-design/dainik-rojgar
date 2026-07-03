import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import MilestoneBar, { MilestoneKey } from '../components/MilestoneBar';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { bookingService } from '../services/api';
import { getCurrentLocation, watchLocation, calculateDistance, Coordinates } from '../utils/location';

const CARD_COLLAPSED_HEIGHT = 260; // ~30% of a typical screen
const CARD_EXPANDED_HEIGHT = 420;

const MILESTONE_ORDER: MilestoneKey[] = ['accepted', 'arrived', 'started', 'completed'];

/**
 * Live Job Tracking & Navigation Map Screen.
 * Full-screen map layer (integration point for react-native-maps) with a
 * persistent floating, swipeable card in the bottom ~30% showing the
 * worker's en-route milestone bar. Completed steps glow Safety Yellow.
 */
export default function LiveTrackingScreen() {
  const route = useRoute<any>();
  const bookingId = route.params?.bookingId || 'demo-booking';

  const [booking, setBooking] = useState<any>({
    employerName: 'Loading...',
    location: 'Loading...',
    wage: 500,
    distance: 0,
    notes: 'Job details...',
    employerLocation: { latitude: 26.9124, longitude: 75.7873 },
    destinationLocation: { latitude: 26.9224, longitude: 75.7973 },
  });
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [milestoneIndex, setMilestoneIndex] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [trackingLocation, setTrackingLocation] = useState(false);
  const dragAnim = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Load booking details and start location tracking
  useEffect(() => {
    const fetchBookingDetails = async () => {
      setLoading(true);
      try {
        const response: any = await bookingService.getBookingDetail(bookingId);
        const b = response.booking || response;
        setBooking({
          employerName: b.employer?.name || b.employerName || 'Employer',
          location: b.destinationLocation?.label || b.location || 'Location',
          wage: b.dailyWageRate || 500,
          distance: b.distance || 0,
          notes: b.jobNotes || b.notes || '',
          employerLocation: b.employerLocation || { latitude: 26.9124, longitude: 75.7873 },
          destinationLocation: b.destinationLocation || { latitude: 26.9224, longitude: 75.7973 },
        });
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();

    // Get initial location
    const initLocation = async () => {
      const location = await getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
    };
    initLocation();
  }, [bookingId]);

  // Start GPS tracking when component mounts
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const startTracking = async () => {
      setTrackingLocation(true);
      cleanup = await watchLocation((coords) => {
        setCurrentLocation(coords);
        
        // Send location update to backend every 5 seconds
        bookingService.updateLiveNavigation(bookingId, {
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: Date.now(),
        }).catch((err) => {
          console.error('Failed to update location:', err);
        });
      });
    };

    startTracking();

    return () => {
      setTrackingLocation(false);
      if (cleanup) {
        cleanup();
      }
    };
  }, [bookingId]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
      onPanResponderMove: (_, gesture) => {
        const progress = Math.max(0, Math.min(1, -gesture.dy / (CARD_EXPANDED_HEIGHT - CARD_COLLAPSED_HEIGHT)));
        dragAnim.setValue(expanded ? 1 - (1 - progress) : progress);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldExpand = gesture.dy < -40 || (expanded && gesture.dy < 40);
        setExpanded(shouldExpand);
        Animated.spring(dragAnim, {
          toValue: shouldExpand ? 1 : 0,
          useNativeDriver: false,
          speed: 14,
          bounciness: 4,
        }).start();
      },
    })
  ).current;

  const cardHeight = dragAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CARD_COLLAPSED_HEIGHT, CARD_EXPANDED_HEIGHT],
  });

  const currentMilestone = MILESTONE_ORDER[milestoneIndex];

  // Advance milestone and update backend
  const advanceMilestone = async () => {
    if (milestoneIndex >= MILESTONE_ORDER.length - 1) return;

    setUpdating(true);
    try {
      const nextMilestone = MILESTONE_ORDER[milestoneIndex + 1];
      await bookingService.updateBookingStatus(bookingId, {
        status: nextMilestone,
      });
      setMilestoneIndex((i) => Math.min(i + 1, MILESTONE_ORDER.length - 1));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // Calculate real-time distance if current location available
  const realTimeDistance = currentLocation && booking.destinationLocation
    ? calculateDistance(currentLocation, booking.destinationLocation)
    : booking.distance || 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Real MapView with markers and route */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: booking.destinationLocation?.latitude || 26.9124,
            longitude: booking.destinationLocation?.longitude || 75.7873,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
          showsCompass
        >
          {/* Worker current location marker */}
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Your Location"
              description="Current position"
              pinColor={colors.primary}
            >
              <View style={styles.customMarker}>
                <Text style={styles.markerIcon}>👷</Text>
              </View>
            </Marker>
          )}

          {/* Destination marker */}
          {booking.destinationLocation && (
            <Marker
              coordinate={{
                latitude: booking.destinationLocation.latitude,
                longitude: booking.destinationLocation.longitude,
              }}
              title="Job Site"
              description={booking.location}
              pinColor="#EF4444"
            >
              <View style={[styles.customMarker, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.markerIcon}>🏗️</Text>
              </View>
            </Marker>
          )}

          {/* Route polyline */}
          {currentLocation && booking.destinationLocation && (
            <Polyline
              coordinates={[
                currentLocation,
                {
                  latitude: booking.destinationLocation.latitude,
                  longitude: booking.destinationLocation.longitude,
                },
              ]}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[10, 5]}
            />
          )}
        </MapView>
      )}

      {/* Persistent floating swipeable trip card */}
      {!loading && (
        <Animated.View style={[styles.tripCard, { height: cardHeight }]} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />

          <View style={styles.tripHeaderRow}>
            <View>
              <Text style={styles.tripTitle}>En route to job site</Text>
              <Text style={styles.tripSubtitle}>{booking.employerName} · {booking.location}</Text>
            </View>
            <View style={styles.wageBadge}>
              <Text style={styles.wageBadgeText}>₹{booking.wage}/day</Text>
            </View>
          </View>

          <View style={styles.milestoneWrap}>
            <MilestoneBar current={currentMilestone} />
          </View>

          {expanded && (
            <View style={styles.expandedDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📏</Text>
                <Text style={styles.detailText}>
                  {realTimeDistance.toFixed(1)} km away · ETA ~{Math.ceil(realTimeDistance * 3)} min
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📞</Text>
                <Text style={styles.detailText}>+91 XXXX XXXX 10</Text>
              </View>
              {booking.notes && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>📝</Text>
                  <Text style={styles.detailText}>{booking.notes}</Text>
                </View>
              )}
              {trackingLocation && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>🛰️</Text>
                  <Text style={[styles.detailText, { color: colors.success }]}>
                    Live tracking active
                  </Text>
                </View>
              )}
            </View>
          )}

          {currentMilestone !== 'completed' && (
            <PrimaryButton
              label={
                currentMilestone === 'accepted'
                  ? "I've Arrived"
                  : currentMilestone === 'arrived'
                  ? 'Start Work'
                  : 'Mark Completed'
              }
              onPress={advanceMilestone}
              loading={updating}
              disabled={updating}
              style={styles.advanceButton}
            />
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  customMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.card,
    ...shadow.floating,
  },
  markerIcon: {
    fontSize: 24,
  },
  tripCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card + 8,
    borderTopRightRadius: radius.card + 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    ...shadow.floating,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  tripHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  tripTitle: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tripSubtitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  wageBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  wageBadgeText: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  milestoneWrap: {
    marginBottom: spacing.lg,
  },
  expandedDetails: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailIcon: {
    fontSize: typography.size.base,
    marginRight: spacing.sm,
  },
  detailText: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  advanceButton: {
    marginTop: 'auto',
    marginBottom: spacing.lg,
  },
});
