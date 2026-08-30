/**
 * ChoreScore V2 — Domain Entities
 *
 * Pure TypeScript entities with no external dependencies.
 * These represent the core business objects.
 */

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
  notes: string;
  persistentTaskId: string | null;
  status: 'todo' | 'in-progress' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export type PlanType = 'free' | 'trial' | 'standard' | 'pro';

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
