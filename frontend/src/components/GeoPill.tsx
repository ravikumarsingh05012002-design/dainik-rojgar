import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface GeoPillProps {
  label: string;
  onPress?: () => void;
}

/**
 * Persistent geo-location pill hosted in the top app bar
 * (e.g. "📍 Bagru, Rajasthan · 10km").
 */
export default function GeoPill({ label, onPress }: GeoPillProps) {
  return (
    <Pressable onPress={onPress} style={styles.pill}>
      <Text style={styles.icon}>📍</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {onPress && <Text style={styles.chevron}>▾</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    maxWidth: 220,
  },
  icon: {
    fontSize: typography.size.sm,
    marginRight: spacing.xs,
  },
  label: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.semiBold,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  chevron: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
});
