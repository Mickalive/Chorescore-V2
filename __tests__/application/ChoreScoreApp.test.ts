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
  InMemoryUserRepository,
  InMemoryMembershipRepository,
  InMemoryAccountRepository,
} from '../../src/infrastructure/repositories/InMemoryRepositories';
import { Household, Member, User } from '../../src/domain/entities';

describe('ChoreScoreApp', () => {
  let app: ChoreScoreApp;
  let authAdapter: LocalAuthAdapter;
  let entitlementAdapter: LocalEntitlementAdapter;
  let analyticsAdapter: LocalResearchAnalyticsAdapter;
  let users: InMemoryUserRepository;
  let memberships: InMemoryMembershipRepository;
  let accounts: InMemoryAccountRepository;

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
    analyticsAdapter = new LocalResearchAnalyticsAdapter();
    users = new InMemoryUserRepository();
    memberships = new InMemoryMembershipRepository();
    accounts = new InMemoryAccountRepository();

    const households = new InMemoryHouseholdRepository();
    const members = new InMemoryMemberRepository();
    const entries = new InMemoryEntryRepository();
    const persistentTasks = new InMemoryPersistentTaskRepository();
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

  describe('User & Account use cases', () => {
    it('should get current user when authenticated', async () => {
      authAdapter.setUser({
        userId: testUser.id,
        email: testUser.email,
        displayName: testUser.displayName,
        provider: 'email',
      });
      const user = await app.getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.id).toBe('u-1');
      expect(user?.email).toBe('alex@example.com');
    });

    it('should return null for unauthenticated user', async () => {
      const user = await app.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should get or create account', async () => {
      const account = await app.getOrCreateAccount('u-1');
      expect(account).not.toBeNull();
      expect(account.userId).toBe('u-1');
      expect(account.ownedFreeHouseholdId).toBeNull();
    });

    it('should get households for user via memberships', async () => {
      // Memberships are already seeded in beforeEach
      const households = await app.getHouseholdsForUser('u-1');
      expect(households).toHaveLength(1);
      expect(households[0].id).toBe('h-test');
    });
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

    it('should create household with account-level entitlement check', async () => {
      const household = await app.createHousehold('New Household', 'u-1');

      expect(household.name).toBe('New Household');
      expect(household.ownerId).toBe('u-1');

      // Check account was updated
      const account = await accounts.getByUser('u-1');
      expect(account?.ownedFreeHouseholdId).toBe(household.id);

      // Check membership was created
      const membership = await memberships.getByUserAndHousehold('u-1', household.id);
      expect(membership).not.toBeNull();
      expect(membership?.role).toBe('OWNER');

      // Check member was created
      const member = await app.getMembersForHousehold(household.id);
      expect(member).toHaveLength(1);
      expect(member[0].userId).toBe('u-1');
    });

    it('should join household via invitation', async () => {
      // u-3 is not a member of h-test
      const membership = await app.joinHousehold('u-3', 'h-test');

      expect(membership.userId).toBe('u-3');
      expect(membership.householdId).toBe('h-test');
      expect(membership.role).toBe('MEMBER');

      // Check member was created
      const members = await app.getMembersForHousehold('h-test');
      expect(members).toHaveLength(3); // 2 original + 1 new
    });

    it('should not allow joining same household twice', async () => {
      // u-2 is already a member of h-test (from test setup)
      await expect(app.joinHousehold('u-2', 'h-test')).rejects.toThrow(
        'Already a member of this household'
      );
    });

    it('should get household summary with member count and plan', async () => {
      const summary = await app.getHouseholdSummary('h-test');

      expect(summary).not.toBeNull();
      expect(summary?.household.id).toBe('h-test');
      expect(summary?.memberCount).toBe(2);
      expect(summary?.effectivePlan).toBe('standard');
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

    it('should get account-level entitlement', async () => {
      const accountEntitlement = await app.getAccountEntitlement('u-1');
      expect(accountEntitlement.canCreateFreeHousehold).toBe(true);
    });

    it('should check if user can create household', async () => {
      const canCreate = await app.canCreateHousehold('u-1');
      expect(canCreate).toBe(true);
    });

    it('should resolve effective plan based on member count', async () => {
      // Standard for 7 or fewer members
      const plan7 = await entitlementAdapter.resolveEffectivePlan('h-test', 7);
      expect(plan7).toBe('standard');

      // Pro for 8+ members
      const plan8 = await entitlementAdapter.resolveEffectivePlan('h-test', 8);
      expect(plan8).toBe('pro');
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
      expect(authAdapter.getCurrentUser()).toBeNull();
    });

    it('should sign in locally with email', async () => {
      const result = await authAdapter.signInWithEmail('test@example.com', 'password');
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
      expect(result?.provider).toBe('email');
      expect(authAdapter.getCurrentUserId()).not.toBeNull();
      expect(authAdapter.getCurrentUser()?.email).toBe('test@example.com');
    });

    it('should not allow Google sign-in (honest adapter)', async () => {
      const result = await authAdapter.signInWithGoogle();
      expect(result).toBeNull();
    });

    it('should not allow Facebook sign-in (honest adapter)', async () => {
      const result = await authAdapter.signInWithFacebook();
      expect(result).toBeNull();
    });

    it('should sign out', async () => {
      await authAdapter.signInWithEmail('test@example.com', 'password');
      expect(authAdapter.getCurrentUser()).not.toBeNull();

      await authAdapter.signOut();
      expect(authAdapter.getCurrentUser()).toBeNull();
    });
  });
});
