/**
 * ChoreScore V2 — Score Screen
 *
 * Shows balances, statistics, and filtered history.
 * The "Tricount of time" equivalent.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '../../ui/components/Text';
import { Card } from '../../ui/components/Card';
import { BarChart } from '../../ui/components/BarChart';
import { ArchiveMessage } from '../../ui/components/ArchiveMessage';
import { colors, spacing, borderRadius } from '../../ui/design-system/theme';
import { useApp } from '../app/AppContext';
import { Member, ScoreResult, Balance, Compensation } from '../../domain/entities';

interface ScoreScreenProps {
  householdId: string;
}

export function ScoreScreen({ householdId }: ScoreScreenProps) {
  const { app } = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all-time'>('month');
  const [hasOlderEntries, setHasOlderEntries] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [membersData, scoreResult, olderExists] = await Promise.all([
        app.getMembersForHousehold(householdId),
        app.calculateScore(householdId, period),
        app.hasOlderEntries(householdId),
      ]);

      setMembers(membersData);
      setScore(scoreResult);
      setHasOlderEntries(olderExists);
    } catch (error) {
      console.error('Failed to load score:', error);
    }
  }, [app, householdId, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getMemberName = (memberId: string): string => {
    return members.find(m => m.id === memberId)?.name || 'Inconnu';
  };

  const formatDuration = (minutes: number): string => {
    const h = Math.floor(Math.abs(minutes) / 60);
    const m = Math.abs(minutes) % 60;
    const sign = minutes < 0 ? '-' : '';
    if (h > 0 && m > 0) return `${sign}${h}h ${m} min`;
    if (h > 0) return `${sign}${h}h`;
    return `${sign}${m} min`;
  };

  const performedData = score
    ? Object.entries(score.performedMinutes).map(([memberId, minutes]) => ({
        label: getMemberName(memberId),
        value: minutes,
      }))
    : [];

  const balanceData = score
    ? score.balances.map(b => ({
        label: getMemberName(b.memberId),
        value: b.minutes,
        color: b.minutes >= 0 ? colors.success : colors.error,
      }))
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Archive message for Free users */}
      {hasOlderEntries && (
        <ArchiveMessage onUpgrade={() => {}} />
      )}

      {/* Period selector */}
      <View style={styles.periodSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['week', 'month', 'year', 'all-time'] as const).map(p => (
            <View key={p} style={styles.periodButton}>
              <Text
                variant="bodyBold"
                color={period === p ? colors.primary : colors.textSecondary}
                onPress={() => setPeriod(p)}
              >
                {p === 'week' && 'Semaine'}
                {p === 'month' && 'Mois'}
                {p === 'year' && 'Année'}
                {p === 'all-time' && 'Depuis le début'}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Balances */}
      {score && score.balances.length > 0 && (
        <Card style={styles.section}>
          <Text variant="sectionTitle" style={styles.sectionTitle}>
            Équilibres
          </Text>

          {score.compensations.length > 0 && (
            <View style={styles.compensations}>
              <Text variant="caption" style={styles.compensationsTitle}>
                Qui doit rattraper :
              </Text>
              {score.compensations.map((comp, index) => (
                <Text key={index} variant="body" style={styles.compensation}>
                  {getMemberName(comp.fromMemberId)} → {getMemberName(comp.toMemberId)} : {formatDuration(comp.minutes)}
                </Text>
              ))}
            </View>
          )}

          {balanceData.length > 0 && (
            <BarChart
              data={balanceData}
              formatValue={formatDuration}
            />
          )}
        </Card>
      )}

      {/* Performed time */}
      {score && performedData.length > 0 && (
        <Card style={styles.section}>
          <Text variant="sectionTitle" style={styles.sectionTitle}>
            Temps effectué
          </Text>
          <BarChart
            data={performedData}
            formatValue={formatDuration}
          />
        </Card>
      )}

      {/* Empty state */}
      {score && score.balances.length === 0 && (
        <View style={styles.emptyState}>
          <Text variant="sectionTitle" style={styles.emptyTitle}>
            Pas encore de données
          </Text>
          <Text variant="body" style={styles.emptyText}>
            Ajoute des tâches dans l'onglet "Ajouter une tâche" pour voir les équilibres.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  periodSection: {
    marginBottom: spacing.lg,
  },
  periodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  compensations: {
    marginBottom: spacing.md,
  },
  compensationsTitle: {
    marginBottom: spacing.xs,
  },
  compensation: {
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
