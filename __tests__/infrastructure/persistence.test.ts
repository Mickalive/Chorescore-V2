/**
 * ChoreScore V2 — Persistence Tests (V2-02 Repair)
 *
 * Non-tautological tests proving data survives instance recreation.
 * These tests use AsyncStorage-backed persistent repositories and verify
 * that writing to one instance, then creating a fresh instance and reading
 * back, returns the persisted data — proving disk persistence.
 *
 * The AsyncStorage mock (jest.setup.js) stores data in memory, so two
 * independent instances share the same underlying storage, exactly like
 * two app launches sharing the same disk.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PersistentEntryRepository,
  PersistentPersistentTaskRepository,
  PersistentChronoTimerRepository,
} from '../../src/infrastructure/repositories/PersistentRepositories';
import {
  CompletedEntry,
  PersistentTask,
  ChronoTimerState,
} from '../../src/domain/entities';

// Clear AsyncStorage between tests to prevent cross-test contamination
beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Persistent Repositories — Non-tautological persistence', () => {
  describe('PersistentEntryRepository', () => {
    it('should persist entries across instance recreation', async () => {
      // Write via first instance
      const repo1 = new PersistentEntryRepository();
      const entry = await repo1.create({
        householdId: 'h-persist',
        label: 'Vaisselle du soir',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 30,
        weight: 1,
        persistentTaskId: null,
        occurredAt: '2026-08-30T14:00:00Z',
        createdBy: 'm-alex',
      });

      expect(entry.id).toBeDefined();
      expect(entry.label).toBe('Vaisselle du soir');

      // Create a completely new instance (simulates app restart)
      const repo2 = new PersistentEntryRepository();

      // Read back from the fresh instance
      const entries = await repo2.getByHousehold('h-persist');
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(entry.id);
      expect(entries[0].label).toBe('Vaisselle du soir');
      expect(entries[0].performedByMemberId).toBe('m-alex');
      expect(entries[0].beneficiaryMemberIds).toEqual(['m-alex', 'm-sam']);
      expect(entries[0].durationMinutes).toBe(30);
      expect(entries[0].householdId).toBe('h-persist');
      expect(entries[0].occurredAt).toBe('2026-08-30T14:00:00Z');
    });

    it('should persist multiple entries and maintain sort order', async () => {
      const repo1 = new PersistentEntryRepository();

      await repo1.create({
        householdId: 'h-sort',
        label: 'First',
        performedByMemberId: 'm-1',
        beneficiaryMemberIds: ['m-2'],
        durationMinutes: 10,
        weight: 1,
        persistentTaskId: null,
        occurredAt: '2026-08-01T10:00:00Z',
        createdBy: 'm-1',
      });

      await repo1.create({
        householdId: 'h-sort',
        label: 'Second',
        performedByMemberId: 'm-2',
        beneficiaryMemberIds: ['m-1'],
        durationMinutes: 20,
        weight: 1,
        persistentTaskId: null,
        occurredAt: '2026-08-15T10:00:00Z',
        createdBy: 'm-2',
      });

      // New instance
      const repo2 = new PersistentEntryRepository();
      const entries = await repo2.getByHousehold('h-sort');
      expect(entries).toHaveLength(2);
      // Most recent first
      expect(entries[0].label).toBe('Second');
      expect(entries[1].label).toBe('First');
    });

    it('should persist entry updates across instance recreation', async () => {
      const repo1 = new PersistentEntryRepository();
      const entry = await repo1.create({
        householdId: 'h-update',
        label: 'Original',
        performedByMemberId: 'm-1',
        beneficiaryMemberIds: ['m-2'],
        durationMinutes: 15,
        weight: 1,
        persistentTaskId: null,
        occurredAt: '2026-08-30T10:00:00Z',
        createdBy: 'm-1',
      });

      // Update via first instance
      await repo1.update(entry.id, { label: 'Updated', durationMinutes: 45 });

      // Read via fresh instance
      const repo2 = new PersistentEntryRepository();
      const updated = await repo2.getById(entry.id);
      expect(updated).not.toBeNull();
      expect(updated!.label).toBe('Updated');
      expect(updated!.durationMinutes).toBe(45);
    });

    it('should persist entry deletion across instance recreation', async () => {
      const repo1 = new PersistentEntryRepository();
      const entry = await repo1.create({
        householdId: 'h-delete',
        label: 'To delete',
        performedByMemberId: 'm-1',
        beneficiaryMemberIds: ['m-2'],
        durationMinutes: 10,
        weight: 1,
        persistentTaskId: null,
        occurredAt: '2026-08-30T10:00:00Z',
        createdBy: 'm-1',
      });

      // Delete via first instance
      await repo1.delete(entry.id);

      // Verify via fresh instance
      const repo2 = new PersistentEntryRepository();
      const result = await repo2.getById(entry.id);
      expect(result).toBeNull();

      const entries = await repo2.getByHousehold('h-delete');
      expect(entries).toHaveLength(0);
    });
  });

  describe('PersistentPersistentTaskRepository', () => {
    it('should persist persistent tasks across instance recreation', async () => {
      // Write via first instance
      const repo1 = new PersistentPersistentTaskRepository();
      const task = await repo1.create({
        householdId: 'h-pt',
        name: 'Vaisselle',
        defaultWeight: 1,
      });

      expect(task.id).toBeDefined();
      expect(task.name).toBe('Vaisselle');

      // Create a completely new instance (simulates app restart)
      const repo2 = new PersistentPersistentTaskRepository();

      // Read back from the fresh instance
      const tasks = await repo2.getByHousehold('h-pt');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(task.id);
      expect(tasks[0].name).toBe('Vaisselle');
      expect(tasks[0].householdId).toBe('h-pt');
      expect(tasks[0].defaultWeight).toBe(1);
    });

    it('should persist multiple persistent tasks across instance recreation', async () => {
      const repo1 = new PersistentPersistentTaskRepository();
      await repo1.create({ householdId: 'h-multi', name: 'Vaisselle', defaultWeight: 1 });
      await repo1.create({ householdId: 'h-multi', name: 'Cuisine', defaultWeight: 1 });
      await repo1.create({ householdId: 'h-multi', name: 'Jardin', defaultWeight: 1 });

      const repo2 = new PersistentPersistentTaskRepository();
      const tasks = await repo2.getByHousehold('h-multi');
      expect(tasks).toHaveLength(3);
      expect(tasks.map((t) => t.name).sort()).toEqual(['Cuisine', 'Jardin', 'Vaisselle']);
    });

    it('should persist persistent task deletion across instance recreation', async () => {
      const repo1 = new PersistentPersistentTaskRepository();
      const task = await repo1.create({
        householdId: 'h-del-pt',
        name: 'To delete',
        defaultWeight: 1,
      });

      await repo1.delete(task.id);

      const repo2 = new PersistentPersistentTaskRepository();
      const tasks = await repo2.getByHousehold('h-del-pt');
      expect(tasks).toHaveLength(0);
    });
  });

  describe('PersistentChronoTimerRepository', () => {
    it('should persist chrono timer state across instance recreation', async () => {
      // Write via first instance
      const repo1 = new PersistentChronoTimerRepository();
      const chronoState: ChronoTimerState = {
        householdId: 'h-chrono',
        memberId: 'm-alex',
        startedAt: '2026-08-30T14:30:00Z',
        isRunning: true,
      };

      await repo1.setState('h-chrono', chronoState);

      // Create a completely new instance (simulates app restart)
      const repo2 = new PersistentChronoTimerRepository();

      // Read back from the fresh instance
      const restored = await repo2.getState('h-chrono');
      expect(restored).not.toBeNull();
      expect(restored!.isRunning).toBe(true);
      expect(restored!.memberId).toBe('m-alex');
      expect(restored!.startedAt).toBe('2026-08-30T14:30:00Z');
      expect(restored!.householdId).toBe('h-chrono');
    });

    it('should persist chrono timer clearing across instance recreation', async () => {
      const repo1 = new PersistentChronoTimerRepository();
      await repo1.setState('h-clear', {
        householdId: 'h-clear',
        memberId: 'm-1',
        startedAt: '2026-08-30T14:00:00Z',
        isRunning: true,
      });

      // Clear via first instance
      await repo1.clearState('h-clear');

      // Verify via fresh instance
      const repo2 = new PersistentChronoTimerRepository();
      const state = await repo2.getState('h-clear');
      expect(state).toBeNull();
    });

    it('should isolate chrono states per household across instance recreation', async () => {
      const repo1 = new PersistentChronoTimerRepository();
      await repo1.setState('h-house-A', {
        householdId: 'h-house-A',
        memberId: 'm-1',
        startedAt: '2026-08-30T14:00:00Z',
        isRunning: true,
      });
      await repo1.setState('h-house-B', {
        householdId: 'h-house-B',
        memberId: 'm-2',
        startedAt: '2026-08-30T15:00:00Z',
        isRunning: true,
      });

      const repo2 = new PersistentChronoTimerRepository();
      const stateA = await repo2.getState('h-house-A');
      const stateB = await repo2.getState('h-house-B');
      expect(stateA!.memberId).toBe('m-1');
      expect(stateB!.memberId).toBe('m-2');
    });

    it('should persist null state across instance recreation', async () => {
      const repo1 = new PersistentChronoTimerRepository();
      // Setting null should remove the entry
      await repo1.setState('h-null', null);

      const repo2 = new PersistentChronoTimerRepository();
      const state = await repo2.getState('h-null');
      expect(state).toBeNull();
    });
  });

  describe('Cross-repository persistence', () => {
    it('should persist entries, tasks, and chrono state simultaneously across instance recreation', async () => {
      // Write to all three repositories via first set of instances
      const entryRepo1 = new PersistentEntryRepository();
      const taskRepo1 = new PersistentPersistentTaskRepository();
      const chronoRepo1 = new PersistentChronoTimerRepository();

      const entry = await entryRepo1.create({
        householdId: 'h-cross',
        label: 'Vaisselle',
        performedByMemberId: 'm-alex',
        beneficiaryMemberIds: ['m-alex', 'm-sam'],
        durationMinutes: 30,
        weight: 1,
        persistentTaskId: null,
        occurredAt: '2026-08-30T14:00:00Z',
        createdBy: 'm-alex',
      });

      const task = await taskRepo1.create({
        householdId: 'h-cross',
        name: 'Vaisselle',
        defaultWeight: 1,
      });

      await chronoRepo1.setState('h-cross', {
        householdId: 'h-cross',
        memberId: 'm-alex',
        startedAt: '2026-08-30T14:30:00Z',
        isRunning: true,
      });

      // Create entirely fresh instances (simulates full app restart)
      const entryRepo2 = new PersistentEntryRepository();
      const taskRepo2 = new PersistentPersistentTaskRepository();
      const chronoRepo2 = new PersistentChronoTimerRepository();

      // Verify all data persists
      const entries = await entryRepo2.getByHousehold('h-cross');
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(entry.id);

      const tasks = await taskRepo2.getByHousehold('h-cross');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(task.id);

      const chronoState = await chronoRepo2.getState('h-cross');
      expect(chronoState).not.toBeNull();
      expect(chronoState!.isRunning).toBe(true);
      expect(chronoState!.memberId).toBe('m-alex');
    });
  });
});
