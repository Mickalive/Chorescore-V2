/**
 * ChoreScore V2 — Domain Entity Tests
 *
 * Tests for domain entity creation and basic behavior.
 */

import {
  Household,
  Member,
  CompletedEntry,
  PersistentTask,
  TodoItem,
  Entitlement,
  PlanType,
  User,
  Membership,
  Account,
  AccountEntitlement,
  PRICING,
} from '../../src/domain/entities';

describe('Domain Entities', () => {
  describe('User', () => {
    it('should have required fields', () => {
      const user: User = {
        id: 'u-1',
        email: 'alex@example.com',
        displayName: 'Alex',
        createdAt: '2026-08-30T00:00:00Z',
      };

      expect(user.id).toBe('u-1');
      expect(user.email).toBe('alex@example.com');
      expect(user.displayName).toBe('Alex');
    });
  });

  describe('Membership', () => {
    it('should have required fields', () => {
      const membership: Membership = {
        id: 'mem-1',
        userId: 'u-1',
        householdId: 'h-1',
        role: 'OWNER',
        joinedAt: '2026-08-30T00:00:00Z',
      };

      expect(membership.userId).toBe('u-1');
      expect(membership.householdId).toBe('h-1');
      expect(membership.role).toBe('OWNER');
    });

    it('should support MEMBER role', () => {
      const membership: Membership = {
        id: 'mem-2',
        userId: 'u-2',
        householdId: 'h-1',
        role: 'MEMBER',
        joinedAt: '2026-08-30T00:00:00Z',
      };

      expect(membership.role).toBe('MEMBER');
    });
  });

  describe('Account', () => {
    it('should have required fields', () => {
      const account: Account = {
        id: 'acc-1',
        userId: 'u-1',
        ownedFreeHouseholdId: null,
        createdAt: '2026-08-30T00:00:00Z',
      };

      expect(account.userId).toBe('u-1');
      expect(account.ownedFreeHouseholdId).toBeNull();
    });

    it('should track owned free household', () => {
      const account: Account = {
        id: 'acc-1',
        userId: 'u-1',
        ownedFreeHouseholdId: 'h-1',
        createdAt: '2026-08-30T00:00:00Z',
      };

      expect(account.ownedFreeHouseholdId).toBe('h-1');
    });
  });

  describe('AccountEntitlement', () => {
    it('should have required fields', () => {
      const entitlement: AccountEntitlement = {
        canCreateFreeHousehold: true,
        ownedFreeHouseholdId: null,
        hasActiveTrial: false,
      };

      expect(entitlement.canCreateFreeHousehold).toBe(true);
      expect(entitlement.ownedFreeHouseholdId).toBeNull();
    });
  });

  describe('Household', () => {
    it('should have required fields', () => {
      const household: Household = {
        id: 'h-1',
        name: 'Test Household',
        ownerId: 'u-1',
        createdAt: '2026-08-30T00:00:00Z',
      };

      expect(household.id).toBe('h-1');
      expect(household.name).toBe('Test Household');
      expect(household.ownerId).toBe('u-1');
    });
  });

  describe('Member', () => {
    it('should have required fields', () => {
      const member: Member = {
        id: 'm-1',
        householdId: 'h-1',
        name: 'Alex',
        userId: 'u-1',
        joinedAt: '2026-08-30T00:00:00Z',
      };

      expect(member.id).toBe('m-1');
      expect(member.name).toBe('Alex');
      expect(member.householdId).toBe('h-1');
    });
  });

  describe('CompletedEntry', () => {
    it('should have required fields', () => {
      const entry: CompletedEntry = {
        id: 'e-1',
        householdId: 'h-1',
        label: 'Vaisselle',
        performedByMemberId: 'm-1',
        beneficiaryMemberIds: ['m-1', 'm-2'],
        durationMinutes: 30,
        weight: 1,
        persistentTaskId: null,
        occurredAt: '2026-08-30T00:00:00Z',
        createdBy: 'm-1',
      };

      expect(entry.label).toBe('Vaisselle');
      expect(entry.durationMinutes).toBe(30);
      expect(entry.beneficiaryMemberIds).toHaveLength(2);
    });

    it('should support optional persistentTaskId', () => {
      const entry: CompletedEntry = {
        id: 'e-1',
        householdId: 'h-1',
        label: 'Vaisselle',
        performedByMemberId: 'm-1',
        beneficiaryMemberIds: ['m-1'],
        durationMinutes: 30,
        weight: 1,
        persistentTaskId: 'pt-1',
        occurredAt: '2026-08-30T00:00:00Z',
        createdBy: 'm-1',
      };

      expect(entry.persistentTaskId).toBe('pt-1');
    });
  });

  describe('PersistentTask', () => {
    it('should have required fields', () => {
      const task: PersistentTask = {
        id: 'pt-1',
        householdId: 'h-1',
        name: 'Vaisselle',
        defaultWeight: 1,
        createdAt: '2026-08-30T00:00:00Z',
      };

      expect(task.name).toBe('Vaisselle');
      expect(task.defaultWeight).toBe(1);
    });
  });

  describe('TodoItem', () => {
    it('should have required fields', () => {
      const todo: TodoItem = {
        id: 't-1',
        householdId: 'h-1',
        title: 'Sortir les poubelles',
        assigneeMemberId: 'm-1',
        beneficiaryMemberIds: ['m-1', 'm-2'],
        dueAt: null,
        reminderAt: null,
        notes: '',
        persistentTaskId: null,
        status: 'todo',
        createdAt: '2026-08-30T00:00:00Z',
      };

      expect(todo.title).toBe('Sortir les poubelles');
      expect(todo.status).toBe('todo');
    });

    it('should support completed status', () => {
      const todo: TodoItem = {
        id: 't-1',
        householdId: 'h-1',
        title: 'Sortir les poubelles',
        assigneeMemberId: 'm-1',
        beneficiaryMemberIds: ['m-1'],
        dueAt: null,
        reminderAt: null,
        notes: '',
        persistentTaskId: null,
        status: 'completed',
        createdAt: '2026-08-30T00:00:00Z',
        completedAt: '2026-08-30T12:00:00Z',
      };

      expect(todo.status).toBe('completed');
      expect(todo.completedAt).toBeDefined();
    });
  });

  describe('Entitlement', () => {
    it('should have all required fields', () => {
      const entitlement: Entitlement = {
        plan: 'free',
        householdId: 'h-1',
        isTestEntitlement: false,
        billingIsReal: false,
        scoreArchiveAccess: false,
        historyArchiveAccess: false,
        weightingEnabled: false,
        todoPlanningEnabled: false,
        advancedExportEnabled: false,
        memberLimit: 7,
        canCreateAdditionalOwnedHousehold: false,
      };

      expect(entitlement.plan).toBe('free');
      expect(entitlement.memberLimit).toBe(7);
    });

    it('should support all plan types', () => {
      const plans: PlanType[] = ['free', 'trial', 'standard', 'pro'];
      for (const plan of plans) {
        const entitlement: Entitlement = {
          plan,
          householdId: 'h-1',
          isTestEntitlement: false,
          billingIsReal: false,
          scoreArchiveAccess: plan !== 'free',
          historyArchiveAccess: plan !== 'free',
          weightingEnabled: plan !== 'free',
          todoPlanningEnabled: plan !== 'free',
          advancedExportEnabled: plan !== 'free',
          memberLimit: 7,
          canCreateAdditionalOwnedHousehold: plan !== 'free',
        };
        expect(entitlement.plan).toBe(plan);
      }
    });
  });

  describe('PRICING', () => {
    it('should have canonical V1 pricing values', () => {
      expect(PRICING.TRIAL_DAYS).toBe(30);
      expect(PRICING.STANDARD_MONTHLY_EUR).toBe(2.99);
      expect(PRICING.STANDARD_MEMBER_LIMIT).toBe(7);
      expect(PRICING.PRO_MONTHLY_EUR).toBe(5.99);
      expect(PRICING.PRO_MEMBER_THRESHOLD).toBe(8);
    });
  });
});
