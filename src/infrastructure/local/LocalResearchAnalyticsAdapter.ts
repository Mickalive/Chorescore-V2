/**
 * ChoreScore V2 — Local Research Analytics Adapter
 *
 * This is a SECONDARY, DISABLEABLE output point.
 * Disabling it MUST NOT break any product functionality.
 *
 * In development, this adapter simply logs facts to console.
 * In production, it would send minimized facts to the analytics pipeline.
 *
 * IMPORTANT: This adapter NEVER includes:
 * - userId, householdId, memberId (operational IDs)
 * - email, phone, OAuth subject
 * - IP, device ID, advertising ID
 * - member names or household names
 * - free text (labels, notes)
 * - precise GPS/address
 * - exact timestamps when coarser granularity suffices
 */

import { ResearchAnalyticsGateway, AnalyticsFact } from '../../application/ports';

export class LocalResearchAnalyticsAdapter implements ResearchAnalyticsGateway {
  private enabled: boolean = false;
  private facts: AnalyticsFact[] = [];

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.facts = [];
    }
  }

  emitFact(fact: AnalyticsFact): void {
    if (!this.enabled) return;

    // Store locally for testing/verification
    this.facts.push(fact);

    // In production, this would send to the analytics pipeline
    // with proper privacy transforms applied
  }

  isAvailable(): boolean {
    // Analytics is available but disabled by default
    return true;
  }

  /** Get all emitted facts (for testing) */
  getFacts(): AnalyticsFact[] {
    return [...this.facts];
  }

  /** Clear all facts (for testing) */
  clearFacts(): void {
    this.facts = [];
  }
}
