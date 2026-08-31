/**
 * ChoreScore V2 — Card Component
 *
 * Light surface card with warm styling.
 * Used for household entries, todo items, etc.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../design-system/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'highlighted' | 'elevated';
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  return (
    <View style={[styles.card, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  default: {
    ...shadows.small,
  },
  highlighted: {
    backgroundColor: colors.surfaceHighlight,
    ...shadows.small,
  },
  elevated: {
    ...shadows.medium,
  },
});
