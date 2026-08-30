/**
 * ChoreScore V2 — Archive Message Component
 *
 * Gentle, non-blocking message when a Free user has archived data.
 * Warm and reassuring tone, never guilt-inducing.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, spacing, borderRadius } from '../design-system/theme';

interface ArchiveMessageProps {
  onUpgrade?: () => void;
}

export function ArchiveMessage({ onUpgrade }: ArchiveMessageProps) {
  return (
    <View style={styles.container}>
      <Text variant="body" style={styles.message}>
        Nouveau mois 🌿{'\n'}
        Ton historique précédent est bien au chaud.{'\n'}
        Avec ChoreScore Premium, tu peux le retrouver à tout moment.
      </Text>
      {onUpgrade && (
        <Text
          variant="bodyBold"
          color={colors.primary}
          style={styles.cta}
          onPress={onUpgrade}
        >
          Retrouver mon historique
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  message: {
    color: colors.text,
    lineHeight: 20,
  },
  cta: {
    marginTop: spacing.sm,
  },
});
