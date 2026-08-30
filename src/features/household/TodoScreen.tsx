/**
 * ChoreScore V2 — Todo Screen
 *
 * Future planning screen.
 * Premium feature - shows upsell context for Free users.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../ui/components/Text';
import { Card } from '../../ui/components/Card';
import { colors, spacing } from '../../ui/design-system/theme';

interface TodoScreenProps {
  householdId: string;
}

export function TodoScreen({ householdId }: TodoScreenProps) {
  return (
    <View style={styles.container}>
      <Card>
        <Text variant="sectionTitle" style={styles.todoTitle}>
          Tâches à planifier
        </Text>
        <Text variant="body" style={styles.placeholder}>
          Planification à implémenter (V2-04)
        </Text>
      </Card>

      <View style={styles.section}>
        <Text variant="sectionTitle">À faire</Text>
        <Text variant="body" style={styles.placeholder}>
          Liste de tâches à implémenter (V2-04)
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
  todoTitle: {
    marginBottom: spacing.md,
  },
  placeholder: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  section: {
    marginTop: spacing.xl,
  },
});
