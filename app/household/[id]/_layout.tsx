/**
 * ChoreScore V2 — Household Tab Layout
 *
 * Tab navigation for household: Ajouter une tâche | Score | To-do
 * Shows the real household name in the header.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../../../src/ui/components/Text';
import { TabBar } from '../../../src/ui/components/TabBar';
import { ScreenContainer } from '../../../src/ui/components/ScreenContainer';
import { colors, spacing } from '../../../src/ui/design-system/theme';
import { AddTaskScreen } from '../../../src/features/household/AddTaskScreen';
import { ScoreScreen } from '../../../src/features/household/ScoreScreen';
import { TodoScreen } from '../../../src/features/household/TodoScreen';
import { useApp } from '../../../src/features/app/AppContext';

const TABS = [
  { key: 'add', label: 'Ajouter une tâche' },
  { key: 'score', label: 'Score' },
  { key: 'todo', label: 'To-do' },
];

export default function HouseholdLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('add');
  const [householdName, setHouseholdName] = useState('Mon foyer');
  const { app } = useApp();

  const householdId = id || 'h-demo';

  useEffect(() => {
    const loadHousehold = async () => {
      try {
        const household = await app.getHousehold(householdId);
        if (household) {
          setHouseholdName(household.name);
        }
      } catch (error) {
        // Keep default name
      }
    };
    loadHousehold();
  }, [app, householdId]);

  return (
    <ScreenContainer scrollable={false}>
      <View style={styles.header}>
        <Text variant="screenTitle" numberOfLines={1}>
          {householdName}
        </Text>
      </View>

      <TabBar
        tabs={TABS}
        activeTab={activeTab}
        onTabPress={setActiveTab}
      />

      <View style={styles.content}>
        {activeTab === 'add' && <AddTaskScreen householdId={householdId} />}
        {activeTab === 'score' && <ScoreScreen householdId={householdId} />}
        {activeTab === 'todo' && <TodoScreen householdId={householdId} />}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    flex: 1,
  },
});
