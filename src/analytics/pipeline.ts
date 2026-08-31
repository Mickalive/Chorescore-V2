/**
 * ChoreScore V2 — PrivacyTransformPipeline
 *
 * Transforms operational facts into analytics-safe records.
 * This is the core of the privacy boundary between the operational
 * store and the Research Analytics Store.
 *
 * Pipeline stages:
 * 1. Strip all operational IDs (userId, householdId, memberId, etc.)
 * 2. Replace free text with taxonomy references
 * 3. Generalize timestamps to coarse time dimensions
 * 4. Generalize demographics (if present, never inferred)
 * 5. Suppress rare cells / small cohorts
 * 6. Emit only anonymous records to the analytics store
 *
 * CRITICAL: This pipeline MUST reject any record that still contains
 * operational IDs or free text after transformation. The pipeline is
 * the last line of defense before the Research Analytics Store.
 */

import {
  AnonymousTaskFact,
  GeneralizedTimestamp,
  TaxonomyCategoryId,
  TaxonomyVersion,
} from './types';
import { TaskTaxonomyService } from './taxonomy';

/**
 * Input fact from the operational domain.
 * This is what ChoreScoreApp emits via ResearchAnalyticsGateway.
 * It contains minimized statistical data, never operational IDs.
 */
export interface OperationalFact {
  type: string;
  /** Statistical data — must NOT contain operational IDs or free text */
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Transformation result — either a valid anonymous fact or a rejection.
 */
export interface TransformResult {
  /** Whether the transformation succeeded */
  success: boolean;
  /** The transformed anonymous fact (if success) */
  fact?: AnonymousTaskFact;
  /** Rejection reason (if !success) */
  rejectionReason?: string;
}

/**
 * Pipeline configuration.
 */
export interface PipelineConfig {
  /** Minimum cohort size for inclusion */
  minCohortSize: number;
  /** Whether to suppress rare cells */
  suppressRareCells: boolean;
  /** Pipeline version for provenance */
  version: string;
}

const DEFAULT_CONFIG: PipelineConfig = {
  minCohortSize: 5,
  suppressRareCells: true,
  version: '1.0.0',
};

/**
 * PrivacyTransformPipeline — transforms operational facts into
 * anonymous analytics records.
 *
 * The pipeline is stateless and deterministic. Same input → same output.
 */
export class PrivacyTransformPipeline {
  private readonly taxonomyService: TaskTaxonomyService;
  private readonly config: PipelineConfig;

  constructor(config?: Partial<PipelineConfig>, taxonomy?: TaxonomyVersion) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.taxonomyService = new TaskTaxonomyService(taxonomy);
  }

  /**
   * Get the pipeline configuration (for audit).
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Get the taxonomy service version.
   */
  getTaxonomyVersion(): string {
    return this.taxonomyService.getVersion();
  }

  /**
   * Generalize an ISO timestamp to coarse time dimensions.
   * Never preserves exact time — only week/month/day/hour-bucket.
   */
  generalizeTimestamp(isoTimestamp: string): GeneralizedTimestamp {
    const date = new Date(isoTimestamp);

    // ISO week calculation
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNumber =
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
      );
    const isoWeekStart = new Date(date);
    isoWeekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const isoWeek = isoWeekStart.toISOString().split('T')[0];

    // Month
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // Day of week (1=Monday, 7=Sunday)
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();

    // Hour bucket (round down to nearest 4-hour block, or -1 for midnight)
    const hour = date.getHours();
    const hourBucket = Math.floor(hour / 4) * 4;

