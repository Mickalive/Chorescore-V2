/**
 * ChoreScore V2 — Application Use Cases
 *
 * Orchestration layer that coordinates domain logic with infrastructure ports.
 * No direct dependency on external providers.
 */

import {
  CompletedEntry,
  PersistentTask,
  TodoItem,
  Household,
  Member,
  User,
  Membership,
  Account,
  ScoreResult,
  FilterType,
  AccountEntitlement,
  ChronoTimerState,
} from '../../domain/entities';
import { calculateScore, filterEntries } from '../../domain/calculations/score';
import {
  isInCivilMonth,
  getCurrentCivilMonth,
  filterEntriesByPeriod,
} from '../../domain/calculations/civilMonth';
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
  AccountEntitlementState,
  ChronoTimerRepository,
} from '../ports';

// ── Repository Interfaces ──────────────────────────────────────

export interface UserRepository {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  create(data: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
}

export interface MembershipRepository {
  getByUser(userId: string): Promise<Membership[]>;
  getByHousehold(householdId: string): Promise<Membership[]>;
  getByUserAndHousehold(userId: string, householdId: string): Promise<Membership | null>;
  create(data: Omit<Membership, 'id' | 'joinedAt'>): Promise<Membership>;
  delete(id: string): Promise<void>;
}

export interface AccountRepository {
  getByUser(userId: string): Promise<Account | null>;
  create(data: Omit<Account, 'id' | 'createdAt'>): Promise<Account>;
  update(userId: string, data: Partial<Account>): Promise<Account>;
}

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
      users: UserRepository;
      memberships: MembershipRepository;
      accounts: AccountRepository;
      households: HouseholdRepository;
      members: MemberRepository;
      entries: EntryRepository;
      persistentTasks: PersistentTaskRepository;
      todos: TodoRepository;
      chronoTimer?: ChronoTimerRepository;
    }
  ) {}

  // ── User & Account Use Cases ─────────────────────────────────

  async getCurrentUser(): Promise<User | null> {
    const authUser = this.services.auth.getCurrentUser();
    if (!authUser) return null;
    return this.repositories.users.getById(authUser.userId);
  }

  async getOrCreateAccount(userId: string): Promise<Account> {
    let account = await this.repositories.accounts.getByUser(userId);
    if (!account) {
      account = await this.repositories.accounts.create({
        userId,
        ownedFreeHouseholdId: null,
      });
    }
    return account;
  }

  async getHouseholdsForUser(userId: string): Promise<Household[]> {
    const memberships = await this.repositories.memberships.getByUser(userId);
    const householdIds = memberships.map(m => m.householdId);
    const households: Household[] = [];
    for (const id of householdIds) {
      const household = await this.repositories.households.getById(id);
      if (household) households.push(household);
    }
    return households;
  }

  async getMembersForHousehold(householdId: string): Promise<Member[]> {
    return this.repositories.members.getByHousehold(householdId);
  }

  async getMembershipForUser(userId: string, householdId: string): Promise<Membership | null> {
    return this.repositories.memberships.getByUserAndHousehold(userId, householdId);
  }

  // ── Household Use Cases ──────────────────────────────────────

  async getHouseholds(): Promise<Household[]> {
    return this.repositories.households.getAll();
  }

  async getHousehold(id: string): Promise<Household | null> {
    return this.repositories.households.getById(id);
  }

  /**
   * Create a new household with account-level entitlement check.
   * The "one free household" rule is resolved at the account level,
   * not against a fake household ID like 'new-household'.
   */
  async createHousehold(
    name: string,
    ownerId: string,
    options?: { skipEntitlementCheck?: boolean }
  ): Promise<Household> {
    // Get or create account for the owner
    const account = await this.getOrCreateAccount(ownerId);

    // Check account-level entitlement for free household creation
    if (!options?.skipEntitlementCheck) {
      // In demo-premium mode, always allow creation
      const entitlementMode = (this.services.entitlements as { getMode?: () => string }).getMode?.();
      const isDemoPremium = entitlementMode === 'demo-premium';

      if (!isDemoPremium) {
        // Check if user already owns a free household
        if (account.ownedFreeHouseholdId !== null) {
          throw new Error(
            'Cannot create additional free households. Upgrade to Standard or Pro for additional households.'
          );
        }
      }
    }

    // Create the household
    const household = await this.repositories.households.create(name, ownerId);

    // Update account to track the free household
    await this.repositories.accounts.update(ownerId, {
      ownedFreeHouseholdId: household.id,
    });

    // Create the owner membership
    await this.repositories.memberships.create({
      userId: ownerId,
      householdId: household.id,
      role: 'OWNER',
    });

    // Create the owner as a member
    const ownerUser = await this.repositories.users.getById(ownerId);
    await this.repositories.members.create({
      householdId: household.id,
      name: ownerUser?.displayName || 'Propriétaire',
      userId: ownerId,
    });

    // Start trial for the new household
    await this.services.entitlements.startTrial(household.id);

    return household;
  }

  /**
   * Join an existing household via invitation.
   * A free account can join multiple households without paying.
   * Rights come from the household's plan, not the account.
   */
  async joinHousehold(
    userId: string,
    householdId: string
  ): Promise<Membership> {
    // Check if already a member
    const existing = await this.repositories.memberships.getByUserAndHousehold(userId, householdId);
    if (existing) {
      throw new Error('Already a member of this household');
    }

    // Create membership
    const membership = await this.repositories.memberships.create({
      userId,
      householdId,
      role: 'MEMBER',
    });

    // Create the member entry
    const user = await this.repositories.users.getById(userId);
    await this.repositories.members.create({
      householdId,
      name: user?.displayName || 'Membre',
      userId,
    });

    return membership;
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

  async updateEntry(
    entryId: string,
    data: Partial<{
      label: string;
      performedByMemberId: string;
      beneficiaryMemberIds: string[];
      durationMinutes: number;
      weight: number;
      persistentTaskId: string | null;
      occurredAt: string;
    }>
  ): Promise<CompletedEntry> {
    return this.repositories.entries.update(entryId, data);
  }

  async deleteEntry(entryId: string): Promise<void> {
    return this.repositories.entries.delete(entryId);
  }

  /**
   * Get entries for a specific civil month.
   * Used by Free mode to filter to current month only.
   */
  async getEntriesForMonth(
    householdId: string,
    year: number,
    month: number
  ): Promise<CompletedEntry[]> {
    const allEntries = await this.repositories.entries.getByHousehold(householdId);
    return allEntries.filter(e => isInCivilMonth(e.occurredAt, year, month));
  }

  /**
   * Get entries visible to the current user based on their household's entitlement.
   * Free mode: only current civil month.
   * Trial/Standard/Pro: full archive.
   */
  async getVisibleEntries(householdId: string): Promise<CompletedEntry[]> {
    const entitlement = await this.services.entitlements.getEntitlement(householdId);
    const allEntries = await this.repositories.entries.getByHousehold(householdId);

    if (entitlement.historyArchiveAccess) {
      return allEntries;
    }

    // Free mode: only current civil month
    const [year, month] = getCurrentCivilMonth();
    return allEntries.filter(e => isInCivilMonth(e.occurredAt, year, month));
  }

  /**
   * Check if the household has entries older than the current civil month.
   * Used to show the archive message in Free mode.
   */
  async hasOlderEntries(householdId: string): Promise<boolean> {
    const entitlement = await this.services.entitlements.getEntitlement(householdId);
    if (entitlement.historyArchiveAccess) return false;

    const allEntries = await this.repositories.entries.getByHousehold(householdId);
    const [year, month] = getCurrentCivilMonth();
    return allEntries.some(e => !isInCivilMonth(e.occurredAt, year, month));
  }

  // ── Persistent Task Use Cases ────────────────────────────────

  async createPersistentTask(data: {
    householdId: string;
    name: string;
    defaultWeight?: number;
  }): Promise<PersistentTask> {
    return this.repositories.persistentTasks.create({
      householdId: data.householdId,
      name: data.name,
      defaultWeight: data.defaultWeight ?? 1,
    });
  }

  async deletePersistentTask(taskId: string): Promise<void> {
    return this.repositories.persistentTasks.delete(taskId);
  }

  // ── Chrono Timer Use Cases ───────────────────────────────────

  async startChrono(householdId: string, memberId: string): Promise<void> {
    if (!this.repositories.chronoTimer) return;
    await this.repositories.chronoTimer.setState(householdId, {
      householdId,
      memberId,
      startedAt: new Date().toISOString(),
      isRunning: true,
    });
  }

  async stopChrono(householdId: string): Promise<number> {
    if (!this.repositories.chronoTimer) return 0;
    const state = await this.repositories.chronoTimer.getState(householdId);
    if (!state || !state.isRunning) return 0;

    const elapsed = Math.round(
      (Date.now() - new Date(state.startedAt).getTime()) / 60000
    );
    await this.repositories.chronoTimer.clearState(householdId);
    return Math.max(1, elapsed); // minimum 1 minute
  }

  async getChronoState(householdId: string): Promise<ChronoTimerState | null> {
    if (!this.repositories.chronoTimer) return null;
    return this.repositories.chronoTimer.getState(householdId);
  }

  // ── Score Use Cases ──────────────────────────────────────────

  /**
   * Calculate score for a household, applying period filtering AND
   * respecting Free tier civil month restriction.
   *
   * Free tier: all periods are limited to current civil month.
   * Premium: year/all-time use full archive, week/month use actual period.
   */
  async calculateScore(
    householdId: string,
    period: 'week' | 'month' | 'year' | 'all-time',
    filter: FilterType = 'all',
    filterTaskId?: string
  ): Promise<ScoreResult> {
    const allEntries = await this.repositories.entries.getByHousehold(householdId);
    const entitlement = await this.services.entitlements.getEntitlement(householdId);

    // Apply period filtering (respects Free tier civil month restriction)
    const periodEntries = filterEntriesByPeriod(
      allEntries,
      period,
      entitlement.scoreArchiveAccess
    );

    return calculateScore(
      periodEntries,
      period,
      filter,
      filterTaskId,
      entitlement.weightingEnabled
    );
  }

  /**
   * Get entries for the Score screen's contextual history section.
   * Returns entries filtered by both period AND task filter.
   */
  async getScoreHistory(
    householdId: string,
    period: 'week' | 'month' | 'year' | 'all-time',
    filter: FilterType = 'all',
    filterTaskId?: string
  ): Promise<CompletedEntry[]> {
    const allEntries = await this.repositories.entries.getByHousehold(householdId);
    const entitlement = await this.services.entitlements.getEntitlement(householdId);

    // Apply period filtering first (respects Free tier civil month restriction)
    const periodEntries = filterEntriesByPeriod(
      allEntries,
      period,
      entitlement.scoreArchiveAccess
    );

    // Then apply task filter
    return filterEntries(periodEntries, filter, filterTaskId);
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
    reminderAt?: string | null;
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
      reminderAt: data.reminderAt ?? null,
      notes: data.notes ?? '',
      persistentTaskId: data.persistentTaskId ?? null,
      status: 'todo',
    });

    // Schedule notification for reminder if set and notifications are available
    if (todo.reminderAt && this.services.notifications.isAvailable()) {
      try {
        await this.services.notifications.scheduleNotification({
          title: `Rappel : ${todo.title}`,
          body: todo.notes || 'Il est temps de commencer cette tâche !',
          scheduledAt: todo.reminderAt,
          data: { todoId: todo.id, householdId: todo.householdId },
        });
      } catch {
        // Notification scheduling failed — non-critical, todo is still created
      }
    }

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

    // Idempotency guard: never create two CompletedEntry for the same todo
    if (todo.status === 'completed') {
      throw new Error('Todo is already completed');
    }

    // Validate duration is positive
    if (durationMinutes <= 0) {
      throw new Error('Duration must be greater than zero');
    }

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

  async getAccountEntitlement(userId: string): Promise<AccountEntitlementState> {
    return this.services.entitlements.getAccountEntitlement(userId);
  }

  /**
   * Check if the current user can create a household.
   * This is an account-level check, not against a fake household ID.
   */
  async canCreateHousehold(userId: string): Promise<boolean> {
    const entitlement = await this.services.entitlements.getAccountEntitlement(userId);
    return entitlement.canCreateFreeHousehold;
  }

  /**
   * Get household summary with member count and effective plan.
   */
  async getHouseholdSummary(householdId: string): Promise<{
    household: Household;
    memberCount: number;
    effectivePlan: 'free' | 'trial' | 'standard' | 'pro';
    entitlement: EntitlementState;
  } | null> {
    const household = await this.repositories.households.getById(householdId);
    if (!household) return null;

    const members = await this.repositories.members.getByHousehold(householdId);
    const entitlement = await this.services.entitlements.getEntitlement(householdId);

    return {
      household,
      memberCount: members.length,
      effectivePlan: entitlement.plan,
      entitlement,
    };
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
