/**
 * ChoreScore V2 — V2-04 Acceptance Criteria Tests
 *
 * Verifies all acceptance criteria for V2-04:
 * - TodoItem entity exists with all required fields
 * - Trial/Standard/Pro: create TodoItem with date or no date, assign to member,
 *   set beneficiaries, add notes, set deadline/reminder
 * - TodoItem completion mini-form: Fait par (default=validator, modifiable),
 *   durée réelle, Fait pour (reused or modified)
 * - Completion creates exactly one CompletedEntry and marks TodoItem done
 * - Score and history update immediately after completion
 * - Free mode: Todo tab visible, create/planify triggers contextual upsell,
 *   no TodoItem created
 * - Downgrade from Premium does not destroy existing TodoItems
 * - PersistentTask link optional on TodoItem
 * - All existing tests pass with no regressions
 * - npm run check green
 */

import { ChoreScoreApp } from '../../src/application/use-cases/ChoreScoreApp';
import { LocalAuthAdapter } from '../../src/infrastructure/local/LocalAuthAdapter';
import { LocalEntitlementAdapter } from '../../src/infrastructure/local/LocalEntitlementAdapter';
import { SystemShareAdapter } from '../../src/infrastructure/local/LocalSystemShareAdapter';
import { LocalNotificationAdapter } from '../../src/infrastructure/local/LocalNotificationAdapter';
import { LocalCalendarAdapter } from '../../src/infrastructure/local/LocalCalendarAdapter';
import { LocalSecureStorageAdapter } from '../../src/infrastructure/local/LocalSecureStorageAdapter';
import { LocalSyncAdapter } from '../../src/infrastructure/local/LocalSyncAdapter';
import { LocalResearchAnalyticsAdapter } from '../../src/infrastructure/local/LocalResearchAnalyticsAdapter';
import {
  InMemoryUserRepository,
  InMemoryMembershipRepository,
  InMemoryAccountRepository,
  InMemoryHouseholdRepository,
  InMemoryMemberRepository,
  InMemoryEntryRepository,
  InMemoryPersistentTaskRepository,
  InMemoryTodoRepository,
} from '../../src/infrastructure/repositories/InMemoryRepositories';
import { Member, User, Household } from '../../src/domain/entities';

