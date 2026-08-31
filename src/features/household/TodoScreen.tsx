/**
 * ChoreScore V2 — Todo Screen
 *
 * Premium feature: future planning with TodoItem creation, assignment,
 * beneficiaries, notes, deadline/reminder, and calendar via port.
 *
 * Completion mini-form: Fait par + durée réelle + Fait pour.
 * Atomic: marks TodoItem done + creates CompletedEntry.
 *
 * Free mode: tab visible, create/planify triggers contextual upsell.
 * Downgrade does not destroy existing TodoItems.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text } from '../../ui/components/Text';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { MemberSelector } from '../../ui/components/MemberSelector';
import { DurationInput } from '../../ui/components/DurationInput';
import { colors, spacing, borderRadius } from '../../ui/design-system/theme';
import { useApp } from '../app/AppContext';
import { TodoItem, Member } from '../../domain/entities';
import { EntitlementState } from '../../application/ports';
import { useRouter } from 'expo-router';

interface TodoScreenProps {
  householdId: string;
}

type ScreenMode = 'list' | 'create' | 'complete';

export function TodoScreen({ householdId }: TodoScreenProps) {
  const { app, currentUser } = useApp();
  const router = useRouter();

  // Data state
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [entitlement, setEntitlement] = useState<EntitlementState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI mode
  const [mode, setMode] = useState<ScreenMode>('list');

  // Create form state
  const [createTitle, setCreateTitle] = useState('');
  const [createAssignee, setCreateAssignee] = useState<string[]>([]);
  const [createBeneficiaries, setCreateBeneficiaries] = useState<string[]>([]);
  const [createDueAt, setCreateDueAt] = useState('');
  const [createReminderAt, setCreateReminderAt] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createPersistentTaskId, setCreatePersistentTaskId] = useState<string | null>(null);
  const [persistentTasks, setPersistentTasks] = useState<
    { id: string; name: string }[]
  >([]);

  // Complete form state
  const [completingTodo, setCompletingTodo] = useState<TodoItem | null>(null);
  const [completePerformedBy, setCompletePerformedBy] = useState<string[]>([]);
  const [completeHours, setCompleteHours] = useState(0);
  const [completeMinutes, setCompleteMinutes] = useState(0);
  const [completeBeneficiaries, setCompleteBeneficiaries] = useState<string[]>([]);

  // ── Data Loading ────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [todosData, membersData, entitlementData, ptData] = await Promise.all([
        entitlement?.todoPlanningEnabled
          ? app.getTodos(householdId).catch(() => [] as TodoItem[])
          : Promise.resolve([] as TodoItem[]),
        app.getMembersForHousehold(householdId),
        app.getEntitlement(householdId),
        app.getPersistentTasks(householdId),
      ]);

      setTodos(todosData);
      setMembers(membersData);
      setEntitlement(entitlementData);
      setPersistentTasks(ptData.map((t) => ({ id: t.id, name: t.name })));
    } catch (error) {
      console.error('Failed to load todo data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [app, householdId, entitlement?.todoPlanningEnabled]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isPremium = entitlement?.todoPlanningEnabled ?? false;

  // ── Create Todo ─────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createTitle.trim()) {
      Alert.alert('Erreur', 'Ajoute un titre à la tâche.');
      return;
    }
    if (createBeneficiaryMemberIds.length === 0) {
      Alert.alert('Erreur', 'Sélectionne pour qui la tâche est prévue.');
      return;
    }

    try {
      await app.createTodo({
        householdId,
        title: createTitle.trim(),
        assigneeMemberId: createAssignee[0] ?? null,
        beneficiaryMemberIds: createBeneficiaryMemberIds,
        dueAt: createDueAt || null,
        reminderAt: createReminderAt || null,
        notes: createNotes || undefined,
        persistentTaskId: createPersistentTaskId,
      });

      resetCreateForm();
      setMode('list');
      await loadData();
    } catch (error) {
      Alert.alert('Erreur', "Impossible de créer la tâche.");
    }
  };

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateAssignee([]);
    setCreateBeneficiaries([]);
    setCreateDueAt('');
    setCreateReminderAt('');
    setCreateNotes('');
    setCreatePersistentTaskId(null);
  };

  const createBeneficiaryMemberIds = createBeneficiaries.length > 0
    ? createBeneficiaries
    : members.map((m) => m.id);

  // ── Complete Todo ───────────────────────────────────────────

  const startCompletion = (todo: TodoItem) => {
    setCompletingTodo(todo);
    // Default Fait par = current user's member id (the validator), modifiable.
    // Falls back to assignee only when the validator is not a member of the household.
    const currentUserMember = currentUser
      ? members.find((m) => m.userId === currentUser.userId)
      : undefined;
    const defaultPerformer = currentUserMember
      ? [currentUserMember.id]
      : todo.assigneeMemberId
        ? [todo.assigneeMemberId]
        : [];
    setCompletePerformedBy(defaultPerformer);
    setCompleteHours(0);
    setCompleteMinutes(0);
    // Default Fait pour = todo's beneficiaries
    setCompleteBeneficiaries(
      todo.beneficiaryMemberIds.length > 0
        ? todo.beneficiaryMemberIds
        : members.map((m) => m.id)
    );
    setMode('complete');
  };

  const handleComplete = async () => {
    if (!completingTodo) return;
    if (completePerformedBy.length === 0) {
      Alert.alert('Erreur', 'Sélectionne qui a fait la tâche.');
      return;
    }
    if (completeBeneficiaries.length === 0) {
      Alert.alert('Erreur', 'Sélectionne pour qui la tâche a été faite.');
      return;
    }

    const totalMinutes = completeHours * 60 + completeMinutes;
    if (totalMinutes <= 0) {
      Alert.alert('Erreur', 'Indique la durée réelle.');
      return;
    }

    try {
      await app.completeTodo(
        completingTodo.id,
        completePerformedBy[0],
        totalMinutes,
        completeBeneficiaries
      );

      setCompletingTodo(null);
      setMode('list');
      await loadData();
    } catch (error) {
      Alert.alert('Erreur', "Impossible de valider la tâche.");
    }
  };

  // ── Delete Todo ─────────────────────────────────────────────

  const handleDelete = async (todoId: string) => {
    try {
      await app.repositories.todos.delete(todoId);
      await loadData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer.');
    }
  };

  // ── Render: Create Form ─────────────────────────────────────

  const renderCreateForm = () => (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.formCard}>
        <Text variant="sectionTitle" style={styles.formTitle}>
          Nouvelle tâche
        </Text>

        {/* Persistent tasks as quick labels */}
        {persistentTasks.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tasksScroll}
            contentContainerStyle={styles.tasksContent}
          >
            {persistentTasks.map((task) => (
              <Button
                key={task.id}
                title={task.name}
                variant={createPersistentTaskId === task.id ? 'primary' : 'secondary'}
                size="small"
                onPress={() =>
                  setCreatePersistentTaskId((prev) =>
                    prev === task.id ? null : task.id
                  )
                }
              />
            ))}
          </ScrollView>
        )}

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text variant="caption">Titre</Text>
          <TextInput
            style={styles.textInput}
            value={createTitle}
            onChangeText={setCreateTitle}
            placeholder="Ex: Passer l'aspirateur..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Assignee */}
        <MemberSelector
          label="Assignée à"
          members={members}
          selectedIds={createAssignee}
          onSelectionChange={setCreateAssignee}
          allowMultiple={false}
        />

        {/* Beneficiaries */}
        <MemberSelector
          label="Fait pour"
          members={members}
          selectedIds={createBeneficiaryMemberIds}
          onSelectionChange={setCreateBeneficiaries}
          allowMultiple={true}
          showEveryone={true}
        />

        {/* Due date */}
        <View style={styles.inputGroup}>
          <Text variant="caption">Échéance (optionnel)</Text>
          <TextInput
            style={styles.textInput}
            value={createDueAt}
            onChangeText={setCreateDueAt}
            placeholder="AAAA-MM-JJ ou texte libre"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Reminder */}
        <View style={styles.inputGroup}>
          <Text variant="caption">Rappel (optionnel)</Text>
          <TextInput
            style={styles.textInput}
            value={createReminderAt}
            onChangeText={setCreateReminderAt}
            placeholder="AAAA-MM-JJTHH:MM (ex: 2026-09-15T09:00)"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text variant="caption">Notes (optionnel)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={createNotes}
            onChangeText={setCreateNotes}
            placeholder="Détails, instructions..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        {/* Submit */}
        <Button
          title="Créer la tâche"
          variant="primary"
          onPress={handleCreate}
          style={styles.submitButton}
        />

        <Button
          title="Annuler"
          variant="ghost"
          size="small"
          onPress={() => {
            resetCreateForm();
            setMode('list');
          }}
        />
      </Card>
    </ScrollView>
  );

  // ── Render: Completion Mini-Form ────────────────────────────

  const renderCompletionForm = () => {
    if (!completingTodo) return null;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.formCard}>
          <Text variant="sectionTitle" style={styles.formTitle}>
            Tâche faite !
          </Text>
          <Text variant="body" style={styles.completingTitle}>
            {completingTodo.title}
          </Text>

          {/* Fait par */}
          <MemberSelector
            label="Fait par"
            members={members}
            selectedIds={completePerformedBy}
            onSelectionChange={setCompletePerformedBy}
            allowMultiple={false}
          />

          {/* Duration */}
          <View style={styles.inputGroup}>
            <Text variant="caption">Durée réelle</Text>
            <DurationInput
              hours={completeHours}
              minutes={completeMinutes}
              onHoursChange={setCompleteHours}
              onMinutesChange={setCompleteMinutes}
            />
          </View>

          {/* Fait pour */}
          <MemberSelector
            label="Fait pour"
            members={members}
            selectedIds={completeBeneficiaries}
            onSelectionChange={setCompleteBeneficiaries}
            allowMultiple={true}
            showEveryone={true}
          />

          <Button
            title="Valider"
            variant="primary"
            onPress={handleComplete}
            style={styles.submitButton}
          />

          <Button
            title="Annuler"
            variant="ghost"
            size="small"
            onPress={() => {
              setCompletingTodo(null);
              setMode('list');
            }}
          />
        </Card>
      </ScrollView>
    );
  };

  // ── Render: Todo List ───────────────────────────────────────

  const renderTodoList = () => {
    const activeTodos = todos.filter((t) => t.status !== 'completed');
    const completedTodos = todos.filter((t) => t.status === 'completed');

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Create button (Premium only) */}
        {isPremium && (
          <Button
            title="+ Nouvelle tâche"
            variant="primary"
            onPress={() => setMode('create')}
            style={styles.createButton}
          />
        )}

        {/* Free upsell hint */}
        {!isPremium && (
          <Card style={styles.upsellCard}>
            <Text variant="sectionTitle" style={styles.upsellTitle}>
              Planification Premium
            </Text>
            <Text variant="body" style={styles.upsellText}>
              Crée des tâches à planifier, assigne-les et suis leur réalisation.
            </Text>
            <Button
              title="Découvrir Premium"
              variant="secondary"
              size="small"
              onPress={() => router.push('/premium')}
            />
          </Card>
        )}

        {/* Active todos */}
        {activeTodos.length === 0 && completedTodos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="body" style={styles.emptyText}>
              {isPremium
                ? 'Aucune tâche planifiée. Crée ta première tâche !'
                : 'Aucune tâche. La planification fait partie de Premium.'}
            </Text>
          </View>
        ) : (
          <>
            {activeTodos.length > 0 && (
              <View style={styles.section}>
                <Text variant="sectionTitle" style={styles.sectionTitle}>
                  À faire
                </Text>
                {activeTodos.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    members={members}
                    onComplete={() => startCompletion(todo)}
                    onDelete={() => handleDelete(todo.id)}
                    isPremium={isPremium}
                  />
                ))}
              </View>
            )}

            {completedTodos.length > 0 && (
              <View style={styles.section}>
                <Text variant="caption" style={styles.completedSectionTitle}>
                  Terminées
                </Text>
                {completedTodos.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    members={members}
                    onComplete={() => {}}
                    onDelete={() => handleDelete(todo.id)}
                    isPremium={isPremium}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  // ── Main Render ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="body" style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  switch (mode) {
    case 'create':
      return renderCreateForm();
    case 'complete':
      return renderCompletionForm();
    default:
      return renderTodoList();
  }
}

// ── Todo Row Component ──────────────────────────────────────

interface TodoRowProps {
  todo: TodoItem;
  members: Member[];
  onComplete: () => void;
  onDelete: () => void;
  isPremium: boolean;
}

function TodoRow({ todo, members, onComplete, onDelete, isPremium }: TodoRowProps) {
  const assignee = members.find((m) => m.id === todo.assigneeMemberId);
  const isCompleted = todo.status === 'completed';

  const formatDueDate = (dueAt: string | null): string | null => {
    if (!dueAt) return null;
    try {
      const date = new Date(dueAt);
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'En retard';
      if (diffDays === 0) return "Aujourd'hui";
      if (diffDays === 1) return 'Demain';
      if (diffDays <= 7) return `Dans ${diffDays}j`;
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch {
      return dueAt;
    }
  };

  const dueLabel = formatDueDate(todo.dueAt);

  return (
    <Card style={[styles.todoCard, isCompleted ? styles.todoCardCompleted : undefined]}>
      <View style={styles.todoRow}>
        {/* Check button */}
        {!isCompleted && isPremium && (
          <TouchableOpacity
            style={styles.checkButton}
            onPress={onComplete}
            activeOpacity={0.7}
          >
            <View style={styles.checkCircle} />
          </TouchableOpacity>
        )}

        {/* Completed checkmark */}
        {isCompleted && (
          <View style={styles.completedCheck}>
            <Text variant="body" color={colors.success}>✓</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.todoContent}>
          <Text
            variant="body"
            style={[styles.todoTitle, isCompleted && styles.todoTitleCompleted]}
            numberOfLines={2}
          >
            {todo.title}
          </Text>

          <View style={styles.todoMeta}>
            {assignee && (
              <Text variant="caption" style={styles.todoAssignee}>
                {assignee.name}
              </Text>
            )}
            {dueLabel && (
              <Text
                variant="caption"
                style={[
                  styles.todoDue,
                  dueLabel === 'En retard' && styles.todoDueOverdue,
                ]}
              >
                {dueLabel}
              </Text>
            )}
          </View>

          {todo.notes ? (
            <Text variant="caption" style={styles.todoNotes} numberOfLines={1}>
              {todo.notes}
            </Text>
          ) : null}
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Text variant="caption" color={colors.textMuted}>×</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

// ── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textMuted,
  },
  // Create form
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
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginBottom: spacing.sm,
  },
  // Create button
  createButton: {
    marginBottom: spacing.lg,
  },
  // Upsell
  upsellCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceHighlight,
  },
  upsellTitle: {
    marginBottom: spacing.sm,
  },
  upsellText: {
    marginBottom: spacing.md,
    color: colors.textSecondary,
  },
  // Empty state
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  completedSectionTitle: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  // Todo row
  todoCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  todoCardCompleted: {
    opacity: 0.6,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  completedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    marginBottom: spacing.xs,
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  todoMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  todoAssignee: {
    color: colors.textSecondary,
  },
  todoDue: {
    color: colors.primary,
    fontWeight: '500',
  },
  todoDueOverdue: {
    color: colors.error,
  },
  todoNotes: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  deleteButton: {
    padding: spacing.sm,
    marginTop: -spacing.xs,
  },
  // Completion form
  completingTitle: {
    marginBottom: spacing.lg,
    color: colors.textSecondary,
  },
});
