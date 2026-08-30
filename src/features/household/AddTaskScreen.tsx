/**
 * ChoreScore V2 — Add Task Screen
 *
 * The main entry screen for recording completed tasks.
 * Shows the form and history below.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../ui/components/Text';
import { Card } from '../../ui/components/Card';
import { colors, spacing } from '../../ui/design-system/theme';

interface AddTaskScreenProps {
  householdId: string;
}

export function AddTaskScreen({ householdId }: AddTaskScreenProps) {
  return (
    <View style={styles.container}>
      <Card>
        <Text variant="sectionTitle" style={styles.formTitle}>
          Nouvelle tâche
        </Text>
        <Text variant="body" style={styles.placeholder}>
          Formulaire de saisie à implémenter (V2-02)
        </Text>
      </Card>

      <View style={styles.historySection}>
        <Text variant="sectionTitle" style={styles.historyTitle}>
          Historique
        </Text>
        <Text variant="body" style={styles.placeholder}>
          Historique à implémenter (V2-02)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  formTitle: {
    marginBottom: spacing.md,
  },
  placeholder: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  historySection: {
    marginTop: spacing.xl,
  },
  historyTitle: {
    marginBottom: spacing.md,
  },
});
