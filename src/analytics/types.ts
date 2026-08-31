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

// ── Query Budget / Rate Limit ──────────────────────────────────

/**
 * Query budget configuration for the Research Analytics API.
 * Prevents abuse and reconstruction attacks via flexible queries.
 */
export interface QueryBudgetConfig {
  /** Maximum queries per minute per API key */
  rateLimitPerMinute: number;
  /** Maximum queries per day per API key */
  rateLimitPerDay: number;
  /** Maximum dimensions per query (prevents high-cardinality attacks) */
  maxDimensionsPerQuery: number;
  /** Maximum time range span in months per query */
  maxTimeRangeMonths: number;
  /** Minimum cohort size enforced per query result */
  minCohortSize: number;
  /** Whether to apply differential privacy to query results */
  differentialPrivacyEnabled: boolean;
}

// ── Differential Privacy ───────────────────────────────────────

/**
 * Differential privacy configuration.
 * Provides mathematical privacy guarantees for query results.
 */
export interface DifferentialPrivacyConfig {
  /** Whether differential privacy is enabled */
  enabled: boolean;
  /** Privacy budget (epsilon) — lower = more privacy, less accuracy */
  epsilon: number;
  /** Delta parameter — probability of privacy breach */
  delta: number;
  /** Mechanism for noise addition */
  mechanism: 'laplace' | 'gaussian';
  /** Maximum number of queries before budget exhaustion */
  maxQueries: number;
  /** Current remaining privacy budget */
  remainingBudget: number;
}

// ── Consent / Purpose / Jurisdiction ───────────────────────────

/**
 * Purpose of data collection — defines why data is processed.
 */
export type DataProcessingPurpose =
  | 'product-improvement'
  | 'research-statistics'
  | 'anonymized-data-product'
  | 'synthetic-data-generation'
  | 'academic-collaboration';

/**
 * Jurisdiction determines applicable data protection law.
 */
export type Jurisdiction =
  | 'EU-GDPR'
  | 'US-CCPA'
  | 'US-other'
  | 'UK-GDPR'
  | 'CH-DSG'
  | 'other';

/**
 * Consent record — tracks user consent for data processing purposes.
 */
export interface ConsentRecord {
  /** User ID (operational — never exported to analytics) */
  userId: string;
  /** Purpose of data processing */
  purpose: DataProcessingPurpose;
  /** Whether consent was given */
  granted: boolean;
  /** Timestamp of consent record */
  timestamp: string;
  /** Jurisdiction under which consent was obtained */
  jurisdiction: Jurisdiction;
  /** Version of the privacy notice presented */
  noticeVersion: string;
  /** Whether consent can be withdrawn */
  withdrawable: boolean;
}

/**
 * Consent policy — rules for consent handling per jurisdiction/purpose.
 */
export interface ConsentPolicy {
  /** Policy identifier */
  policyId: string;
  /** Jurisdiction this policy applies to */
  jurisdiction: Jurisdiction;
  /** Purposes and their consent requirements */
  purposeConsentRequired: Record<DataProcessingPurpose, boolean>;
  /** Whether explicit opt-in is required */
  explicitOptInRequired: boolean;
  /** Whether consent can be withdrawn retroactively */
  retroactiveWithdrawalSupported: boolean;
  /** Data retention period in days (0 = indefinite) */
  retentionDays: number;
  /** Whether data must be deleted after consent withdrawal */
  deletionOnWithdrawal: boolean;
}

// ── Buyer Contracts ────────────────────────────────────────────

/**
 * Buyer contract — defines terms under which data products are sold.
 * Prohibits re-identification and unauthorized redistribution.
 */
export interface BuyerContract {
  /** Contract identifier */
  contractId: string;
  /** Buyer organization name */
  buyerName: string;
  /** Buyer organization type */
  buyerType: 'university' | 'research-institute' | 'government' | 'ngo' | 'other';
  /** Data product(s) covered */
  productIds: string[];
  /** Permitted purposes */
  permittedPurposes: DataProcessingPurpose[];
  /** Jurisdiction of the buyer */
  buyerJurisdiction: Jurisdiction;
  /** Whether re-identification attempts are prohibited */
  reIdentificationProhibited: boolean;
  /** Whether redistribution is prohibited */
  redistributionProhibited: boolean;
  /** Whether commercial use beyond research is prohibited */
  commercialUseProhibited: boolean;
  /** Contract start date */
  startDate: string;
  /** Contract end date (null = indefinite) */
  endDate: string | null;
  /** Audit rights — buyer must allow audits */
  auditRightsGranted: boolean;
  /** Whether buyer must report re-identification attempts */
  reIdentificationReportingRequired: boolean;
}

// ── Audit / Export Log ─────────────────────────────────────────

/**
 * Audit log entry for data product releases.
 * Every external release is logged for compliance and governance.
 */
export interface AuditExportLogEntry {
  /** Log entry identifier */
  logId: string;
  /** Data product released */
  productId: string;
  /** Product version released */
  productVersion: string;
  /** Buyer who received the data */
  buyerContractId: string;
  /** Timestamp of release */
  releasedAt: string;
  /** Privacy release gate result at time of release */
  gateResult: {
    approved: boolean;
    violationCount: number;
    riskScore: number;
  };
  /** Provenance of the data product */
  provenance: DataProductProvenance;
  /** Whether differential privacy was applied */
  differentialPrivacyApplied: boolean;
  /** Household count in the release */
  householdCount: number;
  /** Time range of data in the release */
  timeRange: { fromMonth: string; toMonth: string };
  /** Auditor who approved the release (human or system) */
  approvedBy: string;
  /** Notes (internal, never exported) */
  internalNotes: string;
}

/**
 * Audit log for tracking all data product releases.
 */
export interface AuditExportLog {
  /** Add a log entry */
  logEntry(entry: Omit<AuditExportLogEntry, 'logId'>): AuditExportLogEntry;
  /** Get all log entries */
  getEntries(): AuditExportLogEntry[];
  /** Get entries for a specific product */
  getProductEntries(productId: string): AuditExportLogEntry[];
  /** Get entries for a specific buyer */
  getBuyerEntries(buyerContractId: string): AuditExportLogEntry[];
}
