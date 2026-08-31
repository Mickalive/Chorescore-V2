/**
 * ChoreScore V2 — Research Analytics Store Types
 *
 * These types define the schema for the Research Analytics Store.
 * They contain ZERO operational IDs, ZERO free text, ZERO join keys.
 *
 * CRITICAL INVARIANT: No type in this file may reference:
 * - userId, accountId, memberId, householdId (operational IDs)
 * - email, phone, OAuth subject
 * - IP, device ID, advertising ID
 * - member names or household names
 * - free text (labels, notes, titles)
 * - precise GPS/address
 * - exact timestamps when coarser granularity suffices
 * - any join key toward the operational store
 *
 * The Research Analytics Store is derived via PrivacyTransformPipeline
 * and gated by PrivacyReleaseGate before any external release.
 */

// ── Taxonomy (versioned, deterministic) ────────────────────────

/**
 * Versioned taxonomy identifier.
 * The product keeps free text; analytics never sees raw labels.
 * Each taxonomy ID maps deterministically to a category.
 */
export type TaxonomyCategoryId =
  | 'kitchen'
  | 'dishes'
  | 'cleaning'
  | 'laundry'
  | 'groceries'
  | 'administrative'
  | 'childcare'
  | 'maintenance'
  | 'waste'
  | 'other';

export interface TaxonomyVersion {
  /** Semantic version of the taxonomy (e.g., "1.0.0") */
  version: string;
  /** Map of label patterns to category IDs */
  mappings: Record<string, TaxonomyCategoryId>;
  /** Fallback category for unmatched labels */
  fallback: TaxonomyCategoryId;
}

// ── Generalized Time ───────────────────────────────────────────

/**
 * Generalized timestamp for analytics.
 * Never contains exact timestamps — only coarse time dimensions.
 */
export interface GeneralizedTimestamp {
  /** ISO week start date (YYYY-MM-DD, Monday) */
  isoWeek: string;
  /** Month (YYYY-MM) */
  month: string;
  /** Day of week (1=Monday, 7=Sunday) */
  dayOfWeek: number;
  /** Hour bucket (0-23, or -1 for unknown) */
  hourBucket: number;
}

// ── Demographics (optional, structured, never inferred) ────────

/**
 * Optional demographic variables.
 * Collected as structured, voluntary, transparent data.
 * Never inferred from names or behavior.
 */
export interface DemographicSnapshot {
  /** Age range bucket */
  ageRange?: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
  /** Household size bucket */
  householdSizeBucket?: '2' | '3-4' | '5-6' | '7+';
  /** Has children (optional, structured) */
  hasChildren?: boolean;
  /** Region bucket (very coarse, never precise) */
  regionBucket?: string;
}

// ── Analytics Record Types ─────────────────────────────────────

/**
 * Anonymous task fact — derived from a CompletedEntry.
 * Contains NO operational IDs, NO free text, NO join keys.
 */
export interface AnonymousTaskFact {
  /** Taxonomy category (replaces free-text label) */
  taxonomyCategoryId: TaxonomyCategoryId;
  /** Taxonomy version used for mapping */
  taxonomyVersion: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Number of beneficiaries */
  beneficiaryCount: number;
  /** Whether a persistent task was linked */
  hasPersistentTask: boolean;
  /** Weight applied (1.0 default) */
  weight: number;
  /** Generalized timestamp */
  timestamp: GeneralizedTimestamp;
  /** Optional demographics (never inferred) */
  demographics?: DemographicSnapshot;
}

/**
 * Anonymous household aggregate — computed over multiple entries.
 * No household ID, no member IDs, no names.
 */
export interface AnonymousHouseholdAggregate {
  /** Household size bucket */
  householdSizeBucket: '2' | '3-4' | '5-6' | '7+';
  /** Month bucket */
  month: string;
  /** Total tasks in this aggregate */
  totalTasks: number;
  /** Average duration per task */
  avgDurationMinutes: number;
  /** Median duration per task */
  medianDurationMinutes: number;
  /** Total minutes across all tasks */
  totalMinutes: number;
  /** Distribution of tasks across taxonomy categories */
  categoryDistribution: Record<TaxonomyCategoryId, number>;
  /** Balance equality index (0-1, 1 = perfectly equal) */
  balanceEqualityIndex: number;
}

/**
 * Anonymous cohort aggregate — for statistical comparison.
 */
export interface AnonymousCohortAggregate {
  /** Cohort identifier (generated, not operational) */
  cohortId: string;
  /** Cohort description */
  description: string;
  /** Number of households in cohort */
  cohortSize: number;
  /** Aggregated statistics */
  aggregates: {
    avgTasksPerWeek: number;
    avgMinutesPerWeek: number;
    avgBalanceEquality: number;
    categoryBreakdown: Record<TaxonomyCategoryId, number>;
  };
  /** Demographics snapshot for the cohort */
  demographics?: DemographicSnapshot;
}

/**
 * Research data product — the final output for external release.
 * Must pass PrivacyReleaseGate before export.
 */
export interface ResearchDataProduct {
  /** Product identifier */
  productId: string;
  /** Product version */
  version: string;
  /** Taxonomy version used */
  taxonomyVersion: string;
  /** Type of data product */
  type: 'aggregate' | 'cohort' | 'synthetic' | 'api-query';
  /** Households included (count only) */
  householdCount: number;
  /** Timestamp range (generalized) */
  timeRange: {
    fromMonth: string;
    toMonth: string;
  };
  /** The actual data (aggregates, cohorts, or synthetic records) */
  data: AnonymousHouseholdAggregate[] | AnonymousCohortAggregate[] | AnonymousTaskFact[];
  /** Provenance metadata */
  provenance: DataProductProvenance;
}

/**
 * Provenance metadata for audit trail.
 */
export interface DataProductProvenance {
  /** Pipeline version that produced this data */
  pipelineVersion: string;
  /** Timestamp of production (generalized) */
  producedAt: string;
  /** Taxonomy version used */
  taxonomyVersion: string;
  /** Transformations applied */
  transformations: string[];
  /** Privacy release gate version */
  gateVersion: string;
  /** Whether differential privacy was applied */
  differentialPrivacyApplied: boolean;
}

// ── Forbidden Fields (compile-time documentation) ──────────────

/**
 * FIELDS THAT MUST NEVER APPEAR IN ANY ANALYTICS TYPE:
 *
 * Operational IDs:
 *   userId, accountId, memberId, householdId, membershipId,
 *   entryId, persistentTaskId, todoId, entryId
 *
 * Identifiers:
 *   email, phone, oauthSubject, ipAddress, deviceId, advertisingId
 *
 * Free text:
 *   label, title, notes, name, displayName, householdName, memberName
 *
 * Precise location:
 *   latitude, longitude, address, zipCode
 *
 * Exact timestamps:
 *   createdAt, occurredAt, completedAt (use GeneralizedTimestamp)
 *
 * Join keys:
 *   Any field that could be used to join back to the operational store
 */
