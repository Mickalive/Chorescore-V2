/**
 * ChoreScore V2 — Application Use Cases
 *
 * Orchestration layer that coordinates domain logic with infrastructure ports.
 * No direct dependency on external providers.
 */

import { CompletedEntry, PersistentTask, TodoItem, Household, Member, ScoreResult, FilterType } from '../../domain/entities';
import { calculateScore, filterEntries } from '../../domain/calculations/score';
import {
  AuthGateway,
  EntitlementGateway,
  EntitlementFeature,
  SystemShareGateway,
  NotificationGateway,
  CalendarGateway,
  SecureStorageGateway,
  SyncGateway,
  ResearchAnalyticsGateway,
  EntitlementState,
} from '../ports';

export interface HouseholdRepository {
  getAll(): Promise<Household[]>;
  getById(id: string): Promise<Household | null>;
  create(name: string, ownerId: string): Promise<Household>;
  delete(id: string): Promise<void>;
}

export interface MemberRepository {
  getByHousehold(householdId: string): Promise<Member[]>;
  getById(id: string): Promise<Member | null>;
  create(data: Omit<Member, 'id' | 'joinedAt'>): Promise<Member>;
}

export interface EntryRepository {
  getByHousehold(householdId: string): Promise<CompletedEntry[]>;
  getById(id: string): Promise<CompletedEntry | null>;
  create(entry: Omit<CompletedEntry, 'id'>): Promise<CompletedEntry>;
  update(id: string, data: Partial<CompletedEntry>): Promise<CompletedEntry>;
  delete(id: string): Promise<void>;
}

export interface PersistentTaskRepository {
  getByHousehold(householdId: string): Promise<PersistentTask[]>;
  getById(id: string): Promise<PersistentTask | null>;
  create(task: Omit<PersistentTask, 'id' | 'createdAt'>): Promise<PersistentTask>;
  delete(id: string): Promise<void>;
}

export interface TodoRepository {
  getByHousehold(householdId: string): Promise<TodoItem[]>;
  getById(id: string): Promise<TodoItem | null>;
  create(todo: Omit<TodoItem, 'id' | 'createdAt'>): Promise<TodoItem>;
  update(id: string, data: Partial<TodoItem>): Promise<TodoItem>;
  delete(id: string): Promise<void>;
}

export interface AppServices {
  auth: AuthGateway;
  entitlements: EntitlementGateway;
  share: SystemShareGateway;
  notifications: NotificationGateway;
  calendar: CalendarGateway;
  secureStorage: SecureStorageGateway;
  sync: SyncGateway;
  analytics: ResearchAnalyticsGateway;
}

/**
 * Main application facade providing access to all use cases.
 */
export class ChoreScoreApp {
  constructor(
    public readonly services: AppServices,
    public readonly repositories: {
      households: HouseholdRepository;
      members: MemberRepository;
      entries: EntryRepository;
      persistentTasks: PersistentTaskRepository;
      todos: TodoRepository;
    }
  ) {}

  // ── Household Use Cases ──────────────────────────────────────

  async getHouseholds(): Promise<Household[]> {
    return this.repositories.households.getAll();
  }

  async getHousehold(id: string): Promise<Household | null> {
    return this.repositories.households.getById(id);
  }

  async createHousehold(name: string, ownerId: string): Promise<Household> {
    const canCreate = await this.services.entitlements.canUseFeature(
      'new-household',
      'create-household'
    );
    if (!canCreate) {
      throw new Error('Cannot create additional households on free plan');
    }
    return this.repositories.households.create(name, ownerId);
  }

  // ── Entry Use Cases ──────────────────────────────────────────

  async getEntries(householdId: string): Promise<CompletedEntry[]> {
    return this.repositories.entries.getByHousehold(householdId);
  }

