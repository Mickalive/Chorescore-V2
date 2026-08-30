/**
 * ChoreScore V2 — Local Entitlement Adapter
 *
 * Provides entitlement logic for demo/test mode.
 * This is a HONEST adapter: it does not simulate billing or purchases.
 * The demo/test entitlement is explicitly isolated from production.
 */

import { EntitlementGateway, EntitlementFeature, EntitlementState, TrialStatus } from '../../application/ports';

const DEMO_PREMIUM_ENTITLEMENT: EntitlementState = {
  plan: 'standard',
  isTestEntitlement: true,
  billingIsReal: false,
  scoreArchiveAccess: true,
  historyArchiveAccess: true,
  weightingEnabled: true,
  todoPlanningEnabled: true,
  advancedExportEnabled: true,
  memberLimit: 7,
  canCreateAdditionalOwnedHousehold: true,
};

const FREE_ENTITLEMENT: EntitlementState = {
  plan: 'free',
  isTestEntitlement: false,
  billingIsReal: false,
  scoreArchiveAccess: false,
  historyArchiveAccess: false,
  weightingEnabled: false,
  todoPlanningEnabled: false,
  advancedExportEnabled: false,
  memberLimit: 7,
  canCreateAdditionalOwnedHousehold: false,
};

export class LocalEntitlementAdapter implements EntitlementGateway {
  private entitlements: Map<string, EntitlementState> = new Map();
  private mode: 'demo-premium' | 'demo-free' = 'demo-premium';

  constructor() {
    // Default to demo-premium for testing
    this.mode = 'demo-premium';
  }

  async getEntitlement(householdId: string): Promise<EntitlementState> {
    if (this.mode === 'demo-free') {
      return FREE_ENTITLEMENT;
    }
    return this.entitlements.get(householdId) || DEMO_PREMIUM_ENTITLEMENT;
  }

  async canUseFeature(householdId: string, feature: EntitlementFeature): Promise<boolean> {
    const entitlement = await this.getEntitlement(householdId);

    switch (feature) {
      case 'weighting':
        return entitlement.weightingEnabled;
      case 'todo-planning':
        return entitlement.todoPlanningEnabled;
      case 'history-archive':
        return entitlement.historyArchiveAccess;
      case 'score-archive':
        return entitlement.scoreArchiveAccess;
      case 'advanced-export':
        return entitlement.advancedExportEnabled;
      case 'create-household':
        return entitlement.canCreateAdditionalOwnedHousehold;
      default:
        return false;
    }
  }

  async startTrial(_householdId: string): Promise<void> {
    // In demo mode, trial is already active
  }

  async getTrialStatus(_householdId: string): Promise<TrialStatus> {
    if (this.mode === 'demo-free') {
      return {
        isActive: false,
        daysRemaining: 0,
        startedAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
      };
    }

    return {
      isActive: true,
      daysRemaining: 30,
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /** Set entitlement for a specific household (for testing) */
  setEntitlement(householdId: string, entitlement: EntitlementState): void {
    this.entitlements.set(householdId, entitlement);
  }

  /** Switch between demo-premium and demo-free modes */
  setMode(mode: 'demo-premium' | 'demo-free'): void {
    this.mode = mode;
  }

  /** Get current mode */
  getMode(): 'demo-premium' | 'demo-free' {
    return this.mode;
  }
}
