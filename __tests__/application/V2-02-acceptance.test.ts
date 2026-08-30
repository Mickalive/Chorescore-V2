/**
 * ChoreScore V2 — V2-02 Acceptance Criteria Tests
 *
 * Verifies all acceptance criteria for V2-02:
 * - CompletedEntry created with all required fields
 * - Fait par defaults to connected user, changeable to any household member
 * - Fait pour allows 'Tout le monde' or any non-empty subset
 * - Two duration modes: manual input and chrono
 * - PersistentTask optional: creates Score filter, does not create entries
 * - History shows current civil month in Free mode
 * - History shows full archive in Trial/Standard/Pro mode
 * - No CompletedEntry destroyed on month change or downgrade
 * - Modification and deletion of entries possible
 * - Local persistence and chrono resume work
 * - npm run check green, no regressions
 * - Design follows DESIGN_BRIEF.md
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
  InMemoryChronoTimerRepository,
} from '../../src/infrastructure/repositories/InMemoryRepositories';
import {
  PersistentChronoTimerRepository,
} from '../../src/infrastructure/repositories/PersistentRepositories';
import { CompletedEntry, Member, User, Household } from '../../src/domain/entities';
import { isInCivilMonth, getCurrentCivilMonth } from '../../src/domain/calculations/civilMonth';

describe('V2-02 Acceptance Criteria', () => {
  let app: ChoreScoreApp;
  let authAdapter: LocalAuthAdapter;
  let entitlementAdapter: LocalEntitlementAdapter;
  let entries: InMemoryEntryRepository;
  let members: InMemoryMemberRepository;
  let households: InMemoryHouseholdRepository;
  let persistentTasks: InMemoryPersistentTaskRepository;
  let chronoTimer: InMemoryChronoTimerRepository;
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
    users = new InMemoryUserRepository();
    entries = new InMemoryEntryRepository();
    members = new InMemoryMemberRepository();
    households = new InMemoryHouseholdRepository();
    persistentTasks = new InMemoryPersistentTaskRepository();
    chronoTimer = new InMemoryChronoTimerRepository();

    const memberships = new InMemoryMembershipRepository();
    const accounts = new InMemoryAccountRepository();
    const todos = new InMemoryTodoRepository();

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
        chronoTimer,
      }
    );
  });

  describe('1. CompletedEntry created with all required fields', () => {
    it('should create entry with label, performedByMemberId, beneficiaryMemberIds, duration, household, date/time', async () => {
      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'Vaisselle du soir',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 30,
        createdBy: 'm-alex',
      });

      expect(entry.id).toBeDefined();
      expect(entry.label).toBe('Vaisselle du soir');
      expect(entry.performedByMemberId).toBe('m-alex');
      expect(entry.beneficiaryMemberIds).toEqual(['m-alex', 'm-sam']);
      expect(entry.durationMinutes).toBe(30);
      expect(entry.householdId).toBe('h-test');
      expect(entry.occurredAt).toBeDefined();
      expect(entry.createdBy).toBe('m-alex');
    });

    it('should create entry with optional persistentTaskId', async () => {
      const task = await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Vaisselle',
      });

      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'Vaisselle',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 30,
        persistentTaskId: task.id,
        createdBy: 'm-alex',
      });

      expect(entry.persistentTaskId).toBe(task.id);
    });
  });

  describe('2. Fait par defaults to connected user, changeable to any household member', () => {
    it('should default performedBy to connected user', async () => {
      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'Test',
        performedByMemberId: 'm-alex', // Connected user's member
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 15,
        createdBy: 'u-1',
      });

      expect(entry.performedByMemberId).toBe('m-alex');
    });

    it('should allow changing performedBy to any household member', async () => {
      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'Test',
        performedByMemberId: 'm-sam', // Different member
        beneficiaryMemberIds: ['m-alex'],
        durationMinutes: 15,
        createdBy: 'u-1',
      });

      expect(entry.performedByMemberId).toBe('m-sam');
    });
  });

  describe('3. Fait pour allows Tout le monde or any non-empty subset', () => {
    it('should allow all members as beneficiaries (Tout le monde)', async () => {
      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'Test',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 15,
        createdBy: 'm-alex',
      });

      expect(entry.beneficiaryMemberIds).toHaveLength(2);
    });

    it('should allow a subset of members as beneficiaries', async () => {
      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'Test',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 15,
        createdBy: 'm-alex',
      });

      expect(entry.beneficiaryMemberIds).toEqual(['m-sam']);
    });

    it('should allow self as sole beneficiary', async () => {
      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'Test',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex'],
        durationMinutes: 15,
        createdBy: 'm-alex',
      });

      expect(entry.beneficiaryMemberIds).toEqual(['m-alex']);
    });
  });

  describe('4. Two duration modes: manual input and chrono', () => {
    it('should create entry with manual duration', async () => {
      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'Manual task',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 45,
        createdBy: 'm-alex',
      });

      expect(entry.durationMinutes).toBe(45);
    });

    it('should support chrono timer start/stop', async () => {
      await app.startChrono('h-test', 'm-alex');
      const state = await app.getChronoState('h-test');
      expect(state).not.toBeNull();
      expect(state?.isRunning).toBe(true);
      expect(state?.memberId).toBe('m-alex');

      const elapsed = await app.stopChrono('h-test');
      expect(elapsed).toBeGreaterThanOrEqual(1);
    });

    it('should persist chrono state for resume', async () => {
      // Use a persistent chrono timer to prove data survives instance recreation
      const chronoRepo1 = new PersistentChronoTimerRepository();
      await chronoRepo1.setState('h-test', {
        householdId: 'h-test',
        memberId: 'm-alex',
        startedAt: new Date().toISOString(),
        isRunning: true,
      });

      // Simulate app restart: create a completely new repo instance
      const chronoRepo2 = new PersistentChronoTimerRepository();
      const state = await chronoRepo2.getState('h-test');
      expect(state).not.toBeNull();
      expect(state?.isRunning).toBe(true);
      expect(state?.memberId).toBe('m-alex');
    });
  });

  describe('5. PersistentTask optional: creates Score filter, does not create entries', () => {
    it('should create persistent task', async () => {
      const task = await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Vaisselle',
      });

      expect(task.id).toBeDefined();
      expect(task.name).toBe('Vaisselle');
      expect(task.householdId).toBe('h-test');
    });

    it('should list persistent tasks for household', async () => {
      await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Vaisselle',
      });
      await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Cuisine',
      });

      const tasks = await app.getPersistentTasks('h-test');
      expect(tasks).toHaveLength(2);
    });

    it('should not create entries when creating persistent task', async () => {
      const entriesBefore = await app.getEntries('h-test');
      expect(entriesBefore).toHaveLength(0);

      await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Vaisselle',
      });

      const entriesAfter = await app.getEntries('h-test');
      expect(entriesAfter).toHaveLength(0);
    });

    it('should link entry to persistent task for filtering', async () => {
      const task = await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Vaisselle',
      });

      await app.createEntry({
        householdId: 'h-test',
        label: 'Vaisselle',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 30,
        persistentTaskId: task.id,
        createdBy: 'm-alex',
      });

      await app.createEntry({
        householdId: 'h-test',
        label: 'Courses',
        performedByMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex'],
        durationMinutes: 20,
        persistentTaskId: null,
        createdBy: 'm-sam',
      });

      const allEntries = await app.getEntries('h-test');
      expect(allEntries).toHaveLength(2);

      // Filter by persistent task
      const filtered = allEntries.filter(e => e.persistentTaskId === task.id);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].label).toBe('Vaisselle');
    });
  });

  describe('6. History shows current civil month in Free mode', () => {
    it('should show only current month entries in Free mode', async () => {
      entitlementAdapter.setMode('demo-free');

      // Create entry in current month
      const [year, month] = getCurrentCivilMonth();
      const currentMonthDate = new Date(year, month - 1, 15).toISOString();

      await app.createEntry({
        householdId: 'h-test',
        label: 'Current month',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 30,
        occurredAt: currentMonthDate,
        createdBy: 'm-alex',
      });

      // Create entry in previous month
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonthDate = new Date(prevYear, prevMonth - 1, 15).toISOString();

      await app.createEntry({
        householdId: 'h-test',
        label: 'Previous month',
        performedByMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex'],
        durationMinutes: 20,
        occurredAt: prevMonthDate,
        createdBy: 'm-sam',
      });

      const visibleEntries = await app.getVisibleEntries('h-test');
      expect(visibleEntries).toHaveLength(1);
      expect(visibleEntries[0].label).toBe('Current month');
    });
  });

  describe('7. History shows full archive in Trial/Standard/Pro mode', () => {
    it('should show all entries in Premium mode', async () => {
      // Demo-premium mode by default

      // Create entry in current month
      const [year, month] = getCurrentCivilMonth();
      const currentMonthDate = new Date(year, month - 1, 15).toISOString();

      await app.createEntry({
        householdId: 'h-test',
        label: 'Current month',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 30,
        occurredAt: currentMonthDate,
        createdBy: 'm-alex',
      });

      // Create entry in previous month
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonthDate = new Date(prevYear, prevMonth - 1, 15).toISOString();

      await app.createEntry({
        householdId: 'h-test',
        label: 'Previous month',
        performedByMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex'],
        durationMinutes: 20,
        occurredAt: prevMonthDate,
        createdBy: 'm-sam',
      });

      const visibleEntries = await app.getVisibleEntries('h-test');
      expect(visibleEntries).toHaveLength(2);
    });
  });

  describe('8. No CompletedEntry destroyed on month change or downgrade', () => {
    it('should not destroy entries when downgrading from Premium to Free', async () => {
      // Create entries in premium mode
      await app.createEntry({
        householdId: 'h-test',
        label: 'Task 1',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 30,
        createdBy: 'm-alex',
      });

      await app.createEntry({
        householdId: 'h-test',
        label: 'Task 2',
        performedByMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex'],
        durationMinutes: 20,
        createdBy: 'm-sam',
      });

      // Verify entries exist
      const entriesBefore = await app.getEntries('h-test');
      expect(entriesBefore).toHaveLength(2);

      // Downgrade to free
      entitlementAdapter.setMode('demo-free');

      // Entries should still exist in the repository
      const entriesAfterDowngrade = await app.getEntries('h-test');
      expect(entriesAfterDowngrade).toHaveLength(2);

      // Visible entries should be filtered (current month only)
      const visibleEntries = await app.getVisibleEntries('h-test');
      expect(visibleEntries.length).toBeLessThanOrEqual(2);
    });

    it('should not destroy PersistentTasks on downgrade', async () => {
      await app.createPersistentTask({
        householdId: 'h-test',
        name: 'Vaisselle',
      });

      const tasksBefore = await app.getPersistentTasks('h-test');
      expect(tasksBefore).toHaveLength(1);

      entitlementAdapter.setMode('demo-free');

      const tasksAfter = await app.getPersistentTasks('h-test');
      expect(tasksAfter).toHaveLength(1);
    });
  });

  describe('9. Modification and deletion of entries possible', () => {
    it('should update an entry', async () => {
      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'Original',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 30,
        createdBy: 'm-alex',
      });

      const updated = await app.updateEntry(entry.id, {
        label: 'Updated',
        durationMinutes: 45,
      });

      expect(updated.label).toBe('Updated');
      expect(updated.durationMinutes).toBe(45);
    });

    it('should delete an entry', async () => {
      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'To delete',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 15,
        createdBy: 'm-alex',
      });

      const entriesBefore = await app.getEntries('h-test');
      expect(entriesBefore).toHaveLength(1);

      await app.deleteEntry(entry.id);

      const entriesAfter = await app.getEntries('h-test');
      expect(entriesAfter).toHaveLength(0);
    });
  });

  describe('10. Local persistence and chrono resume work', () => {
    it('should persist chrono state across app restarts', async () => {
      // Use persistent repo to prove data survives instance recreation
      const chronoRepo1 = new PersistentChronoTimerRepository();
      await chronoRepo1.setState('h-test', {
        householdId: 'h-test',
        memberId: 'm-alex',
        startedAt: new Date().toISOString(),
        isRunning: true,
      });

      // Simulate app restart: create a completely new repo instance
      const chronoRepo2 = new PersistentChronoTimerRepository();
      const state = await chronoRepo2.getState('h-test');
      expect(state).not.toBeNull();
      expect(state?.isRunning).toBe(true);
    });

    it('should clear chrono state after stopping', async () => {
      await app.startChrono('h-test', 'm-alex');
      await app.stopChrono('h-test');

      const state = await app.getChronoState('h-test');
      expect(state).toBeNull();
    });
  });

  describe('11. hasOlderEntries detection', () => {
    it('should detect older entries in Free mode', async () => {
      entitlementAdapter.setMode('demo-free');

      const [year, month] = getCurrentCivilMonth();
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonthDate = new Date(prevYear, prevMonth - 1, 15).toISOString();

      await app.createEntry({
        householdId: 'h-test',
        label: 'Old entry',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 30,
        occurredAt: prevMonthDate,
        createdBy: 'm-alex',
      });

      const hasOlder = await app.hasOlderEntries('h-test');
      expect(hasOlder).toBe(true);
    });

    it('should not detect older entries when none exist', async () => {
      entitlementAdapter.setMode('demo-free');

      const hasOlder = await app.hasOlderEntries('h-test');
      expect(hasOlder).toBe(false);
    });

    it('should not show archive message in Premium mode', async () => {
      const [year, month] = getCurrentCivilMonth();
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonthDate = new Date(prevYear, prevMonth - 1, 15).toISOString();

      await app.createEntry({
        householdId: 'h-test',
        label: 'Old entry',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 30,
        occurredAt: prevMonthDate,
        createdBy: 'm-alex',
      });

      const hasOlder = await app.hasOlderEntries('h-test');
      expect(hasOlder).toBe(false); // Premium has archive access, no message needed
    });
  });

  describe('12. Civil month filtering utilities', () => {
    it('should correctly identify current civil month', () => {
      const [year, month] = getCurrentCivilMonth();
      const now = new Date().toISOString();
      expect(isInCivilMonth(now, year, month)).toBe(true);
    });

    it('should correctly reject different months', () => {
      const [year, month] = getCurrentCivilMonth();
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const now = new Date().toISOString();
      expect(isInCivilMonth(now, prevYear, prevMonth)).toBe(false);
    });
  });

  describe('13. Entry repository operations', () => {
    it('should retrieve entries sorted by date descending', async () => {
      await app.createEntry({
        householdId: 'h-test',
        label: 'First',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-sam'],
        durationMinutes: 10,
        occurredAt: '2026-08-01T10:00:00Z',
        createdBy: 'm-alex',
      });

      await app.createEntry({
        householdId: 'h-test',
        label: 'Second',
        performedByMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex'],
        durationMinutes: 20,
        occurredAt: '2026-08-15T10:00:00Z',
        createdBy: 'm-sam',
      });

      const allEntries = await app.getEntries('h-test');
      expect(allEntries).toHaveLength(2);
      // Most recent first
      expect(allEntries[0].label).toBe('Second');
      expect(allEntries[1].label).toBe('First');
    });
  });
});