  async createEntry(data: {
    householdId: string;
    label: string;
    performedByMemberId: string;
    beneficiaryMemberIds: string[];
    durationMinutes: number;
    weight?: number;
    persistentTaskId?: string | null;
    occurredAt?: string;
    createdBy: string;
  }): Promise<CompletedEntry> {
    const entry = await this.repositories.entries.create({
      householdId: data.householdId,
      label: data.label,
      performedByMemberId: data.performedByMemberId,
      beneficiaryMemberIds: data.beneficiaryMemberIds,
      durationMinutes: data.durationMinutes,
      weight: data.weight ?? 1,
      persistentTaskId: data.persistentTaskId ?? null,
      occurredAt: data.occurredAt || new Date().toISOString(),
      createdBy: data.createdBy,
    });

    // Emit analytics fact (secondary, disableable)
    // IMPORTANT: Only minimized, non-identifying data is emitted.
    // No householdId, memberId, label, email, IP, device ID, or any other operational identifier.
    if (this.services.analytics.isEnabled()) {
      this.services.analytics.emitFact({
        type: 'entry_created',
        data: {
          durationMinutes: data.durationMinutes,
          beneficiaryCount: data.beneficiaryMemberIds.length,
          hasPersistentTask: data.persistentTaskId != null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return entry;
  }

  // ── Score Use Cases ──────────────────────────────────────────

  async calculateScore(
    householdId: string,
    period: 'week' | 'month' | 'year' | 'all-time',
    filter: FilterType = 'all',
    filterTaskId?: string
  ): Promise<ScoreResult> {
    const entries = await this.repositories.entries.getByHousehold(householdId);
    const entitlement = await this.services.entitlements.getEntitlement(householdId);

    return calculateScore(
      entries,
      period,
      filter,
      filterTaskId,
      entitlement.weightingEnabled
    );
  }

  async getPersistentTasks(householdId: string): Promise<PersistentTask[]> {
    return this.repositories.persistentTasks.getByHousehold(householdId);
  }

  // ── Todo Use Cases ───────────────────────────────────────────

  async getTodos(householdId: string): Promise<TodoItem[]> {
    const entitlement = await this.services.entitlements.getEntitlement(householdId);
    if (!entitlement.todoPlanningEnabled) {
      throw new Error('Todo planning requires Premium subscription');
    }
    return this.repositories.todos.getByHousehold(householdId);
  }

  async createTodo(data: {
    householdId: string;
    title: string;
    assigneeMemberId?: string | null;
    beneficiaryMemberIds?: string[];
    dueAt?: string | null;
    notes?: string;
    persistentTaskId?: string | null;
  }): Promise<TodoItem> {
    const entitlement = await this.services.entitlements.getEntitlement(data.householdId);
    if (!entitlement.todoPlanningEnabled) {
      throw new Error('Todo planning requires Premium subscription');
    }

    const todo = await this.repositories.todos.create({
      householdId: data.householdId,
      title: data.title,
      assigneeMemberId: data.assigneeMemberId ?? null,
      beneficiaryMemberIds: data.beneficiaryMemberIds ?? [],
      dueAt: data.dueAt ?? null,
      notes: data.notes ?? '',
      persistentTaskId: data.persistentTaskId ?? null,
      status: 'todo',
    });

    return todo;
  }

  async completeTodo(
    todoId: string,
    performedByMemberId: string,
    durationMinutes: number,
    beneficiaryMemberIds: string[]
  ): Promise<{ todo: TodoItem; entry: CompletedEntry }> {
    const todo = await this.repositories.todos.getById(todoId);
    if (!todo) throw new Error('Todo not found');

    // Mark todo as completed
    const updatedTodo = await this.repositories.todos.update(todoId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    // Create a CompletedEntry from the todo
    const entry = await this.repositories.entries.create({
      householdId: todo.householdId,
      label: todo.title,
      performedByMemberId,
      beneficiaryMemberIds,
      durationMinutes,
      weight: 1,
      persistentTaskId: todo.persistentTaskId,
      occurredAt: new Date().toISOString(),
      createdBy: performedByMemberId,
    });

    return { todo: updatedTodo, entry };
  }

  // ── Entitlement Use Cases ────────────────────────────────────

  async getEntitlement(householdId: string): Promise<EntitlementState> {
    return this.services.entitlements.getEntitlement(householdId);
  }

  async canUseFeature(householdId: string, feature: EntitlementFeature): Promise<boolean> {
    return this.services.entitlements.canUseFeature(householdId, feature);
  }

  // ── Share Use Cases ──────────────────────────────────────────

  async shareContent(options: {
    title?: string;
    message?: string;
    url?: string;
  }): Promise<boolean> {
    if (!this.services.share.isAvailable()) {
      return false;
    }
    const result = await this.services.share.share(options);
    return result.completed;
  }
}
