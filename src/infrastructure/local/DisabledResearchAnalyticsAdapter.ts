/**
 * ChoreScore V2 — Disabled Research Analytics Adapter
 *
 * A no-op adapter that demonstrates analytics can be completely
 * disabled without breaking any product functionality.
 *
 * When analytics is disabled:
 * - emitFact() is a no-op (never throws)
 * - isEnabled() returns false
 * - isAvailable() returns true (the adapter exists but is off)
 * - All product functions continue normally
 *
 * This adapter is used in tests to prove the disableability contract:
 * disabling analytics produces zero test failures and identical
 * product behavior.
 */

import { ResearchAnalyticsGateway, AnalyticsFact } from '../../application/ports';

export class DisabledResearchAnalyticsAdapter implements ResearchAnalyticsGateway {
  isEnabled(): boolean {
    return false;
  }

  setEnabled(_enabled: boolean): void {
    // No-op — this adapter is permanently disabled
  }

  emitFact(_fact: AnalyticsFact): void {
    // No-op — facts are silently discarded
  }

  isAvailable(): boolean {
    // The adapter exists and is available, but disabled
    return true;
  }
}
