/**
 * ChoreScore V2 — Score Screen
 *
 * Shows balances, statistics, and filtered history.
 * The "Tricount of time" equivalent.
 *
 * Sections:
 * 1. Period selector (Semaine/Mois/Année/Depuis le début)
 * 2. Filter selector (Toutes/PersistentTask/Autres)
 * 3. Balances with compensation proposals
 * 4. Performed time bar chart
 * 5. Weighted secondary section (Premium only)
 * 6. Contextual filtered history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text } from '../../ui/components/Text';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { BarChart } from '../../ui/components/BarChart';
import { ArchiveMessage } from '../../ui/components/ArchiveMessage';
import { EntryRow } from '../../ui/components/EntryRow';
import { generateShareText } from '../../ui/components/ShareCard';
import { colors, spacing, borderRadius } from '../../ui/design-system/theme';
import { useApp } from '../app/AppContext';
import { Member, PersistentTask, ScoreResult, CompletedEntry, FilterType } from '../../domain/entities';
import { useRouter } from 'expo-router';

interface ScoreScreenProps {
  householdId: string;
}

type Period = 'week' | 'month' | 'year' | 'all-time';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Semaine',
  month: 'Mois',
  year: 'Année',
  'all-time': 'Depuis le début',
};

export function ScoreScreen({ householdId }: ScoreScreenProps) {
  const { app } = useApp();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [persistentTasks, setPersistentTasks] = useState<PersistentTask[]>([]);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [history, setHistory] = useState<CompletedEntry[]>([]);
  const [period, setPeriod] = useState<Period>('month');
  const [filter, setFilter] = useState<FilterType>('all');
  const [filterTaskId, setFilterTaskId] = useState<string | undefined>(undefined);
  const [hasOlderEntries, setHasOlderEntries] = useState(false);
  const [isPremium, setIsPremium] = useState(true);
  const [needsPremium, setNeedsPremium] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [membersData, tasks, entitlement, olderExists] = await Promise.all([
        app.getMembersForHousehold(householdId),
        app.getPersistentTasks(householdId),
        app.getEntitlement(householdId),
        app.hasOlderEntries(householdId),
      ]);

      const premium = entitlement.weightingEnabled || entitlement.scoreArchiveAccess;
      setIsPremium(premium);
      setMembers(membersData);
      setPersistentTasks(tasks);
      setHasOlderEntries(olderExists);

      // Always load score data — the app layer limits Free to current civil month
      const [scoreResult, historyData] = await Promise.all([
        app.calculateScore(householdId, period, filter, filterTaskId),
        app.getScoreHistory(householdId, period, filter, filterTaskId),
      ]);
      setScore(scoreResult);
      setHistory(historyData);

      // Check if current period requires Premium (for upsell display)
      const needsPremiumPeriod = !entitlement.scoreArchiveAccess && (period === 'year' || period === 'all-time');
      setNeedsPremium(needsPremiumPeriod);
    } catch (error) {
      console.error('Failed to load score:', error);
    }
  }, [app, householdId, period, filter, filterTaskId]);

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

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    // Reset filter when changing period
    setFilter('all');
    setFilterTaskId(undefined);

    // In Free mode, year/all-time trigger contextual upsell
    if (!isPremium && (newPeriod === 'year' || newPeriod === 'all-time')) {
      setNeedsPremium(true);
    } else {
      setNeedsPremium(false);
    }
  };

  const handleFilterChange = (newFilter: FilterType, taskId?: string) => {
    setFilter(newFilter);
    setFilterTaskId(taskId);
  };

  // ── Share Score ──────────────────────────────────────────────
  const handleShareScore = async () => {
    if (!score || score.balances.length === 0) return;

    const shareText = generateShareText({
      type: 'balance',
      period: PERIOD_LABELS[period],
      balances: score.balances.map(b => ({
        name: getMemberName(b.memberId),
        minutes: b.minutes,
      })),
      compensations: score.compensations.map(c => ({
        from: getMemberName(c.fromMemberId),
        to: getMemberName(c.toMemberId),
        minutes: c.minutes,
      })),
      performedMinutes: score.performedMinutes
        ? Object.fromEntries(
            Object.entries(score.performedMinutes).map(([id, mins]) => [
              getMemberName(id),
              mins,
            ])
          )
        : undefined,
    });

    const shared = await app.shareContent({
      title: `ChoreScore — ${PERIOD_LABELS[period]}`,
      message: shareText,
    });

    if (!shared) {
      Alert.alert(
        'Partage indisponible',
        'Le partage n\'est pas disponible sur cette plateforme.'
      );
    }
  };

  // Build filter options from persistent tasks
  const filterOptions: Array<{ label: string; filter: FilterType; taskId?: string }> = [
    { label: 'Toutes', filter: 'all' },
    ...persistentTasks.map(task => ({
      label: task.name,
      filter: 'persistent-task' as FilterType,
      taskId: task.id,
    })),
    { label: 'Autres', filter: 'others' as FilterType },
  ];

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

  const weightedPerformedData = score?.performedWeightedMinutes
    ? Object.entries(score.performedWeightedMinutes).map(([memberId, minutes]) => ({
        label: getMemberName(memberId),
        value: minutes,
      }))
    : [];

  const weightedBalanceData = score?.weightedBalances
    ? score.weightedBalances.map(b => ({
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
        <ArchiveMessage onUpgrade={() => router.push('/premium')} />
      )}

      {/* Period selector */}
      <View style={styles.periodSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['week', 'month', 'year', 'all-time'] as const).map(p => {
            const isDisabled = !isPremium && (p === 'year' || p === 'all-time');
            return (
              <Pressable
                key={p}
                onPress={() => handlePeriodChange(p)}
                style={[
                  styles.periodButton,
                  period === p && styles.periodButtonActive,
                  isDisabled && styles.periodButtonDisabled,
                ]}
              >
                <Text
                  variant="bodyBold"
                  color={
                    period === p
                      ? colors.textOnPrimary
                      : isDisabled
                      ? colors.textMuted
                      : colors.textSecondary
                  }
                >
                  {PERIOD_LABELS[p]}
                  {isDisabled && ' 🔒'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter selector */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filterOptions.map(opt => {
            const isActive =
              filter === opt.filter &&
              (opt.filter !== 'persistent-task' || filterTaskId === opt.taskId);
            return (
              <Pressable
                key={opt.label}
                onPress={() => handleFilterChange(opt.filter, opt.taskId)}
                style={[
                  styles.filterButton,
                  isActive && styles.filterButtonActive,
                ]}
              >
                <Text
                  variant="body"
                  color={
                    isActive
                      ? colors.textOnPrimary
                      : colors.textSecondary
                  }
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Premium required for year/all-time */}
      {needsPremium && (
        <Card style={styles.section}>
          <Text variant="sectionTitle" style={styles.sectionTitle}>
            Fonctionnalité Premium
          </Text>
          <Text variant="body" style={styles.premiumText}>
            {period === 'year'
              ? "L'historique annuel nécessite ChoreScore Premium."
              : "L'historique complet nécessite ChoreScore Premium."}
          </Text>
          <Pressable onPress={() => router.push('/premium')} style={styles.premiumCta}>
            <Text variant="bodyBold" color={colors.primary}>
              Découvrir Premium
            </Text>
          </Pressable>
        </Card>
      )}

      {/* Balances */}
      {score && score.balances.length > 0 && (
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="sectionTitle" style={styles.sectionTitle}>
              Équilibres
            </Text>
            <Pressable
              onPress={handleShareScore}
              style={styles.shareButton}
              accessibilityRole="button"
              accessibilityLabel="Partager les équilibres"
            >
              <Text variant="body" color={colors.primary}>Partager</Text>
            </Pressable>
          </View>

          {/* Sum of balances */}
          <Text variant="caption" style={styles.sumNote}>
            Somme des soldes : {formatDuration(score.sumOfBalances)}
          </Text>

          {/* Compensation proposals */}
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

      {/* Weighted section — Premium only */}
      {!needsPremium && isPremium && score?.weightedBalances && weightedBalanceData.length > 0 && (
        <>
          <View style={styles.weightedDivider}>
            <View style={styles.dividerLine} />
            <Text variant="caption" style={styles.weightedLabel}>
              Pondéré
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <Card style={styles.section}>
            <Text variant="sectionTitle" style={styles.sectionTitle}>
              Équilibres pondérés
            </Text>

            {score.weightedCompensations && score.weightedCompensations.length > 0 && (
              <View style={styles.compensations}>
                <Text variant="caption" style={styles.compensationsTitle}>
                  Qui doit rattraper (pondéré) :
                </Text>
                {score.weightedCompensations.map((comp, index) => (
                  <Text key={index} variant="body" style={styles.compensation}>
                    {getMemberName(comp.fromMemberId)} → {getMemberName(comp.toMemberId)} : {formatDuration(comp.minutes)}
                  </Text>
                ))}
              </View>
            )}

            <BarChart
              data={weightedBalanceData}
              formatValue={formatDuration}
            />
          </Card>

          {weightedPerformedData.length > 0 && (
            <Card style={styles.section}>
              <Text variant="sectionTitle" style={styles.sectionTitle}>
                Temps effectué pondéré
              </Text>
              <BarChart
                data={weightedPerformedData}
                formatValue={formatDuration}
              />
            </Card>
          )}
        </>
      )}

      {/* Contextual filtered history */}
      {history.length > 0 && (
        <Card style={styles.section}>
          <Text variant="sectionTitle" style={styles.sectionTitle}>
            Historique
          </Text>
          <Text variant="caption" style={styles.historyNote}>
            {PERIOD_LABELS[period]}
            {filter !== 'all' && ` · ${filterOptions.find(o => o.filter === filter && (o.filter !== 'persistent-task' || o.taskId === filterTaskId))?.label || 'Filtré'}`}
          </Text>
          {history.map(entry => (
            <EntryRow
              key={entry.id}
              entry={entry}
              members={members}
            />
          ))}
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
    marginBottom: spacing.md,
  },
  periodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonDisabled: {
    opacity: 0.5,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  shareButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44, // WCAG AA touch target
    justifyContent: 'center',
  },
  sumNote: {
    marginBottom: spacing.sm,
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
  weightedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  weightedLabel: {
    marginHorizontal: spacing.md,
    color: colors.textSecondary,
  },
  premiumText: {
    marginBottom: spacing.md,
    color: colors.textSecondary,
  },
  premiumCta: {
    marginBottom: spacing.sm,
  },
  historyNote: {
    marginBottom: spacing.sm,
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
