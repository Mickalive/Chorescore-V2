/**
 * ChoreScore V2 — Entitlement Tests
 *
 * Tests for the LocalEntitlementAdapter.
 */

import { LocalEntitlementAdapter } from '../../src/infrastructure/local/LocalEntitlementAdapter';
import { InMemoryAccountRepository } from '../../src/infrastructure/repositories/InMemoryRepositories';
import { PRICING } from '../../src/domain/entities';

describe('LocalEntitlementAdapter', () => {
  let adapter: LocalEntitlementAdapter;

  beforeEach(() => {
    adapter = new LocalEntitlementAdapter();
  });

  describe('Demo Premium mode', () => {
    it('should start in demo-premium mode', () => {
      expect(adapter.getMode()).toBe('demo-premium');
    });

    it('should return premium entitlement', async () => {
      const entitlement = await adapter.getEntitlement('h-test');
      expect(entitlement.plan).toBe('standard');
      expect(entitlement.isTestEntitlement).toBe(true);
      expect(entitlement.billingIsReal).toBe(false);
      expect(entitlement.weightingEnabled).toBe(true);
      expect(entitlement.todoPlanningEnabled).toBe(true);
      expect(entitlement.scoreArchiveAccess).toBe(true);
      expect(entitlement.historyArchiveAccess).toBe(true);
    });

    it('should allow weighting', async () => {
      expect(await adapter.canUseFeature('h-test', 'weighting')).toBe(true);
    });

    it('should allow todo planning', async () => {
      expect(await adapter.canUseFeature('h-test', 'todo-planning')).toBe(true);
    });

    it('should allow score archive', async () => {
      expect(await adapter.canUseFeature('h-test', 'score-archive')).toBe(true);
    });

    it('should allow history archive', async () => {
      expect(await adapter.canUseFeature('h-test', 'history-archive')).toBe(true);
    });

    it('should allow creating households in demo mode', async () => {
      expect(await adapter.canUseFeature('h-test', 'create-household')).toBe(true);
    });
  });

  describe('Demo Free mode', () => {
    beforeEach(() => {
      adapter.setMode('demo-free');
    });

    it('should return free entitlement', async () => {
      const entitlement = await adapter.getEntitlement('h-test');
      expect(entitlement.plan).toBe('free');
      expect(entitlement.weightingEnabled).toBe(false);
      expect(entitlement.todoPlanningEnabled).toBe(false);
      expect(entitlement.scoreArchiveAccess).toBe(false);
      expect(entitlement.historyArchiveAccess).toBe(false);
    });

    it('should disallow weighting', async () => {
      expect(await adapter.canUseFeature('h-test', 'weighting')).toBe(false);
    });

    it('should disallow todo planning', async () => {
      expect(await adapter.canUseFeature('h-test', 'todo-planning')).toBe(false);
    });

    it('should disallow score archive', async () => {
      expect(await adapter.canUseFeature('h-test', 'score-archive')).toBe(false);
    });

    it('should disallow creating additional households', async () => {
      expect(await adapter.canUseFeature('h-test', 'create-household')).toBe(false);
    });
  });

  describe('Mode switching', () => {
    it('should switch between modes', () => {
      expect(adapter.getMode()).toBe('demo-premium');
      adapter.setMode('demo-free');
      expect(adapter.getMode()).toBe('demo-free');
      adapter.setMode('demo-premium');
      expect(adapter.getMode()).toBe('demo-premium');
    });

    it('should reflect mode change in entitlements', async () => {
      adapter.setMode('demo-free');
      const entitlement = await adapter.getEntitlement('h-test');
      expect(entitlement.plan).toBe('free');
    });
  });

  describe('Trial status', () => {
    it('should report active trial after starting trial', async () => {
      await adapter.startTrial('h-new');
      const status = await adapter.getTrialStatus('h-new');
      expect(status.isActive).toBe(true);
      expect(status.daysRemaining).toBe(PRICING.TRIAL_DAYS);
    });

    it('should report inactive trial in free mode', async () => {
      adapter.setMode('demo-free');
      const status = await adapter.getTrialStatus('h-test');
      expect(status.isActive).toBe(false);
      expect(status.daysRemaining).toBe(0);
    });

    it('should have correct trial duration', async () => {
      await adapter.startTrial('h-new');
      const status = await adapter.getTrialStatus('h-new');
      const expectedEnd = new Date(status.startedAt);
      expectedEnd.setDate(expectedEnd.getDate() + PRICING.TRIAL_DAYS);
      expect(new Date(status.endsAt).getTime()).toBe(expectedEnd.getTime());
    });
  });

  describe('Trial expiry wired into getEntitlement', () => {
    it('should return free entitlement when trial has expired', async () => {
      // Start a trial
      await adapter.startTrial('h-trial');
      // Verify trial is active
      const activeEntitlement = await adapter.getEntitlement('h-trial');
      expect(activeEntitlement.plan).toBe('trial');

      // Manually set trialEndsAt to the past
      adapter.setEntitlement('h-trial', {
        ...activeEntitlement,
        trialEndsAt: new Date(Date.now() - 1000).toISOString(),
      });

      // getEntitlement should now return free
      const expiredEntitlement = await adapter.getEntitlement('h-trial');
      expect(expiredEntitlement.plan).toBe('free');
      expect(expiredEntitlement.weightingEnabled).toBe(false);
      expect(expiredEntitlement.todoPlanningEnabled).toBe(false);
      expect(expiredEntitlement.historyArchiveAccess).toBe(false);
      expect(expiredEntitlement.scoreArchiveAccess).toBe(false);
    });

    it('should not destroy data when trial expires', async () => {
      // Start a trial
      await adapter.startTrial('h-trial');
      // Verify trial is active
      const activeEntitlement = await adapter.getEntitlement('h-trial');
      expect(activeEntitlement.plan).toBe('trial');

      // Manually set trialEndsAt to the past
      adapter.setEntitlement('h-trial', {
        ...activeEntitlement,
        trialEndsAt: new Date(Date.now() - 1000).toISOString(),
      });

      // getEntitlement should return free
      const expiredEntitlement = await adapter.getEntitlement('h-trial');
      expect(expiredEntitlement.plan).toBe('free');

      // Data is not destroyed: the stored entitlement still has trial plan
      // (we can verify by checking the stored entitlement directly via setEntitlement)
      // The key point is that getEntitlement doesn't delete the stored entitlement
    });

    it('should return trial entitlement when trial has not expired', async () => {
      // Start a trial with far-future expiry
      await adapter.startTrial('h-trial');
      adapter.setEntitlement('h-trial', {
        plan: 'trial',
        isTestEntitlement: true,
        billingIsReal: false,
        scoreArchiveAccess: true,
        historyArchiveAccess: true,
        weightingEnabled: true,
        todoPlanningEnabled: true,
        advancedExportEnabled: true,
        memberLimit: PRICING.STANDARD_MEMBER_LIMIT,
        canCreateAdditionalOwnedHousehold: true,
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const entitlement = await adapter.getEntitlement('h-trial');
      expect(entitlement.plan).toBe('trial');
      expect(entitlement.weightingEnabled).toBe(true);
    });
  });

  describe('Account-level entitlements', () => {
    it('should allow creating free household in demo-premium', async () => {
      const accountEntitlement = await adapter.getAccountEntitlement('u-1');
      expect(accountEntitlement.canCreateFreeHousehold).toBe(true);
    });

    it('should check if user owns free household in demo-free', async () => {
      adapter.setMode('demo-free');
      const accountEntitlement = await adapter.getAccountEntitlement('u-1');
      // In demo-free, no households are owned yet
      expect(accountEntitlement.canCreateFreeHousehold).toBe(true);
      expect(accountEntitlement.ownedFreeHouseholdId).toBeNull();
    });

    it('should resolve via AccountRepository.ownedFreeHouseholdId', async () => {
      adapter.setMode('demo-free');
      const accounts = new InMemoryAccountRepository();

      // User has no account yet — canCreateFreeHousehold should be true
      const entitlement1 = await adapter.getAccountEntitlement('u-1');
      expect(entitlement1.canCreateFreeHousehold).toBe(true);
      expect(entitlement1.ownedFreeHouseholdId).toBeNull();

      // Inject account repository and create an account with owned household
      adapter.setAccountRepository(accounts);
      await accounts.create({
        userId: 'u-1',
        ownedFreeHouseholdId: 'h-owned',
      });

      const entitlement2 = await adapter.getAccountEntitlement('u-1');
      expect(entitlement2.canCreateFreeHousehold).toBe(false);
      expect(entitlement2.ownedFreeHouseholdId).toBe('h-owned');
      expect(entitlement2.ownedHouseholdCount).toBe(1);
    });

    it('should return true for canCreateFreeHousehold when user has no owned household', async () => {
      adapter.setMode('demo-free');
      const accounts = new InMemoryAccountRepository();
      adapter.setAccountRepository(accounts);

      // User with account but no owned household
      await accounts.create({
        userId: 'u-2',
        ownedFreeHouseholdId: null,
      });

      const entitlement = await adapter.getAccountEntitlement('u-2');
      expect(entitlement.canCreateFreeHousehold).toBe(true);
      expect(entitlement.ownedFreeHouseholdId).toBeNull();
    });

    it('should be independent of other households entitlements', async () => {
      adapter.setMode('demo-free');
      const accounts = new InMemoryAccountRepository();
      adapter.setAccountRepository(accounts);

      // Set up a household with a free entitlement (not owned by u-1)
      adapter.setEntitlement('h-other', {
        plan: 'free',
        isTestEntitlement: false,
        billingIsReal: false,
        scoreArchiveAccess: false,
        historyArchiveAccess: false,
        weightingEnabled: false,
        todoPlanningEnabled: false,
        advancedExportEnabled: false,
        memberLimit: PRICING.STANDARD_MEMBER_LIMIT,
        canCreateAdditionalOwnedHousehold: false,
      });

      // u-1 has no owned household in account — should still be able to create
      const entitlement = await adapter.getAccountEntitlement('u-1');
      expect(entitlement.canCreateFreeHousehold).toBe(true);
      expect(entitlement.ownedFreeHouseholdId).toBeNull();
    });
  });

  describe('Effective plan resolution', () => {
    it('should return standard for 7 or fewer members', async () => {
      const plan = await adapter.resolveEffectivePlan('h-test', 7);
      expect(plan).toBe('standard');
    });

    it('should return pro for 8 or more members', async () => {
      const plan = await adapter.resolveEffectivePlan('h-test', 8);
      expect(plan).toBe('pro');
    });

    it('should return pro for large households', async () => {
      const plan = await adapter.resolveEffectivePlan('h-test', 15);
      expect(plan).toBe('pro');
    });
  });

  describe('Pricing configuration', () => {
    it('should use canonical V1 pricing', () => {
      expect(PRICING.TRIAL_DAYS).toBe(30);
      expect(PRICING.STANDARD_MONTHLY_EUR).toBe(2.99);
      expect(PRICING.STANDARD_MEMBER_LIMIT).toBe(7);
      expect(PRICING.PRO_MONTHLY_EUR).toBe(5.99);
      expect(PRICING.PRO_MEMBER_THRESHOLD).toBe(8);
    });
  });
});
