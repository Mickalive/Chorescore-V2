/**
 * ChoreScore V2 — Persistent Repositories (AsyncStorage-backed)
 *
 * These replace InMemory repositories for entries, persistentTasks, and chronoTimer
 * to provide real local persistence. Data survives app restart / instance recreation.
 *
 * Uses @react-native-async-storage/async-storage for disk persistence.
 * In tests, this is mocked via jest.setup.js.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CompletedEntry,
  PersistentTask,
  ChronoTimerState,
} from '../../domain/entities';
import {
  EntryRepository,
  PersistentTaskRepository,
} from '../../application/use-cases/ChoreScoreApp';
import { ChronoTimerRepository } from '../../application/ports';

// ── Storage Keys ────────────────────────────────────────────────

const STORAGE_KEYS = {
  ENTRIES: '@chorescore/entries',
  PERSISTENT_TASKS: '@chorescore/persistent_tasks',
  CHRONO_TIMER: '@chorescore/chrono_timer',
} as const;

// ── Helper: JSON safe parse ─────────────────────────────────────

function safeParse<T>(json: string | null, fallback: T): T {
  if (json === null) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ── PersistentEntryRepository ───────────────────────────────────

export class PersistentEntryRepository implements EntryRepository {
  async getByHousehold(householdId: string): Promise<CompletedEntry[]> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
    const entries: CompletedEntry[] = safeParse(json, []);
    return entries
      .filter((e) => e.householdId === householdId)
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );
  }

  async getById(id: string): Promise<CompletedEntry | null> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
    const entries: CompletedEntry[] = safeParse(json, []);
    return entries.find((e) => e.id === id) ?? null;
  }

  async create(data: Omit<CompletedEntry, 'id'>): Promise<CompletedEntry> {
    const id = `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: CompletedEntry = { ...data, id };

    const json = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
    const entries: CompletedEntry[] = safeParse(json, []);
    entries.push(entry);
    await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));

    return entry;
  }

  async update(
    id: string,
    data: Partial<CompletedEntry>
  ): Promise<CompletedEntry> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
    const entries: CompletedEntry[] = safeParse(json, []);
    const index = entries.findIndex((e) => e.id === id);
    if (index === -1) throw new Error(`Entry ${id} not found`);

    const updated: CompletedEntry = { ...entries[index], ...data, id };
    entries[index] = updated;
    await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));

    return updated;
  }

  async delete(id: string): Promise<void> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
    const entries: CompletedEntry[] = safeParse(json, []);
    const filtered = entries.filter((e) => e.id !== id);
    await AsyncStorage.setItem(
      STORAGE_KEYS.ENTRIES,
      JSON.stringify(filtered)
    );
  }
}

// ── PersistentPersistentTaskRepository ──────────────────────────

export class PersistentPersistentTaskRepository
  implements PersistentTaskRepository
{
  async getByHousehold(householdId: string): Promise<PersistentTask[]> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.PERSISTENT_TASKS);
    const tasks: PersistentTask[] = safeParse(json, []);
    return tasks.filter((t) => t.householdId === householdId);
  }

  async getById(id: string): Promise<PersistentTask | null> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.PERSISTENT_TASKS);
    const tasks: PersistentTask[] = safeParse(json, []);
    return tasks.find((t) => t.id === id) ?? null;
  }

  async create(
    data: Omit<PersistentTask, 'id' | 'createdAt'>
  ): Promise<PersistentTask> {
    const id = `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const task: PersistentTask = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };

    const json = await AsyncStorage.getItem(STORAGE_KEYS.PERSISTENT_TASKS);
    const tasks: PersistentTask[] = safeParse(json, []);
    tasks.push(task);
    await AsyncStorage.setItem(
      STORAGE_KEYS.PERSISTENT_TASKS,
      JSON.stringify(tasks)
    );

    return task;
  }

  async delete(id: string): Promise<void> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.PERSISTENT_TASKS);
    const tasks: PersistentTask[] = safeParse(json, []);
    const filtered = tasks.filter((t) => t.id !== id);
    await AsyncStorage.setItem(
      STORAGE_KEYS.PERSISTENT_TASKS,
      JSON.stringify(filtered)
    );
  }
}

// ── PersistentChronoTimerRepository ─────────────────────────────

export class PersistentChronoTimerRepository implements ChronoTimerRepository {
  async getState(householdId: string): Promise<ChronoTimerState | null> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.CHRONO_TIMER);
    const states: Record<string, ChronoTimerState> = safeParse(json, {});
    return states[householdId] ?? null;
  }

  async setState(
    householdId: string,
    state: ChronoTimerState | null
  ): Promise<void> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.CHRONO_TIMER);
    const states: Record<string, ChronoTimerState> = safeParse(json, {});

    if (state === null) {
      delete states[householdId];
    } else {
      states[householdId] = state;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.CHRONO_TIMER, JSON.stringify(states));
  }

  async clearState(householdId: string): Promise<void> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.CHRONO_TIMER);
    const states: Record<string, ChronoTimerState> = safeParse(json, {});
    delete states[householdId];
    await AsyncStorage.setItem(STORAGE_KEYS.CHRONO_TIMER, JSON.stringify(states));
  }
}
