/**
 * ChoreScore V2 — ChoreScoreApp Use Case Tests
 *
 * Tests for the main application facade.
 */

import { ChoreScoreApp } from '../../src/application/use-cases/ChoreScoreApp';
import { LocalAuthAdapter } from '../../src/infrastructure/local/LocalAuthAdapter';
import { LocalEntitlementAdapter } from '../../src/infrastructure/local/LocalEntitlementAdapter';
import { LocalBillingAdapter } from '../../src/infrastructure/local/LocalBillingAdapter';
import { SystemShareAdapter } from '../../src/infrastructure/local/LocalSystemShareAdapter';
import { LocalNotificationAdapter } from '../../src/infrastructure/local/LocalNotificationAdapter';
import { LocalCalendarAdapter } from '../../src/infrastructure/local/LocalCalendarAdapter';
import { LocalSecureStorageAdapter } from '../../src/infrastructure/local/LocalSecureStorageAdapter';
import { LocalSyncAdapter } from '../../src/infrastructure/local/LocalSyncAdapter';
import { LocalResearchAnalyticsAdapter } from '../../src/infrastructure/local/LocalResearchAnalyticsAdapter';
import {
  InMemoryHouseholdRepository,
  InMemoryMemberRepository,
  InMemoryEntryRepository,
  InMemoryPersistentTaskRepository,
  InMemoryTodoRepository,
} from '../../src/infrastructure/repositories/InMemoryRepositories';
import { Household, Member } from '../../src/domain/entities';

describe('ChoreScoreApp', () => {
  let app: ChoreScoreApp;
  let authAdapter: LocalAuthAdapter;
  let entitlementAdapter: LocalEntitlementAdapter;
  let analyticsAdapter: LocalResearchAnalyticsAdapter;

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
    analyticsAdapter = new LocalResearchAnalyticsAdapter();

    const households = new InMemoryHouseholdRepository();
    const members = new InMemoryMemberRepository();
    const entries = new InMemoryEntryRepository();
    const persistentTasks = new InMemoryPersistentTaskRepository();
    const todos = new InMemoryTodoRepository();

    households.seed([testHousehold]);
    members.seed(testMembers);

    app = new ChoreScoreApp(
      {
        auth: authAdapter,
        entitlements: entitlementAdapter,
        share: new SystemShareAdapter(),
        notifications: new LocalNotificationAdapter(),
        calendar: new LocalCalendarAdapter(),
        secureStorage: new LocalSecureStorageAdapter(),
        sync: new LocalSyncAdapter(),
        analytics: analyticsAdapter,
      },
      {
        households,
        members,
        entries,
        persistentTasks,
        todos,
      }
    );
  });

  describe('Household use cases', () => {
    it('should get all households', async () => {
      const households = await app.getHouseholds();
      expect(households).toHaveLength(1);
      expect(households[0].id).toBe('h-test');
    });

    it('should get household by id', async () => {
      const household = await app.getHousehold('h-test');
      expect(household).not.toBeNull();
      expect(household?.name).toBe('Test Household');
    });

    it('should return null for non-existent household', async () => {
      const household = await app.getHousehold('h-nonexistent');
      expect(household).toBeNull();
    });
  });

  describe('Entry use cases', () => {
    it('should create an entry', async () => {
      const entry = await app.createEntry({
        householdId: 'h-test',
        label: 'Vaisselle',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 30,
        createdBy: 'm-alex',
      });

      expect(entry.label).toBe('Vaisselle');
      expect(entry.durationMinutes).toBe(30);
      expect(entry.beneficiaryMemberIds).toEqual(['m-alex', 'm-sam']);
    });

    it('should emit analytics fact when enabled', async () => {
      analyticsAdapter.setEnabled(true);

      await app.createEntry({
        householdId: 'h-test',
        label: 'Vaisselle',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 30,
        createdBy: 'm-alex',
      });

      const facts = analyticsAdapter.getFacts();
      expect(facts).toHaveLength(1);
      expect(facts[0].type).toBe('entry_created');
    });

    it('should emit no operational IDs in analytics fact when creating entry', async () => {
      analyticsAdapter.setEnabled(true);

      await app.createEntry({
        householdId: 'h-test',
        label: 'Vaisselle',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 30,
        createdBy: 'm-alex',
      });

      const facts = analyticsAdapter.getFacts();
      expect(facts).toHaveLength(1);

      const factData = facts[0].data;
      // Must NOT contain any operational identifier
      expect(factData).not.toHaveProperty('householdId');
      expect(factData).not.toHaveProperty('memberId');
      expect(factData).not.toHaveProperty('performedByMemberId');
      expect(factData).not.toHaveProperty('beneficiaryMemberIds');
      expect(factData).not.toHaveProperty('label');
      expect(factData).not.toHaveProperty('email');
      expect(factData).not.toHaveProperty('ip');
      expect(factData).not.toHaveProperty('deviceId');
      expect(factData).not.toHaveProperty('createdBy');
      // Must contain only minimized statistical data
      expect(factData).toHaveProperty('durationMinutes', 30);
      expect(factData).toHaveProperty('beneficiaryCount', 2);
      expect(factData).toHaveProperty('hasPersistentTask', false);
    });

    it('should not emit analytics fact when disabled', async () => {
      analyticsAdapter.setEnabled(false);

      await app.createEntry({
        householdId: 'h-test',
        label: 'Vaisselle',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 30,
        createdBy: 'm-alex',
      });

      const facts = analyticsAdapter.getFacts();
      expect(facts).toHaveLength(0);
    });
  });

  describe('Entitlement use cases', () => {
    it('should get entitlement for a household', async () => {
      const entitlement = await app.getEntitlement('h-test');
      expect(entitlement.plan).toBe('standard');
      expect(entitlement.weightingEnabled).toBe(true);
    });

    it('should check feature availability', async () => {
      expect(await app.canUseFeature('h-test', 'weighting')).toBe(true);
      expect(await app.canUseFeature('h-test', 'todo-planning')).toBe(true);
    });

    it('should reflect mode changes', async () => {
      entitlementAdapter.setMode('demo-free');
      const entitlement = await app.getEntitlement('h-test');
      expect(entitlement.plan).toBe('free');
      expect(entitlement.weightingEnabled).toBe(false);
    });
  });

  describe('Score use cases', () => {
    it('should calculate score', async () => {
      // Add some entries first
      await app.createEntry({
        householdId: 'h-test',
        label: 'Vaisselle',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 60,
        createdBy: 'm-alex',
      });

      const score = await app.calculateScore('h-test', 'month');
      expect(score.period).toBe('month');
      expect(score.balances).toHaveLength(2);
      expect(score.performedMinutes['m-alex']).toBe(60);
    });
  });

  describe('Auth', () => {
    it('should provide local auth', () => {
      expect(authAdapter.isAvailable()).toBe(true);
    });

    it('should start with no user', () => {
      expect(authAdapter.getCurrentUserId()).toBeNull();
    });

    it('should sign in locally', async () => {
      const result = await authAdapter.signInWithEmail('test@example.com', 'password');
      expect(result).not.toBeNull();
      expect(authAdapter.getCurrentUserId()).not.toBeNull();
    });
  });
});
