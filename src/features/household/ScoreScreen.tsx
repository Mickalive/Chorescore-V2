/**
 * ChoreScore V2 — Score Screen
 *
 * Shows balances, statistics, and filtered history.
 * The "Tricount of time" equivalent.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../ui/components/Text';
import { Card } from '../../ui/components/Card';
import { colors, spacing } from '../../ui/design-system/theme';

interface ScoreScreenProps {
  householdId: string;
}

export function ScoreScreen({ householdId }: ScoreScreenProps) {
  return (
    <View style={styles.container}>
      <Card>
        <Text variant="sectionTitle" style={styles.periodTitle}>
          Période
        </Text>
        <Text variant="body" style={styles.placeholder}>
          Semaine | Mois | Année | Depuis le début
        </Text>
      </Card>

      <View style={styles.section}>
        <Text variant="sectionTitle">Soldes</Text>
        <Text variant="body" style={styles.placeholder}>
          Soldes à implémenter (V2-03)
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="sectionTitle">Temps effectué</Text>
        <Text variant="body" style={styles.placeholder}>
          Graphique à implémenter (V2-03)
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
  periodTitle: {
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
