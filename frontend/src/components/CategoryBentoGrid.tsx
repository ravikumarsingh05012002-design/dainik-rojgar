import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Card from './Card';
import { colors, spacing, typography } from '../theme';

export interface BentoCategory {
  key: string;
  label: string;
  icon: string;
}

interface CategoryBentoGridProps {
  categories: BentoCategory[];
  activeKey?: string | null;
  onSelect: (key: string) => void;
}

/**
 * Minimalistic bento-style categories grid for the Employer Home screen
 * (Helper, Mason, Painter, Electrician, ...). Active card gets a Yellow
 * border + soft tint.
 */
export default function CategoryBentoGrid({ categories, activeKey, onSelect }: CategoryBentoGridProps) {
  return (
    <View style={styles.grid}>
      {categories.map((category) => {
        const isActive = category.key === activeKey;
        return (
          <Pressable key={category.key} style={styles.cell} onPress={() => onSelect(category.key)}>
            <Card
              style={[styles.card, isActive && styles.cardActive] as any}
              padded={false}
            >
              <View style={styles.cardInner}>
                <Text style={styles.icon}>{category.icon}</Text>
                <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                  {category.label}
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  cell: {
    width: '33.333%',
    padding: spacing.xs,
  },
  card: {
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  cardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xs,
  },
  icon: {
    fontSize: typography.size.xxl,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.semiBold,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.primaryDark,
  },
});
