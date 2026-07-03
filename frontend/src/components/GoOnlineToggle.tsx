import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface GoOnlineToggleProps {
  isOnline: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}

const TRACK_WIDTH = 220;
const TRACK_HEIGHT = 64;
const THUMB_SIZE = 56;

/**
 * Massive, interactive "Go Online / Go Offline" sliding toggle for the
 * Worker Home dashboard. When online, the slider shifts to the Yellow
 * brand color and the thumb travels to the right.
 */
export default function GoOnlineToggle({ isOnline, onToggle, disabled = false }: GoOnlineToggleProps) {
  const slideAnim = useRef(new Animated.Value(isOnline ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOnline ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8,
    }).start();
  }, [isOnline, slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, TRACK_WIDTH - THUMB_SIZE - 4],
  });

  const trackColor = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  return (
    <Pressable 
      onPress={() => !disabled && onToggle(!isOnline)} 
      disabled={disabled}
      accessibilityRole="switch" 
      accessibilityState={{ checked: isOnline }}
    >
        <Text style={[styles.stateLabel, styles.offLabel, isOnline && styles.dimmedLabel]}>OFFLINE</Text>
        <Text style={[styles.stateLabel, styles.onLabel, !isOnline && styles.dimmedLabel]}>ONLINE</Text>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]}>
          <Text style={styles.thumbIcon}>{isOnline ? '⚡' : '💤'}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    position: 'absolute',
    top: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  thumbIcon: {
    fontSize: typography.size.xl,
  },
  stateLabel: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textOnPrimary,
    letterSpacing: 0.5,
  },
  offLabel: {
    marginRight: 'auto',
  },
  onLabel: {
    marginLeft: 'auto',
  },
  dimmedLabel: {
    opacity: 0.35,
  },
});
