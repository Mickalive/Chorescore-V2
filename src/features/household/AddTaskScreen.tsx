/**
 * ChoreScore V2 — Add Task Screen
 *
 * The main entry screen for recording completed tasks.
 * Shows the form and history below.
 * Follows DESIGN_BRIEF: fastest possible feel, form compact,
 * history transaction-style below.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { Text } from '../../ui/components/Text';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { MemberSelector } from '../../ui/components/MemberSelector';
import { DurationInput } from '../../ui/components/DurationInput';
import { ChronoTimer } from '../../ui/components/ChronoTimer';
import { EntryRow } from '../../ui/components/EntryRow';
import { ArchiveMessage } from '../../ui/components/ArchiveMessage';
import { colors, spacing, borderRadius } from '../../ui/design-system/theme';
import { useApp } from '../app/AppContext';
import { CompletedEntry, Member, PersistentTask } from '../../domain/entities';
import { useRouter } from 'expo-router';

interface AddTaskScreenProps {
  householdId: string;
}

export function AddTaskScreen({ householdId }: AddTaskScreenProps) {
  const { app, currentUser } = useApp();
  const router = useRouter();

  // Form state
  const [label, setLabel] = useState('');
  const [performedByMemberId, setPerformedByMemberId] = useState<string[]>([]);
  const [beneficiaryMemberIds, setBeneficiaryMemberIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'manual' | 'chrono'>('manual');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [selectedPersistentTaskId, setSelectedPersistentTaskId] = useState<string | null>(null);

  // Data state
  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<CompletedEntry[]>([]);
  const [persistentTasks, setPersistentTasks] = useState<PersistentTask[]>([]);
  const [hasOlderEntries, setHasOlderEntries] = useState(false);
  const [chronoRunning, setChronoRunning] = useState(false);
  const [chronoStartedAt, setChronoStartedAt] = useState<string | null>(null);

  // Editing state
  const [editingEntry, setEditingEntry] = useState<CompletedEntry | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [membersData, entriesData, tasksData, olderExists] = await Promise.all([
        app.getMembersForHousehold(householdId),
        app.getVisibleEntries(householdId),
        app.getPersistentTasks(householdId),
        app.hasOlderEntries(householdId),
      ]);

      setMembers(membersData);
      setEntries(entriesData);
      setPersistentTasks(tasksData);
      setHasOlderEntries(olderExists);

      // Set default performer to current user
      if (currentUser && performedByMemberId.length === 0) {
        const userMember = membersData.find(m => m.userId === currentUser.userId);
        if (userMember) {
          setPerformedByMemberId([userMember.id]);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [app, householdId, currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check for active chrono on mount
  useEffect(() => {
    const checkChrono = async () => {
      const chronoState = await app.getChronoState(householdId);
      if (chronoState && chronoState.isRunning) {
        setChronoRunning(true);
        setChronoStartedAt(chronoState.startedAt);
        setMode('chrono');
      }
    };
    checkChrono();
  }, [app, householdId]);

  // Handle chrono mode
  const handleStartChrono = async () => {
    if (performedByMemberId.length === 0) {
      Alert.alert('Erreur', 'Sélectionne d\'abord qui a fait la tâche.');
      return;
    }
    await app.startChrono(householdId, performedByMemberId[0]);
    setChronoRunning(true);
    setChronoStartedAt(new Date().toISOString());
  };

  const handleStopChrono = async () => {
    const elapsed = await app.stopChrono(householdId);
    setChronoRunning(false);
    setChronoStartedAt(null);
    setHours(Math.floor(elapsed / 60));
    setMinutes(elapsed % 60);
    setMode('manual');
  };

  // Submit entry
  const handleSubmit = async () => {
    if (!label.trim()) {
      Alert.alert('Erreur', 'Ajoute un libellé.');
      return;
    }
    if (performedByMemberId.length === 0) {
      Alert.alert('Erreur', 'Sélectionne qui a fait la tâche.');
      return;
    }
    if (beneficiaryMemberIds.length === 0) {
      Alert.alert('Erreur', 'Sélectionne pour qui la tâche a été faite.');
      return;
    }

    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 0) {
      Alert.alert('Erreur', 'Indique la durée.');
      return;
    }

    try {
      if (editingEntry) {
        await app.updateEntry(editingEntry.id, {
          label: label.trim(),
          performedByMemberId: performedByMemberId[0],
          beneficiaryMemberIds,
          durationMinutes: totalMinutes,
          persistentTaskId: selectedPersistentTaskId,
        });
      } else {
        await app.createEntry({
          householdId,
          label: label.trim(),
          performedByMemberId: performedByMemberId[0],
          beneficiaryMemberIds,
          durationMinutes: totalMinutes,
          persistentTaskId: selectedPersistentTaskId,
          createdBy: currentUser?.userId || performedByMemberId[0],
        });
      }

      // Reset form
      resetForm();
      await loadData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer.');
    }
  };

  const resetForm = () => {
    setLabel('');
    setHours(0);
    setMinutes(0);
    setSelectedPersistentTaskId(null);
    setEditingEntry(null);
    // Keep performedBy as current user
  };

  // Handle edit
  const handleEdit = (entry: CompletedEntry) => {
    setEditingEntry(entry);
    setLabel(entry.label);
    setPerformedByMemberId([entry.performedByMemberId]);
    setBeneficiaryMemberIds(entry.beneficiaryMemberIds);
    setHours(Math.floor(entry.durationMinutes / 60));
    setMinutes(entry.durationMinutes % 60);
    setSelectedPersistentTaskId(entry.persistentTaskId);
  };

  // Handle delete
  const handleDelete = async (entryId: string) => {
    try {
      await app.deleteEntry(entryId);
      await loadData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer.');
    }
  };

  // Handle share
  const handleShare = async (entry: CompletedEntry) => {
    const performer = members.find(m => m.id === entry.performedByMemberId);
    const duration = entry.durationMinutes;
    const h = Math.floor(duration / 60);
    const m = duration % 60;
    const durationStr = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m} min`;

    await app.shareContent({
      title: 'ChoreScore',
      message: `${entry.label} — ${durationStr} — fait par ${performer?.name || 'Inconnu'}`,
    });
  };

  const togglePersistentTask = (taskId: string) => {
    setSelectedPersistentTaskId(prev => prev === taskId ? null : taskId);
    const task = persistentTasks.find(t => t.id === taskId);
    if (task && !label) {
      setLabel(task.name);
    }
  };

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

      {/* Form */}
      <Card style={styles.formCard}>
        <Text variant="sectionTitle" style={styles.formTitle}>
          {editingEntry ? 'Modifier la tâche' : 'Nouvelle tâche'}
        </Text>

        {/* Persistent tasks as quick labels */}
        {persistentTasks.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tasksScroll}
            contentContainerStyle={styles.tasksContent}
          >
            {persistentTasks.map(task => (
              <Button
                key={task.id}
                title={task.name}
                variant={selectedPersistentTaskId === task.id ? 'primary' : 'secondary'}
                size="small"
                onPress={() => togglePersistentTask(task.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Label input */}
        <View style={styles.inputGroup}>
          <Text variant="caption">Quoi ?</Text>
          <TextInput
            style={styles.textInput}
            value={label}
            onChangeText={setLabel}
            placeholder="Ex: Vaisselle, Courses..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Fait par */}
        <MemberSelector
          label="Fait par"
          members={members}
          selectedIds={performedByMemberId}
          onSelectionChange={setPerformedByMemberId}
          allowMultiple={false}
        />

        {/* Fait pour */}
        <MemberSelector
          label="Fait pour"
          members={members}
          selectedIds={beneficiaryMemberIds}
          onSelectionChange={setBeneficiaryMemberIds}
          allowMultiple={true}
          showEveryone={true}
        />

        {/* Duration mode toggle */}
        <View style={styles.durationSection}>
          <View style={styles.modeToggle}>
            <Button
              title="Manuel"
              variant={mode === 'manual' ? 'primary' : 'ghost'}
              size="small"
              onPress={() => setMode('manual')}
            />
            <Button
              title="Chrono"
              variant={mode === 'chrono' ? 'primary' : 'ghost'}
              size="small"
              onPress={() => setMode('chrono')}
            />
          </View>

          {mode === 'manual' ? (
            <DurationInput
              hours={hours}
              minutes={minutes}
              onHoursChange={setHours}
              onMinutesChange={setMinutes}
            />
          ) : (
            <View style={styles.chronoSection}>
              <ChronoTimer
                isRunning={chronoRunning}
                startedAt={chronoStartedAt}
              />
              <Button
                title={chronoRunning ? 'Arrêter' : 'Démarrer'}
                variant={chronoRunning ? 'secondary' : 'primary'}
                size="small"
                onPress={chronoRunning ? handleStopChrono : handleStartChrono}
              />
            </View>
          )}
        </View>

        {/* Submit */}
        <Button
          title={editingEntry ? 'Enregistrer' : 'Valider'}
          variant="primary"
          onPress={handleSubmit}
          style={styles.submitButton}
        />

        {editingEntry && (
          <Button
            title="Annuler"
            variant="ghost"
            size="small"
            onPress={resetForm}
          />
        )}
      </Card>

      {/* History */}
      <View style={styles.historySection}>
        <Text variant="sectionTitle" style={styles.historyTitle}>
          Historique
        </Text>

        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="body" style={styles.emptyText}>
              Aucune tâche enregistrée. Ajoute ta première réalisation !
            </Text>
          </View>
        ) : (
          entries.map(entry => (
            <EntryRow
              key={entry.id}
              entry={entry}
              members={members}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onShare={handleShare}
            />
          ))
        )}
      </View>
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
  formCard: {
    marginBottom: spacing.xl,
  },
  formTitle: {
    marginBottom: spacing.md,
  },
  tasksScroll: {
    marginBottom: spacing.md,
  },
  tasksContent: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  textInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xs,
    fontSize: 16,
    color: colors.text,
  },
  durationSection: {
    marginBottom: spacing.lg,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chronoSection: {
    alignItems: 'center',
    gap: spacing.md,
  },
  submitButton: {
    marginBottom: spacing.sm,
  },
  historySection: {
    marginTop: spacing.md,
  },
  historyTitle: {
    marginBottom: spacing.md,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
