/**
 * ChoreScore V2 — Entitlement Tests
 *
 * Tests for the LocalEntitlementAdapter.
 */

import { LocalEntitlementAdapter } from '../../src/infrastructure/local/LocalEntitlementAdapter';

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

    it('should allow creating households', async () => {
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
    it('should report active trial in premium mode', async () => {
      const status = await adapter.getTrialStatus('h-test');
      expect(status.isActive).toBe(true);
      expect(status.daysRemaining).toBe(30);
    });

    it('should report inactive trial in free mode', async () => {
      adapter.setMode('demo-free');
      const status = await adapter.getTrialStatus('h-test');
      expect(status.isActive).toBe(false);
      expect(status.daysRemaining).toBe(0);
    });
  });
});
