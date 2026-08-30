/**
 * ChoreScore V2 — In-Memory Repositories
 *
 * Local in-memory storage for development and testing.
 * In production, these would be backed by a database or sync service.
 */

import {
  Household,
  Member,
  CompletedEntry,
  PersistentTask,
  TodoItem,
  User,
  Membership,
  Account,
} from '../../domain/entities';
import {
  HouseholdRepository,
  MemberRepository,
  EntryRepository,
  PersistentTaskRepository,
  TodoRepository,
  UserRepository,
  MembershipRepository,
  AccountRepository,
} from '../../application/use-cases/ChoreScoreApp';

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async getById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.email === email) || null;
  }

  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user: User = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, user);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error(`User ${id} not found`);
    const updated = { ...existing, ...data, id };
    this.users.set(id, updated);
    return updated;
  }

  /** Seed with test data */
  seed(users: User[]): void {
    for (const u of users) {
      this.users.set(u.id, u);
    }
  }
}

export class InMemoryMembershipRepository implements MembershipRepository {
  private memberships: Map<string, Membership> = new Map();

  async getByUser(userId: string): Promise<Membership[]> {
    return Array.from(this.memberships.values()).filter(m => m.userId === userId);
  }

  async getByHousehold(householdId: string): Promise<Membership[]> {
    return Array.from(this.memberships.values()).filter(m => m.householdId === householdId);
  }

  async getByUserAndHousehold(userId: string, householdId: string): Promise<Membership | null> {
    return Array.from(this.memberships.values()).find(
      m => m.userId === userId && m.householdId === householdId
    ) || null;
  }

  async create(data: Omit<Membership, 'id' | 'joinedAt'>): Promise<Membership> {
    const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const membership: Membership = {
      ...data,
      id,
      joinedAt: new Date().toISOString(),
    };
    this.memberships.set(id, membership);
    return membership;
  }

  async delete(id: string): Promise<void> {
    this.memberships.delete(id);
  }

  /** Seed with test data */
  seed(memberships: Membership[]): void {
    for (const m of memberships) {
      this.memberships.set(m.id, m);
    }
  }
}

export class InMemoryAccountRepository implements AccountRepository {
  private accounts: Map<string, Account> = new Map();

  async getByUser(userId: string): Promise<Account | null> {
    return Array.from(this.accounts.values()).find(a => a.userId === userId) || null;
  }

  async create(data: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
    const id = `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const account: Account = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.accounts.set(id, account);
    return account;
  }

  async update(userId: string, data: Partial<Account>): Promise<Account> {
    const existing = Array.from(this.accounts.values()).find(a => a.userId === userId);
    if (!existing) throw new Error(`Account for user ${userId} not found`);
    const updated = { ...existing, ...data };
    this.accounts.set(existing.id, updated);
    return updated;
  }

  /** Seed with test data */
  seed(accounts: Account[]): void {
    for (const a of accounts) {
      this.accounts.set(a.id, a);
    }
  }
}

export class InMemoryHouseholdRepository implements HouseholdRepository {
  private households: Map<string, Household> = new Map();

  async getAll(): Promise<Household[]> {
    return Array.from(this.households.values());
  }

  async getById(id: string): Promise<Household | null> {
    return this.households.get(id) || null;
  }

  async create(name: string, ownerId: string): Promise<Household> {
    const id = `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const household: Household = {
      id,
      name,
      ownerId,
      createdAt: new Date().toISOString(),
    };
    this.households.set(id, household);
    return household;
  }

  async delete(id: string): Promise<void> {
    this.households.delete(id);
  }

  /** Seed with test data */
  seed(households: Household[]): void {
    for (const h of households) {
      this.households.set(h.id, h);
    }
  }
}

export class InMemoryMemberRepository implements MemberRepository {
  private members: Map<string, Member> = new Map();

  async getByHousehold(householdId: string): Promise<Member[]> {
    return Array.from(this.members.values()).filter(m => m.householdId === householdId);
  }

  async getById(id: string): Promise<Member | null> {
    return this.members.get(id) || null;
  }

  async create(data: Omit<Member, 'id' | 'joinedAt'>): Promise<Member> {
    const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const member: Member = {
      ...data,
      id,
      joinedAt: new Date().toISOString(),
    };
    this.members.set(id, member);
    return member;
  }

  /** Seed with test data */
  seed(members: Member[]): void {
    for (const m of members) {
      this.members.set(m.id, m);
    }
  }
}

export class InMemoryEntryRepository implements EntryRepository {
  private entries: Map<string, CompletedEntry> = new Map();

  async getByHousehold(householdId: string): Promise<CompletedEntry[]> {
    return Array.from(this.entries.values())
      .filter(e => e.householdId === householdId)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }

  async getById(id: string): Promise<CompletedEntry | null> {
    return this.entries.get(id) || null;
  }

  async create(data: Omit<CompletedEntry, 'id'>): Promise<CompletedEntry> {
    const id = `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: CompletedEntry = { ...data, id };
    this.entries.set(id, entry);
    return entry;
  }

  async update(id: string, data: Partial<CompletedEntry>): Promise<CompletedEntry> {
    const existing = this.entries.get(id);
    if (!existing) throw new Error(`Entry ${id} not found`);
    const updated = { ...existing, ...data, id };
    this.entries.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }

  /** Seed with test data */
  seed(entries: CompletedEntry[]): void {
    for (const e of entries) {
      this.entries.set(e.id, e);
    }
  }
}

export class InMemoryPersistentTaskRepository implements PersistentTaskRepository {
  private tasks: Map<string, PersistentTask> = new Map();

  async getByHousehold(householdId: string): Promise<PersistentTask[]> {
    return Array.from(this.tasks.values()).filter(t => t.householdId === householdId);
  }

  async getById(id: string): Promise<PersistentTask | null> {
    return this.tasks.get(id) || null;
  }

  async create(data: Omit<PersistentTask, 'id' | 'createdAt'>): Promise<PersistentTask> {
    const id = `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const task: PersistentTask = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async delete(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  /** Seed with test data */
  seed(tasks: PersistentTask[]): void {
    for (const t of tasks) {
      this.tasks.set(t.id, t);
    }
  }
}

export class InMemoryTodoRepository implements TodoRepository {
  private todos: Map<string, TodoItem> = new Map();

  async getByHousehold(householdId: string): Promise<TodoItem[]> {
    return Array.from(this.todos.values())
      .filter(t => t.householdId === householdId)
      .sort((a, b) => {
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      });
  }

  async getById(id: string): Promise<TodoItem | null> {
    return this.todos.get(id) || null;
  }

  async create(data: Omit<TodoItem, 'id' | 'createdAt'>): Promise<TodoItem> {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const todo: TodoItem = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.todos.set(id, todo);
    return todo;
  }

  async update(id: string, data: Partial<TodoItem>): Promise<TodoItem> {
    const existing = this.todos.get(id);
    if (!existing) throw new Error(`Todo ${id} not found`);
    const updated = { ...existing, ...data, id };
    this.todos.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.todos.delete(id);
  }

  /** Seed with test data */
  seed(todos: TodoItem[]): void {
    for (const t of todos) {
      this.todos.set(t.id, t);
    }
  }
}
