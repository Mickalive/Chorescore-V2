/**
 * ChoreScore V2 — Root Index Screen
 *
 * Shows the list of households the user belongs to.
 * Entry point after authentication.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../src/ui/components/ScreenContainer';
import { Text } from '../src/ui/components/Text';
import { Card } from '../src/ui/components/Card';
import { Button } from '../src/ui/components/Button';
import { colors, spacing } from '../src/ui/design-system/theme';

// Demo households for the shell
const DEMO_HOUSEHOLDS = [
  { id: 'h-demo', name: 'Appartement démo', memberCount: 2 },
];

export default function HomeScreen() {
  const router = useRouter();

  const openHousehold = (id: string) => {
    router.push(`/household/${id}`);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text variant="screenTitle">ChoreScore</Text>
        <Text variant="caption">Le Tricount du temps domestique</Text>
      </View>

      <View style={styles.list}>
        {DEMO_HOUSEHOLDS.map((household) => (
          <TouchableOpacity
            key={household.id}
            onPress={() => openHousehold(household.id)}
            activeOpacity={0.7}
          >
            <Card variant="highlighted" style={styles.householdCard}>
              <View style={styles.householdRow}>
                <View style={styles.householdInfo}>
                  <Text variant="sectionTitle">{household.name}</Text>
                  <Text variant="caption">{household.memberCount} membres</Text>
                </View>
                <Text variant="body" color={colors.primary}>→</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          title="Créer un foyer"
          variant="secondary"
          onPress={() => {}}
        />
      </View>

      <View style={styles.footer}>
        <Button
          title="Options"
          variant="ghost"
          onPress={() => {}}
          size="small"
        />
        <Button
          title="Premium"
          variant="ghost"
          onPress={() => {}}
          size="small"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  householdCard: {
    marginBottom: spacing.sm,
  },
  householdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  householdInfo: {
    flex: 1,
  },
  actions: {
    marginTop: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.xxl,
  },
});
