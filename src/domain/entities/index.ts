/**
 * ChoreScore V2 — Domain Entities
 *
 * Pure TypeScript entities with no external dependencies.
 * These represent the core business objects.
 */

// ── Account & Identity ─────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export type MembershipRole = 'MEMBER' | 'OWNER';

export interface Membership {
  id: string;
  userId: string;
  householdId: string;
  role: MembershipRole;
  joinedAt: string;
}

/**
 * Account tracks account-level entitlements.
 * The "one free household" rule is resolved at the account level,
 * not against a fake household ID.
 */
export interface Account {
  id: string;
  userId: string;
  ownedFreeHouseholdId: string | null;
  createdAt: string;
}

// ── Household & Members ────────────────────────────────────────

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Member {
  id: string;
  householdId: string;
  name: string;
  userId: string;
  joinedAt: string;
}

export interface CompletedEntry {
  id: string;
  householdId: string;
  label: string;
  performedByMemberId: string;
  beneficiaryMemberIds: string[];
  durationMinutes: number;
  weight: number;
  persistentTaskId: string | null;
  occurredAt: string;
  createdBy: string;
  modifiedBy?: string;
}

export interface PersistentTask {
  id: string;
  householdId: string;
  name: string;
  defaultWeight: number;
  createdAt: string;
}

export interface TodoItem {
  id: string;
  householdId: string;
  title: string;
  assigneeMemberId: string | null;
  beneficiaryMemberIds: string[];
  dueAt: string | null;
  reminderAt: string | null;
  notes: string;
  persistentTaskId: string | null;
  status: 'todo' | 'in-progress' | 'completed';
  createdAt: string;
  completedAt?: string;
}

// ── Plans & Entitlements ───────────────────────────────────────

export type PlanType = 'free' | 'trial' | 'standard' | 'pro';

/**
 * Pricing configuration (canonical V1 values).
 * These are configurable for localization/store/evolution.
 */
export const PRICING = {
  TRIAL_DAYS: 30,
  STANDARD_MONTHLY_EUR: 2.99,
  STANDARD_MEMBER_LIMIT: 7,
  PRO_MONTHLY_EUR: 5.99,
  PRO_MEMBER_THRESHOLD: 8,
} as const;

export interface Entitlement {
  plan: PlanType;
  householdId: string;
  isTestEntitlement: boolean;
  billingIsReal: boolean;
  scoreArchiveAccess: boolean;
  historyArchiveAccess: boolean;
  weightingEnabled: boolean;
  todoPlanningEnabled: boolean;
  advancedExportEnabled: boolean;
  memberLimit: number;
  canCreateAdditionalOwnedHousehold: boolean;
  trialEndsAt?: string;
}

/**
 * Account-level entitlement for household creation.
 * Resolves the "one free household" rule at the account level.
 */
export interface AccountEntitlement {
  canCreateFreeHousehold: boolean;
  ownedFreeHouseholdId: string | null;
  hasActiveTrial: boolean;
}

/**
 * ChronoTimerState tracks an active chrono session.
 * Persists across app backgrounding so the timer can resume.
 */
export interface ChronoTimerState {
  householdId: string;
  memberId: string;
  startedAt: string; // ISO date string
  isRunning: boolean;
}

export type FilterType = 'all' | 'persistent-task' | 'others';

export interface Balance {
  memberId: string;
  minutes: number;
}

export interface Compensation {
  fromMemberId: string;
  toMemberId: string;
  minutes: number;
}

export interface ScoreResult {
  period: 'week' | 'month' | 'year' | 'all-time';
  filter: FilterType;
  filterTaskId?: string;
  balances: Balance[];
  compensations: Compensation[];
  performedMinutes: Record<string, number>;
  weightedBalances?: Balance[];
  weightedCompensations?: Compensation[];
  performedWeightedMinutes?: Record<string, number>;
  sumOfBalances: number;
}