describe('V2-04 Acceptance Criteria', () => {
  let app: ChoreScoreApp;
  let authAdapter: LocalAuthAdapter;
  let entitlementAdapter: LocalEntitlementAdapter;
  let entries: InMemoryEntryRepository;
  let members: InMemoryMemberRepository;
  let households: InMemoryHouseholdRepository;
  let todos: InMemoryTodoRepository;
  let persistentTasks: InMemoryPersistentTaskRepository;
  let users: InMemoryUserRepository;

  const testUser: User = {
    id: 'u-1',
    email: 'alex@example.com',
    displayName: 'Alex',
    createdAt: '2026-08-30T00:00:00Z',
  };

  const testHousehold: Household = {
    id: 'h-test',
    name: 'Test Household',
    ownerId: 'u-1',
    createdAt: '2026-08-30T00:00:00Z',
  };

  const testMembers: Member[] = [
    {
      id: 'm-alex',
      householdId: 'h-test',
      name: 'Alex',
      userId: 'u-1',
      joinedAt: '2026-08-30T00:00:00Z',
    },
    {
      id: 'm-sam',
      householdId: 'h-test',
      name: 'Sam',
      userId: 'u-2',
      joinedAt: '2026-08-30T00:00:00Z',
    },
  ];

  beforeEach(() => {
    authAdapter = new LocalAuthAdapter();
    entitlementAdapter = new LocalEntitlementAdapter();
    entries = new InMemoryEntryRepository();
    members = new InMemoryMemberRepository();
    households = new InMemoryHouseholdRepository();
    todos = new InMemoryTodoRepository();
    persistentTasks = new InMemoryPersistentTaskRepository();
    users = new InMemoryUserRepository();

    const memberships = new InMemoryMembershipRepository();
    const accounts = new InMemoryAccountRepository();

    users.seed([testUser]);
    households.seed([testHousehold]);
    members.seed(testMembers);
    memberships.seed([
      {
        id: 'mem-alex',
        userId: 'u-1',
        householdId: 'h-test',
        role: 'OWNER',
        joinedAt: '2026-08-30T00:00:00Z',
      },
      {
        id: 'mem-sam',
        userId: 'u-2',
        householdId: 'h-test',
        role: 'MEMBER',
        joinedAt: '2026-08-30T00:00:00Z',
      },
    ]);

    authAdapter.setUser({
      userId: testUser.id,
      email: testUser.email,
      displayName: testUser.displayName,
      provider: 'email',
    });

    app = new ChoreScoreApp(
      {
        auth: authAdapter,
        entitlements: entitlementAdapter,
        share: new SystemShareAdapter(),
        notifications: new LocalNotificationAdapter(),
        calendar: new LocalCalendarAdapter(),
        secureStorage: new LocalSecureStorageAdapter(),
        sync: new LocalSyncAdapter(),
        analytics: new LocalResearchAnalyticsAdapter(),
      },
      {
        users,
        memberships,
        accounts,
        households,
        members,
        entries,
        persistentTasks,
        todos,
      }
    );
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 1: TodoItem entity exists with required fields
  // ══════════════════════════════════════════════════════════════
  describe('1. TodoItem entity has all required fields', () => {
    it('should create TodoItem with all fields', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Sortir les poubelles',
        assigneeMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        dueAt: '2026-09-01T10:00:00Z',
        notes: 'Ne pas oublier le carton',
        persistentTaskId: null,
      });

      expect(todo.id).toBeDefined();
      expect(todo.householdId).toBe('h-test');
      expect(todo.title).toBe('Sortir les poubelles');
      expect(todo.assigneeMemberId).toBe('m-sam');
      expect(todo.beneficiaryMemberIds).toEqual(['m-alex', 'm-sam']);
      expect(todo.dueAt).toBe('2026-09-01T10:00:00Z');
      expect(todo.notes).toBe('Ne pas oublier le carton');
      expect(todo.persistentTaskId).toBeNull();
      expect(todo.status).toBe('todo');
      expect(todo.createdAt).toBeDefined();
      expect(todo.completedAt).toBeUndefined();
    });

    it('should create TodoItem with persistentTaskId', async () => {
      const task = await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Vaisselle',
      });

      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Faire la vaisselle',
        persistentTaskId: task.id,
      });

      expect(todo.persistentTaskId).toBe(task.id);
    });

    it('should create TodoItem without optional fields', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche simple',
      });

      expect(todo.title).toBe('Tâche simple');
      expect(todo.assigneeMemberId).toBeNull();
      expect(todo.beneficiaryMemberIds).toEqual([]);
      expect(todo.dueAt).toBeNull();
      expect(todo.notes).toBe('');
      expect(todo.persistentTaskId).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 2: Trial/Standard/Pro create with various fields
  // ══════════════════════════════════════════════════════════════
  describe('2. Premium: create TodoItem with date or no date, assign, beneficiaries, notes, deadline', () => {
    it('should create TodoItem with no date', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche sans date',
      });

      expect(todo.dueAt).toBeNull();
      expect(todo.status).toBe('todo');
    });

    it('should create TodoItem with date/deadline', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche datée',
        dueAt: '2026-09-15T18:00:00Z',
      });

      expect(todo.dueAt).toBe('2026-09-15T18:00:00Z');
    });

    it('should assign to a specific member', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche assignée',
        assigneeMemberId: 'm-sam',
      });

      expect(todo.assigneeMemberId).toBe('m-sam');
    });

    it('should set beneficiaries for the todo', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche pour tous',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      expect(todo.beneficiaryMemberIds).toEqual(['m-alex', 'm-sam']);
    });

    it('should add notes to todo', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche avec notes',
        notes: 'Instructions détaillées ici',
      });

      expect(todo.notes).toBe('Instructions détaillées ici');
    });

    it('should create multiple todos and list them', async () => {
      await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche 1',
      });
      await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche 2',
      });

      const todoList = await app.getTodos('h-test');
      expect(todoList).toHaveLength(2);
    });

    it('should retrieve todo by id', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche récupérable',
      });

      const retrieved = await app.repositories.todos.getById(todo.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Tâche récupérable');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 3: Completion mini-form default values
  // ══════════════════════════════════════════════════════════════
  describe('3. TodoItem completion mini-form: Fait par defaults, modifiable, durée, Fait pour', () => {
    it('should complete todo with default Fait par (assignee)', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Sortir les cartons',
        assigneeMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      // Complete with Sam as performer (the assignee)
      const result = await app.completeTodo(
        todo.id,
        'm-sam', // Fait par = assignee
        10, // durée réelle
        ['m-alex', 'm-sam'] // Fait pour = same beneficiaries
      );

      expect(result.todo.status).toBe('completed');
      expect(result.todo.completedAt).toBeDefined();
    });

    it('should allow changing Fait par to different member', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche assignée à Sam',
        assigneeMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      // Alex completes it instead of Sam
      const result = await app.completeTodo(
        todo.id,
        'm-alex', // Different from assignee
        15,
        ['m-alex', 'm-sam']
      );

      expect(result.entry.performedByMemberId).toBe('m-alex');
      expect(result.todo.status).toBe('completed');
    });

    it('should allow modifying Fait pour during completion', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche pour tout le monde',
        assigneeMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      // Complete with different beneficiaries
      const result = await app.completeTodo(
        todo.id,
        'm-sam',
        20,
        ['m-alex'] // Only Alex, not Sam
      );

      expect(result.entry.beneficiaryMemberIds).toEqual(['m-alex']);
    });

    it('should require durée réelle > 0', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche test durée',
        beneficiaryMemberIds: ['m-alex'],
      });

      await expect(
        app.completeTodo(todo.id, 'm-alex', 0, ['m-alex'])
      ).rejects.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 4: Completion creates exactly one CompletedEntry
  // ══════════════════════════════════════════════════════════════
  describe('4. Completion creates exactly one CompletedEntry and marks TodoItem done', () => {
    it('should create exactly one CompletedEntry on completion', async () => {
      const entriesBefore = await app.getEntries('h-test');
      expect(entriesBefore).toHaveLength(0);

      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Sortir les cartons',
        assigneeMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      const result = await app.completeTodo(todo.id, 'm-sam', 10, ['m-alex', 'm-sam']);

      // Exactly one entry created
      const entriesAfter = await app.getEntries('h-test');
      expect(entriesAfter).toHaveLength(1);

      // Entry matches todo
      expect(entriesAfter[0].label).toBe('Sortir les cartons');
      expect(entriesAfter[0].performedByMemberId).toBe('m-sam');
      expect(entriesAfter[0].beneficiaryMemberIds).toEqual(['m-alex', 'm-sam']);
      expect(entriesAfter[0].durationMinutes).toBe(10);

      // Todo is marked done
      expect(result.todo.status).toBe('completed');
      expect(result.todo.completedAt).toBeDefined();
    });

    it('should not create duplicate entries on repeated completion attempts', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche à compléter',
        beneficiaryMemberIds: ['m-alex'],
      });

      await app.completeTodo(todo.id, 'm-alex', 15, ['m-alex']);

      const entriesAfter = await app.getEntries('h-test');
      expect(entriesAfter).toHaveLength(1);

      // Attempting to complete again should fail (todo already completed)
      await expect(
        app.completeTodo(todo.id, 'm-alex', 10, ['m-alex'])
      ).rejects.toThrow();
    });

    it('should preserve persistentTaskId from todo in entry', async () => {
      const task = await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Vaisselle',
      });

      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Faire la vaisselle',
        persistentTaskId: task.id,
        beneficiaryMemberIds: ['m-alex'],
      });

      const result = await app.completeTodo(todo.id, 'm-alex', 30, ['m-alex']);
      expect(result.entry.persistentTaskId).toBe(task.id);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 5: Score and history update immediately after completion
  // ══════════════════════════════════════════════════════════════
  describe('5. Score and history update immediately after completion', () => {
    it('should update Score after todo completion', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Vaisselle',
        assigneeMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      // Score before completion
      const scoreBefore = await app.calculateScore('h-test', 'month');
      expect(scoreBefore.sumOfBalances).toBe(0);

      // Complete the todo
      await app.completeTodo(todo.id, 'm-alex', 60, ['m-alex', 'm-sam']);

      // Score after completion
      const scoreAfter = await app.calculateScore('h-test', 'month');
      expect(scoreAfter.balances).toHaveLength(2);

      // Alex performed 60min for 2 beneficiaries: Alex +30, Sam -30
      const alexBalance = scoreAfter.balances.find((b) => b.memberId === 'm-alex');
      const samBalance = scoreAfter.balances.find((b) => b.memberId === 'm-sam');
      expect(alexBalance?.minutes).toBe(30);
      expect(samBalance?.minutes).toBe(-30);
      expect(scoreAfter.sumOfBalances).toBe(0);
    });

    it('should update history immediately after completion', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Courses',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      // History before
      const historyBefore = await app.getVisibleEntries('h-test');
      expect(historyBefore).toHaveLength(0);

      // Complete
      await app.completeTodo(todo.id, 'm-sam', 20, ['m-alex', 'm-sam']);

      // History after
      const historyAfter = await app.getVisibleEntries('h-test');
      expect(historyAfter).toHaveLength(1);
      expect(historyAfter[0].label).toBe('Courses');
    });

    it('should update performed minutes after completion', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Ménage',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      await app.completeTodo(todo.id, 'm-alex', 45, ['m-alex', 'm-sam']);

      const score = await app.calculateScore('h-test', 'month');
      expect(score.performedMinutes['m-alex']).toBe(45);
    });

    it('should update compensations after completion', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche pour Sam',
        beneficiaryMemberIds: ['m-sam'],
      });

      await app.completeTodo(todo.id, 'm-alex', 30, ['m-sam']);

      const score = await app.calculateScore('h-test', 'month');
      expect(score.compensations).toHaveLength(1);
      expect(score.compensations[0].fromMemberId).toBe('m-sam');
      expect(score.compensations[0].toMemberId).toBe('m-alex');
      expect(score.compensations[0].minutes).toBe(30);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 6: Free mode — upsell contextuel, no TodoItem created
  // ══════════════════════════════════════════════════════════════
  describe('6. Free mode: create/planify triggers upsell, no TodoItem created', () => {
    it('should throw when creating todo in Free mode', async () => {
      entitlementAdapter.setMode('demo-free');

      await expect(
        app.createTodo({
          householdId: 'h-test',
          title: 'Tâche gratuite',
          beneficiaryMemberIds: ['m-alex'],
        })
      ).rejects.toThrow('Todo planning requires Premium subscription');
    });

    it('should throw when listing todos in Free mode', async () => {
      entitlementAdapter.setMode('demo-free');

      await expect(app.getTodos('h-test')).rejects.toThrow(
        'Todo planning requires Premium subscription'
      );
    });

    it('should not create any TodoItem in Free mode', async () => {
      entitlementAdapter.setMode('demo-free');

      try {
        await app.createTodo({
          householdId: 'h-test',
          title: 'Should not exist',
          beneficiaryMemberIds: ['m-alex'],
        });
      } catch {
        // Expected
      }

      // Verify no todo was created
      const todoList = await todos.getByHousehold('h-test');
      expect(todoList).toHaveLength(0);
    });

    it('should allow viewing todo tab in Free mode (tab visible)', async () => {
      entitlementAdapter.setMode('demo-free');

      // The entitlement check in getTodos should throw, but the tab
      // itself should be visible — the UI handles this by catching
      // the error and showing the upsell state
      const entitlement = await app.getEntitlement('h-test');
      expect(entitlement.plan).toBe('free');
      expect(entitlement.todoPlanningEnabled).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 7: Downgrade does not destroy existing TodoItems
  // ══════════════════════════════════════════════════════════════
  describe('7. Downgrade from Premium does not destroy existing TodoItems', () => {
    it('should preserve todos after downgrade from Premium to Free', async () => {
      // Create todos in Premium mode
      const todo1 = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche Premium 1',
        beneficiaryMemberIds: ['m-alex'],
      });
      const todo2 = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche Premium 2',
        beneficiaryMemberIds: ['m-sam'],
      });

      // Verify they exist
      const todosBefore = await app.getTodos('h-test');
      expect(todosBefore).toHaveLength(2);

      // Downgrade to Free
      entitlementAdapter.setMode('demo-free');

      // Todos still exist in the repository (not destroyed)
      const todosAfter = await todos.getByHousehold('h-test');
      expect(todosAfter).toHaveLength(2);
      expect(todosAfter.find((t) => t.id === todo1.id)).toBeDefined();
      expect(todosAfter.find((t) => t.id === todo2.id)).toBeDefined();
    });

    it('should restore todos after upgrade back to Premium', async () => {
      // Create todo in Premium
      await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche importante',
        beneficiaryMemberIds: ['m-alex'],
      });

      // Downgrade
      entitlementAdapter.setMode('demo-free');

      // Todos persist
      const todosFree = await todos.getByHousehold('h-test');
      expect(todosFree).toHaveLength(1);

      // Upgrade back
      entitlementAdapter.setMode('demo-premium');

      // Todos are accessible again
      const todosRestored = await app.getTodos('h-test');
      expect(todosRestored).toHaveLength(1);
      expect(todosRestored[0].title).toBe('Tâche importante');
    });

    it('should preserve completed todos after downgrade', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche à compléter',
        beneficiaryMemberIds: ['m-alex'],
      });

      await app.completeTodo(todo.id, 'm-alex', 15, ['m-alex']);

      // Downgrade
      entitlementAdapter.setMode('demo-free');

      // Completed todo persists
      const todosAfter = await todos.getByHousehold('h-test');
      expect(todosAfter).toHaveLength(1);
      expect(todosAfter[0].status).toBe('completed');
      expect(todosAfter[0].completedAt).toBeDefined();
    });

    it('should preserve todos created during Premium after downgrade, then allow completion after re-upgrade', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche downgrade test',
        assigneeMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      // Downgrade
      entitlementAdapter.setMode('demo-free');

      // Upgrade back
      entitlementAdapter.setMode('demo-premium');

      // Can complete the preserved todo
      const result = await app.completeTodo(todo.id, 'm-sam', 25, ['m-alex', 'm-sam']);
      expect(result.todo.status).toBe('completed');
      expect(result.entry.durationMinutes).toBe(25);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 8: PersistentTask link optional on TodoItem
  // ══════════════════════════════════════════════════════════════
  describe('8. PersistentTask link optional on TodoItem', () => {
    it('should create todo with null persistentTaskId', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Sans PersistentTask',
      });

      expect(todo.persistentTaskId).toBeNull();
    });

    it('should create todo with a linked PersistentTask', async () => {
      const task = await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Vaisselle',
      });

      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Avec PersistentTask',
        persistentTaskId: task.id,
      });

      expect(todo.persistentTaskId).toBe(task.id);
    });

    it('should carry persistentTaskId to CompletedEntry on completion', async () => {
      const task = await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Courses',
      });

      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Faire les courses',
        persistentTaskId: task.id,
        beneficiaryMemberIds: ['m-alex'],
      });

      const result = await app.completeTodo(todo.id, 'm-alex', 30, ['m-alex']);
      expect(result.entry.persistentTaskId).toBe(task.id);
    });

    it('should carry null persistentTaskId to CompletedEntry when not linked', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche ponctuelle',
        beneficiaryMemberIds: ['m-alex'],
      });

      const result = await app.completeTodo(todo.id, 'm-alex', 15, ['m-alex']);
      expect(result.entry.persistentTaskId).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 9: Reference scenario conversion (two-member-core todo)
  // ══════════════════════════════════════════════════════════════
  describe('9. Reference scenario: todo conversion', () => {
    it('should complete "Sortir les cartons" as Sam in 10 minutes for Alex and Sam', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Sortir les cartons',
        assigneeMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      const result = await app.completeTodo(todo.id, 'm-sam', 10, ['m-alex', 'm-sam']);

      // Todo completed
      expect(result.todo.status).toBe('completed');
      expect(result.todo.title).toBe('Sortir les cartons');

      // Entry created
      expect(result.entry.label).toBe('Sortir les cartons');
      expect(result.entry.performedByMemberId).toBe('m-sam');
      expect(result.entry.beneficiaryMemberIds).toEqual(['m-alex', 'm-sam']);
      expect(result.entry.durationMinutes).toBe(10);

      // Score updates: Sam +10, each beneficiary -5
      const score = await app.calculateScore('h-test', 'month');
      const samBalance = score.balances.find((b) => b.memberId === 'm-sam');
      const alexBalance = score.balances.find((b) => b.memberId === 'm-alex');
      expect(samBalance?.minutes).toBe(5);   // +10 - 5
      expect(alexBalance?.minutes).toBe(-5);  // -5
      expect(score.sumOfBalances).toBe(0);
    });

    it('should update history immediately after reference scenario completion', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Sortir les cartons',
        assigneeMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
      });

      await app.completeTodo(todo.id, 'm-sam', 10, ['m-alex', 'm-sam']);

      const history = await app.getVisibleEntries('h-test');
      expect(history).toHaveLength(1);
      expect(history[0].label).toBe('Sortir les cartons');
      expect(history[0].durationMinutes).toBe(10);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 10: Todo deletion
  // ══════════════════════════════════════════════════════════════
  describe('10. Todo deletion', () => {
    it('should delete a todo', async () => {
      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'À supprimer',
        beneficiaryMemberIds: ['m-alex'],
      });

      const before = await app.getTodos('h-test');
      expect(before).toHaveLength(1);

      await app.repositories.todos.delete(todo.id);

      const after = await app.getTodos('h-test');
      expect(after).toHaveLength(0);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 11: TodoItem is distinct from CompletedEntry and PersistentTask
  // ══════════════════════════════════════════════════════════════
  describe('11. TodoItem remains distinct from CompletedEntry and PersistentTask', () => {
    it('should not create entries when creating todos', async () => {
      await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche future',
        beneficiaryMemberIds: ['m-alex'],
      });

      const entriesList = await app.getEntries('h-test');
      expect(entriesList).toHaveLength(0);
    });

    it('should not create persistent tasks when creating todos', async () => {
      await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche sans PT',
        beneficiaryMemberIds: ['m-alex'],
      });

      const ptList = await app.getPersistentTasks('h-test');
      expect(ptList).toHaveLength(0);
    });

    it('should create exactly one entry per todo completion', async () => {
      const todo1 = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche 1',
        beneficiaryMemberIds: ['m-alex'],
      });
      const todo2 = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche 2',
        beneficiaryMemberIds: ['m-sam'],
      });

      await app.completeTodo(todo1.id, 'm-alex', 10, ['m-alex']);
      await app.completeTodo(todo2.id, 'm-sam', 20, ['m-sam']);

      const entriesList = await app.getEntries('h-test');
      expect(entriesList).toHaveLength(2);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECTION 12: Entitlement gating
  // ══════════════════════════════════════════════════════════════
  describe('12. Entitlement gating for todo operations', () => {
    it('should allow todo operations in demo-premium mode', async () => {
      const entitlement = await app.getEntitlement('h-test');
      expect(entitlement.todoPlanningEnabled).toBe(true);

      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Tâche Premium',
        beneficiaryMemberIds: ['m-alex'],
      });
      expect(todo.id).toBeDefined();
    });

    it('should block todo operations in demo-free mode', async () => {
      entitlementAdapter.setMode('demo-free');

      const entitlement = await app.getEntitlement('h-test');
      expect(entitlement.todoPlanningEnabled).toBe(false);

      await expect(
        app.createTodo({
          householdId: 'h-test',
          title: 'Bloqué',
          beneficiaryMemberIds: ['m-alex'],
        })
      ).rejects.toThrow('Todo planning requires Premium subscription');
    });

    it('should allow todo operations after re-upgrade', async () => {
      entitlementAdapter.setMode('demo-free');

      await expect(
        app.createTodo({
          householdId: 'h-test',
          title: 'Bloqué',
          beneficiaryMemberIds: ['m-alex'],
        })
      ).rejects.toThrow();

      entitlementAdapter.setMode('demo-premium');

      const todo = await app.createTodo({
        householdId: 'h-test',
        title: 'Débloqué',
        beneficiaryMemberIds: ['m-alex'],
      });
      expect(todo.id).toBeDefined();
    });
  });
});
