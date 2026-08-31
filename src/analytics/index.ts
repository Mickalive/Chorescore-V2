/**
 * ChoreScore V2 — Analytics Privacy Architecture
 *
 * This module implements the Research Analytics Plane for ChoreScore V2.
 * It provides the privacy-first boundary between the operational store
 * (which contains user data, household data, free text, and operational IDs)
 * and the Research Analytics Store (which contains only anonymous statistical facts).
 *
 * Architecture:
 *   Operational Store -> PrivacyTransformPipeline -> PrivacyReleaseGate -> Research Analytics Store
 *
 * Key invariants:
 * - The Research Analytics Store contains ZERO operational IDs
 * - The Research Analytics Store contains ZERO free text
 * - The Research Analytics Store contains ZERO join keys to the operational store
 * - All external outputs must pass through PrivacyReleaseGate
 * - Disabling the ResearchAnalyticsGateway breaks ZERO product functions
 * - The domain (CompletedEntry, Score, TodoItem) never depends on analytics
 */

export {
  // Types
  TaxonomyCategoryId,
  TaxonomyVersion,
  GeneralizedTimestamp,
  DemographicSnapshot,
  AnonymousTaskFact,
  AnonymousHouseholdAggregate,
  AnonymousCohortAggregate,
  ResearchDataProduct,
  DataProductProvenance,
} from './types';

export {
  // Taxonomy
  TaskTaxonomyService,
  createDefaultTaxonomy,
} from './taxonomy';

export {
  // Pipeline
  PrivacyTransformPipeline,
  OperationalFact,
  TransformResult,
  PipelineConfig,
  createDefaultPipeline,
} from './pipeline';

export {
  // Gate
  PrivacyReleaseGate,
  GateCheckResult,
  GateViolation,
  GateConfig,
  createDefaultGate,
} from './gate';
