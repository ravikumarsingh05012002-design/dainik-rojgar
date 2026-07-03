import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import { colors, spacing, typography } from '../theme';

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}

/**
 * Single tile in the Worker Home earnings analytics grid
 * (e.g. "Today's Earnings: ₹800", "Hours Worked: 6 hrs").
 * Subtle yellow highlight on the icon badge.
 */
export default function StatCard({ icon, label, value, highlight = true }: StatCardProps) {
  return (
    <Card style={styles.card}>
      <View style={[styles.iconBadge, highlight && styles.iconBadgeHighlight]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'flex-start',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconBadgeHighlight: {
    backgroundColor: colors.primarySoft,
  },
  icon: {
    fontSize: typography.size.lg,
  },
  value: {
    fontSize: typography.size.xl,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  label: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
});
