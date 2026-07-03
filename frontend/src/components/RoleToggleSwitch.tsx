import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, LayoutChangeEvent } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export type ToggleRole = 'employer' | 'worker';

interface RoleToggleSwitchProps {
  value: ToggleRole;
  onChange: (role: ToggleRole) => void;
}

/**
 * Prominent glassmorphism toggle card used on the unified Auth screen to
 * switch between "I want to Hire" (employer) and "I want Work" (worker).
 * The active side slides smoothly with a vivid #FFC107 fill; the label
 * on the active side renders in dark charcoal for contrast.
 */
export default function RoleToggleSwitch({ value, onChange }: RoleToggleSwitchProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(value === 'worker' ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: value === 'worker' ? 1 : 0,
      useNativeDriver: true,
      speed: 16,
      bounciness: 6,
    }).start();
  }, [value, slideAnim]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const thumbWidth = trackWidth > 0 ? trackWidth / 2 - 4 : 0;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, thumbWidth + 4],
  });

  return (
    <View style={styles.track} onLayout={handleLayout}>
      {trackWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            { width: thumbWidth, transform: [{ translateX }] },
          ]}
        />
      )}

      <Pressable style={styles.option} onPress={() => onChange('employer')}>
        <Text style={[styles.optionLabel, value === 'employer' && styles.optionLabelActive]}>
          🧑‍💼  I want to Hire
        </Text>
      </Pressable>

      <Pressable style={styles.option} onPress={() => onChange('worker')}>
        <Text style={[styles.optionLabel, value === 'worker' && styles.optionLabelActive]}>
          🛠️  I want Work
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'center',
    borderRadius: radius.pill,
    padding: 4,
    height: 56,
    // Glassmorphism: translucent fill + soft border + subtle shadow
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
  },
  optionLabel: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.semiBold,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  optionLabelActive: {
    color: colors.textOnPrimary,
  },
});
