import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  floating?: boolean;
}

/**
 * Standard white card surface — 16px border radius, 4% soft elevation shadow.
 * Used as the base building block for every interactive card in the app.
 */
export default function Card({ children, style, padded = true, floating = false }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        floating ? shadow.floating : shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: {
    padding: spacing.base,
  },
});
