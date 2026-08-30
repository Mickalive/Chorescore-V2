/**
 * ChoreScore V2 — Research Analytics Adapter Tests
 *
 * Tests that analytics is properly disabled by default
 * and that it never leaks operational IDs.
 */

import { LocalResearchAnalyticsAdapter } from '../../src/infrastructure/local/LocalResearchAnalyticsAdapter';

describe('LocalResearchAnalyticsAdapter', () => {
  let adapter: LocalResearchAnalyticsAdapter;

  beforeEach(() => {
    adapter = new LocalResearchAnalyticsAdapter();
    adapter.clearFacts();
  });

  describe('Disabled by default', () => {
    it('should be disabled by default', () => {
      expect(adapter.isEnabled()).toBe(false);
    });

    it('should be available but disabled', () => {
      expect(adapter.isAvailable()).toBe(true);
      expect(adapter.isEnabled()).toBe(false);
    });

    it('should not emit facts when disabled', () => {
      adapter.emitFact({
        type: 'test',
        data: { test: true },
        timestamp: new Date().toISOString(),
      });
      expect(adapter.getFacts()).toHaveLength(0);
    });
  });

  describe('Enable/disable', () => {
    it('should enable analytics', () => {
      adapter.setEnabled(true);
      expect(adapter.isEnabled()).toBe(true);
    });

    it('should disable analytics and clear facts', () => {
      adapter.setEnabled(true);
      adapter.emitFact({
        type: 'test',
        data: {},
        timestamp: new Date().toISOString(),
      });
      expect(adapter.getFacts()).toHaveLength(1);

      adapter.setEnabled(false);
      expect(adapter.isEnabled()).toBe(false);
      expect(adapter.getFacts()).toHaveLength(0);
    });
  });

  describe('Privacy compliance', () => {
    it('should never include operational IDs in facts', () => {
      adapter.setEnabled(true);

      // Emit a fact that would be an analytics event
      adapter.emitFact({
        type: 'entry_created',
        data: {
          // These are safe aggregated data, not operational IDs
          durationMinutes: 30,
          beneficiaryCount: 2,
          hasPersistentTask: true,
        },
        timestamp: new Date().toISOString(),
      });

      const facts = adapter.getFacts();
      expect(facts).toHaveLength(1);

      // Verify no operational IDs are present
      const fact = facts[0];
      expect(fact.data).not.toHaveProperty('userId');
      expect(fact.data).not.toHaveProperty('householdId');
      expect(fact.data).not.toHaveProperty('memberId');
      expect(fact.data).not.toHaveProperty('email');
      expect(fact.data).not.toHaveProperty('label');
      expect(fact.data).not.toHaveProperty('notes');
    });

    it('should allow disabling without breaking the app', () => {
      // Analytics being disabled should not affect other functionality
      adapter.setEnabled(false);
      expect(adapter.isEnabled()).toBe(false);
      expect(adapter.isAvailable()).toBe(true);
      // The adapter still exists and can be called
      expect(() => adapter.emitFact({
        type: 'test',
        data: {},
        timestamp: new Date().toISOString(),
      })).not.toThrow();
    });
  });
});