    return { isoWeek, month, dayOfWeek, hourBucket };
  }

  /**
   * Validate that a data record contains no operational IDs.
   * Returns null if clean, or a rejection reason if contamination found.
   */
  private validateNoOperationalIds(data: Record<string, unknown>): string | null {
    const forbiddenFields = [
      'userId', 'accountId', 'memberId', 'householdId',
      'membershipId', 'entryId', 'todoId', 'persistentTaskId',
      'email', 'phone', 'oauthSubject',
      'ipAddress', 'deviceId', 'advertisingId',
      'name', 'displayName', 'householdName', 'memberName',
      'label', 'title', 'notes',
      'latitude', 'longitude', 'address', 'zipCode',
      'createdBy', 'modifiedBy', 'performedByMemberId',
      'beneficiaryMemberIds',
    ];

    for (const field of forbiddenFields) {
      if (field in data) {
        return `Operational/free-text field '${field}' detected in input data`;
      }
    }

    return null;
  }

  /**
   * Validate that a data record contains no free text.
   */
  private validateNoFreeText(data: Record<string, unknown>): string | null {
    const textFields = ['label', 'title', 'notes', 'name', 'displayName'];
    for (const field of textFields) {
      if (typeof data[field] === 'string' && (data[field] as string).length > 0) {
        return `Free text field '${field}' detected in input data`;
      }
    }
    return null;
  }

  /**
   * Transform an operational fact into an anonymous analytics record.
   *
   * The input is expected to be a minimized fact from ChoreScoreApp
   * (no operational IDs). The pipeline double-checks and strips anything
   * that should never have been there.
   *
   * @param fact - The operational fact to transform
   * @returns TransformResult with either the anonymous fact or rejection
   */
  transform(fact: OperationalFact): TransformResult {
    // Stage 1: Validate input contains no operational IDs
    const idCheck = this.validateNoOperationalIds(fact.data);
    if (idCheck) {
      return { success: false, rejectionReason: idCheck };
    }

    // Stage 2: Validate no free text
    const textCheck = this.validateNoFreeText(fact.data);
    if (textCheck) {
      return { success: false, rejectionReason: textCheck };
    }

    // Stage 3: Transform based on fact type
    if (fact.type === 'entry_created') {
      return this.transformEntryCreated(fact);
    }

    // Unknown fact type — reject
    return {
      success: false,
      rejectionReason: `Unknown fact type '${fact.type}' — only 'entry_created' is supported`,
    };
  }

  /**
   * Transform an entry_created fact into an AnonymousTaskFact.
   */
  private transformEntryCreated(fact: OperationalFact): TransformResult {
    const data = fact.data;

    // Extract required fields with type safety
    const durationMinutes = typeof data.durationMinutes === 'number' ? data.durationMinutes : null;
    const beneficiaryCount = typeof data.beneficiaryCount === 'number' ? data.beneficiaryCount : null;
    const hasPersistentTask = typeof data.hasPersistentTask === 'boolean' ? data.hasPersistentTask : false;
    const weight = typeof data.weight === 'number' ? data.weight : 1.0;
    const taxonomyCategoryId = typeof data.taxonomyCategoryId === 'string'
      ? (data.taxonomyCategoryId as TaxonomyCategoryId)
      : null;

    if (durationMinutes === null || beneficiaryCount === null) {
      return {
        success: false,
        rejectionReason: 'Missing required fields: durationMinutes, beneficiaryCount',
      };
    }

    if (taxonomyCategoryId === null) {
      return {
        success: false,
        rejectionReason: 'Missing taxonomyCategoryId — label must be mapped to taxonomy before pipeline',
      };
    }

    // Validate taxonomy category is valid
    const validCategories = this.taxonomyService.getValidCategories();
    if (!validCategories.includes(taxonomyCategoryId)) {
      return {
        success: false,
        rejectionReason: `Invalid taxonomy category '${taxonomyCategoryId}'`,
      };
    }

    // Generalize timestamp
    const timestamp = this.generalizeTimestamp(fact.timestamp);

    // Build anonymous fact
    const anonymousFact: AnonymousTaskFact = {
      taxonomyCategoryId,
      taxonomyVersion: this.taxonomyService.getVersion(),
      durationMinutes,
      beneficiaryCount,
      hasPersistentTask,
      weight,
      timestamp,
    };

    return { success: true, fact: anonymousFact };
  }

  /**
   * Transform a batch of facts.
   * Returns only successfully transformed facts.
   */
  transformBatch(facts: OperationalFact[]): {
    accepted: AnonymousTaskFact[];
    rejected: Array<{ fact: OperationalFact; reason: string }>;
  } {
    const accepted: AnonymousTaskFact[] = [];
    const rejected: Array<{ fact: OperationalFact; reason: string }> = [];

    for (const fact of facts) {
      const result = this.transform(fact);
      if (result.success && result.fact) {
        accepted.push(result.fact);
      } else {
        rejected.push({ fact, reason: result.rejectionReason || 'Unknown error' });
      }
    }

    return { accepted, rejected };
  }

  /**
   * Check if a batch of facts would be suppressed due to rare cells.
   * Used for pre-validation before store insertion.
   */
  checkRareCells(facts: AnonymousTaskFact[]): {
    included: AnonymousTaskFact[];
    suppressed: AnonymousTaskFact[];
  } {
    if (!this.config.suppressRareCells) {
      return { included: facts, suppressed: [] };
    }

    // Group by taxonomy category and month
    const groups = new Map<string, AnonymousTaskFact[]>();
    for (const fact of facts) {
      const key = `${fact.taxonomyCategoryId}:${fact.timestamp.month}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(fact);
    }

    const included: AnonymousTaskFact[] = [];
    const suppressed: AnonymousTaskFact[] = [];

    for (const [, group] of groups) {
      if (group.length >= this.config.minCohortSize) {
        included.push(...group);
      } else {
        suppressed.push(...group);
      }
    }

    return { included, suppressed };
  }
}

/**
 * Create a PrivacyTransformPipeline with default configuration.
 */
export function createDefaultPipeline(): PrivacyTransformPipeline {
  return new PrivacyTransformPipeline();
}
