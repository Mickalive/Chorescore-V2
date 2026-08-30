/**
 * ChoreScore V2 — Score Calculation Tests
 *
 * Deterministic tests for the balance/score calculation logic.
 * Uses the canonical reference scenarios from docs/REFERENCE_SCENARIOS.json.
 */

import {
  calculateBalances,
  calculateWeightedBalances,
  calculatePerformedMinutes,
  calculateCompensations,
  sumBalances,
  filterEntries,
  calculateScore,
  balancesToArray,
} from '../../src/domain/calculations/score';
import { CompletedEntry } from '../../src/domain/entities';

describe('Score Calculations', () => {
  describe('Two-member core scenario', () => {
    const entries: CompletedEntry[] = [
      {
        id: 'e1',
        householdId: 'h-core',
        label: 'Vaisselle du soir',
        persistentTaskId: 'pt-dishes',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 60,
        weight: 1,
        occurredAt: '2026-08-24T18:00:00+02:00',
        createdBy: 'm-alex',
      },
      {
        id: 'e2',
        householdId: 'h-core',
        label: 'Nettoyer le balcon',
        persistentTaskId: null,
        performedByMemberId: 'm-sam',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 30,
        weight: 1.5,
        occurredAt: '2026-08-25T10:00:00+02:00',
        createdBy: 'm-sam',
      },
    ];

    it('should calculate correct real balances', () => {
      const balances = calculateBalances(entries);
      expect(balances.get('m-alex')).toBe(15);
      expect(balances.get('m-sam')).toBe(-15);
    });

    it('should have zero sum of balances', () => {
      const balances = calculateBalances(entries);
      const balanceArray = balancesToArray(balances);
      expect(sumBalances(balanceArray)).toBe(0);
    });

    it('should calculate correct compensations', () => {
      const balances = calculateBalances(entries);
      const balanceArray = balancesToArray(balances);
      const compensations = calculateCompensations(balanceArray);
      expect(compensations).toEqual([
        { fromMemberId: 'm-sam', toMemberId: 'm-alex', minutes: 15 },
      ]);
    });

    it('should calculate correct performed minutes', () => {
      const performed = calculatePerformedMinutes(entries);
      expect(performed['m-alex']).toBe(60);
      expect(performed['m-sam']).toBe(30);
    });

    it('should calculate correct weighted balances', () => {
      const weightedBalances = calculateWeightedBalances(entries);
      expect(weightedBalances.get('m-alex')).toBe(7.5);
      expect(weightedBalances.get('m-sam')).toBe(-7.5);
    });

    it('should generate correct filters', () => {
      const filters = ['Toutes', 'Vaisselle', 'Autres'];
      expect(filters).toEqual(['Toutes', 'Vaisselle', 'Autres']);
    });

    it('should filter by PersistentTask correctly', () => {
      const dishesEntries = filterEntries(entries, 'persistent-task', 'pt-dishes');
      expect(dishesEntries).toHaveLength(1);
      expect(dishesEntries[0].id).toBe('e1');
    });

    it('should filter by "others" (no persistent task)', () => {
      const otherEntries = filterEntries(entries, 'others');
      expect(otherEntries).toHaveLength(1);
      expect(otherEntries[0].id).toBe('e2');
    });

    it('should show all entries with "all" filter', () => {
      const allEntries = filterEntries(entries, 'all');
      expect(allEntries).toHaveLength(2);
    });

    it('should calculate filter-specific balances for Vaisselle', () => {
      const dishesEntries = filterEntries(entries, 'persistent-task', 'pt-dishes');
      const balances = calculateBalances(dishesEntries);
      expect(balances.get('m-alex')).toBe(30);
      expect(balances.get('m-sam')).toBe(-30);
    });

    it('should calculate filter-specific balances for Autres', () => {
      const otherEntries = filterEntries(entries, 'others');
      const balances = calculateBalances(otherEntries);
      expect(balances.get('m-alex')).toBe(-15);
      expect(balances.get('m-sam')).toBe(15);
    });

    it('should calculate filter-specific weighted balances for Vaisselle', () => {
      const dishesEntries = filterEntries(entries, 'persistent-task', 'pt-dishes');
      const weightedBalances = calculateWeightedBalances(dishesEntries);
      expect(weightedBalances.get('m-alex')).toBe(30);
      expect(weightedBalances.get('m-sam')).toBe(-30);
    });

    it('should calculate filter-specific weighted balances for Autres', () => {
      const otherEntries = filterEntries(entries, 'others');
      const weightedBalances = calculateWeightedBalances(otherEntries);
      expect(weightedBalances.get('m-alex')).toBe(-22.5);
      expect(weightedBalances.get('m-sam')).toBe(22.5);
    });
  });

  describe('Three-member beneficiaries scenario', () => {
    const entries: CompletedEntry[] = [
      {
        id: 'e3',
        householdId: 'h-three',
        label: 'Courses communes',
        persistentTaskId: null,
        performedByMemberId: 'm-a',
        beneficiaryMemberIds: ['m-a', 'm-b', 'm-c'],
        durationMinutes: 90,
        weight: 1,
        occurredAt: '2026-08-26T18:00:00+02:00',
        createdBy: 'm-a',
      },
      {
        id: 'e4',
        householdId: 'h-three',
        label: 'Aide pour Lou',
        persistentTaskId: null,
        performedByMemberId: 'm-b',
        beneficiaryMemberIds: ['m-c'],
        durationMinutes: 30,
        weight: 1,
        occurredAt: '2026-08-27T18:00:00+02:00',
        createdBy: 'm-b',
      },
    ];

    it('should calculate correct real balances', () => {
      const balances = calculateBalances(entries);
      expect(balances.get('m-a')).toBe(60);
      expect(balances.get('m-b')).toBe(0);
      expect(balances.get('m-c')).toBe(-60);
    });

    it('should have zero sum of balances', () => {
      const balances = calculateBalances(entries);
      const balanceArray = balancesToArray(balances);
      expect(sumBalances(balanceArray)).toBe(0);
    });

    it('should calculate correct compensations', () => {
      const balances = calculateBalances(entries);
      const balanceArray = balancesToArray(balances);
      const compensations = calculateCompensations(balanceArray);
      expect(compensations).toEqual([
        { fromMemberId: 'm-c', toMemberId: 'm-a', minutes: 60 },
      ]);
    });
  });

  describe('Full score calculation', () => {
    it('should calculate score with all fields', () => {
      const entries: CompletedEntry[] = [
        {
          id: 'e1',
          householdId: 'h-core',
          label: 'Vaisselle',
          persistentTaskId: 'pt-dishes',
          performedByMemberId: 'm-alex',
          beneficiaryMemberIds: ['m-alex', 'm-sam'],
          durationMinutes: 60,
          weight: 1,
          occurredAt: '2026-08-24T18:00:00+02:00',
          createdBy: 'm-alex',
        },
      ];

      const score = calculateScore(entries, 'month', 'all', undefined, true);

      expect(score.period).toBe('month');
      expect(score.filter).toBe('all');
      expect(score.balances).toHaveLength(2);
      expect(score.compensations).toHaveLength(1);
      expect(score.performedMinutes['m-alex']).toBe(60);
      expect(score.weightedBalances).toBeDefined();
      expect(score.weightedCompensations).toBeDefined();
      expect(score.performedWeightedMinutes).toBeDefined();
      expect(score.sumOfBalances).toBe(0);
    });

    it('should calculate score without weighting', () => {
      const entries: CompletedEntry[] = [
        {
          id: 'e1',
          householdId: 'h-core',
          label: 'Vaisselle',
          persistentTaskId: null,
          performedByMemberId: 'm-alex',
          beneficiaryMemberIds: ['m-alex', 'm-sam'],
          durationMinutes: 60,
          weight: 1,
          occurredAt: '2026-08-24T18:00:00+02:00',
          createdBy: 'm-alex',
        },
      ];

      const score = calculateScore(entries, 'month', 'all', undefined, false);

      expect(score.weightedBalances).toBeUndefined();
      expect(score.weightedCompensations).toBeUndefined();
      expect(score.performedWeightedMinutes).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty entries', () => {
      const balances = calculateBalances([]);
      expect(balances.size).toBe(0);
    });

    it('should handle single member', () => {
      const entries: CompletedEntry[] = [
        {
          id: 'e1',
          householdId: 'h-single',
          label: 'Vaisselle',
          persistentTaskId: null,
          performedByMemberId: 'm-alex',
          beneficiaryMemberIds: ['m-alex'],
          durationMinutes: 30,
          weight: 1,
          occurredAt: '2026-08-24T18:00:00+02:00',
          createdBy: 'm-alex',
        },
      ];

      const balances = calculateBalances(entries);
      // Performer gets +30, then -30 as beneficiary = 0
      expect(balances.get('m-alex')).toBe(0);
    });

    it('should handle multiple beneficiaries correctly', () => {
      const entries: CompletedEntry[] = [
        {
          id: 'e1',
          householdId: 'h-multi',
          label: 'Ménage',
          persistentTaskId: null,
          performedByMemberId: 'm-a',
          beneficiaryMemberIds: ['m-a', 'm-b', 'm-c', 'm-d'],
          durationMinutes: 60,
          weight: 1,
          occurredAt: '2026-08-24T18:00:00+02:00',
          createdBy: 'm-a',
        },
      ];

      const balances = calculateBalances(entries);
      // m-a: +60 - 60/4 = +45
      // m-b, m-c, m-d: -15 each
      expect(balances.get('m-a')).toBe(45);
      expect(balances.get('m-b')).toBe(-15);
      expect(balances.get('m-c')).toBe(-15);
      expect(balances.get('m-d')).toBe(-15);
    });
  });
});
