import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

export type MilestoneKey = 'accepted' | 'arrived' | 'started' | 'completed';

const MILESTONES: { key: MilestoneKey; label: string }[] = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'started', label: 'Work Started' },
  { key: 'completed', label: 'Completed' },
];

interface MilestoneBarProps {
  /** The current (furthest-reached) milestone — everything up to and including it glows yellow */
  current: MilestoneKey;
}

/**
 * En-route real-time milestone bar for the Live Job Tracking screen:
 * Accepted → Arrived → Work Started → Completed.
 * Completed steps (including the current one) glow in Safety Yellow.
 */
export default function MilestoneBar({ current }: MilestoneBarProps) {
  const currentIndex = MILESTONES.findIndex((m) => m.key === current);

  return (
    <View style={styles.row}>
      {MILESTONES.map((milestone, index) => {
        const isDone = index <= currentIndex;
        const isLast = index === MILESTONES.length - 1;
        return (
          <React.Fragment key={milestone.key}>
            <View style={styles.step}>
              <View style={[styles.dot, isDone && styles.dotDone]} />
              <Text style={[styles.label, isDone && styles.labelDone]} numberOfLines={1}>
                {milestone.label}
              </Text>
            </View>
            {!isLast && (
              <View style={[styles.connector, index < currentIndex && styles.connectorDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  step: {
    alignItems: 'center',
    width: 68,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.milestoneUpcoming,
    marginBottom: spacing.xs,
  },
  dotDone: {
    backgroundColor: colors.milestoneComplete,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.milestoneUpcoming,
    marginTop: 6,
    marginHorizontal: -8,
  },
  connectorDone: {
    backgroundColor: colors.milestoneComplete,
  },
  label: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelDone: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.semiBold,
    fontWeight: '700',
  },
});
