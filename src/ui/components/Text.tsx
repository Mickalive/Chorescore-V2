/**
 * ChoreScore V2 — Text Component
 *
 * Hierarchical text with consistent styling.
 */

import React from 'react';
import { Text as RNText, StyleSheet, TextProps as RNTextProps } from 'react-native';
import { colors, typography } from '../design-system/theme';

type TextVariant = 'screenTitle' | 'sectionTitle' | 'body' | 'bodyBold' | 'caption' | 'metric' | 'balance';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function Text({
  variant = 'body',
  color,
  align = 'left',
  style,
  children,
  ...props
}: TextProps) {
  return (
    <RNText
      style={[
        styles[variant],
        { color: color || styles[variant].color, textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    ...typography.screenTitle,
    color: colors.text,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.text,
  },
  bodyBold: {
    ...typography.bodyBold,
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metric: {
    ...typography.metric,
    color: colors.text,
  },
  balance: {
    ...typography.balance,
    color: colors.text,
  },
});
