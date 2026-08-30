/**
 * ChoreScore V2 — Local Entitlement Adapter
 *
 * Provides entitlement logic for demo/test mode.
 * This is a HONEST adapter: it does not simulate billing or purchases.
 * The demo/test entitlement is explicitly isolated from production.
 *
 * Account-level entitlements resolve the "one free household" rule
 * at the account level, not against a fake household ID.
 */

import {
  EntitlementGateway,
  EntitlementFeature,
  EntitlementState,
  TrialStatus,
  AccountEntitlementState,
} from '../../application/ports';
import { PRICING } from '../../domain/entities';

const DEMO_PREMIUM_ENTITLEMENT: EntitlementState = {
  plan: 'standard',
  isTestEntitlement: true,
  billingIsReal: false,
  scoreArchiveAccess: true,
  historyArchiveAccess: true,
  weightingEnabled: true,
  todoPlanningEnabled: true,
  advancedExportEnabled: true,
  memberLimit: PRICING.STANDARD_MEMBER_LIMIT,
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
  memberLimit: PRICING.STANDARD_MEMBER_LIMIT,
  canCreateAdditionalOwnedHousehold: false,
};

export class LocalEntitlementAdapter implements EntitlementGateway {
  private entitlements: Map<string, EntitlementState> = new Map();
  private trialStarts: Map<string, Date> = new Map();
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
        // In demo mode, always allow creation for testing
        if (this.mode === 'demo-premium') return true;
        // In free mode, account-level check is needed
        return entitlement.canCreateAdditionalOwnedHousehold;
      default:
        return false;
    }
  }

  async startTrial(householdId: string): Promise<void> {
    // Start a 30-day trial for the household
    this.trialStarts.set(householdId, new Date());
    this.entitlements.set(householdId, {
      ...DEMO_PREMIUM_ENTITLEMENT,
      plan: 'trial',
      trialEndsAt: new Date(Date.now() + PRICING.TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async getTrialStatus(householdId: string): Promise<TrialStatus> {
    if (this.mode === 'demo-free') {
      return {
        isActive: false,
        daysRemaining: 0,
        startedAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
      };
    }

    const trialStart = this.trialStarts.get(householdId);
    if (!trialStart) {
      return {
        isActive: false,
        daysRemaining: 0,
        startedAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
      };
    }

    const endsAt = new Date(trialStart.getTime() + PRICING.TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const isActive = now < endsAt;
    const daysRemaining = isActive
      ? Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    return {
      isActive,
      daysRemaining,
      startedAt: trialStart.toISOString(),
      endsAt: endsAt.toISOString(),
    };
  }

  /**
   * Get account-level entitlement for household creation.
   * The "one free household" rule is resolved at the account level.
   */
  async getAccountEntitlement(userId: string): Promise<AccountEntitlementState> {
    if (this.mode === 'demo-premium') {
      // In demo-premium, always allow creation
      return {
        canCreateFreeHousehold: true,
        ownedFreeHouseholdId: null,
        hasActiveTrial: true,
        ownedHouseholdCount: 0,
      };
    }

    // In demo-free, check if user already owns a free household
    // This is a simplified check — in production, this would query the account repository
    const existingEntitlement = Array.from(this.entitlements.entries()).find(
      ([_, e]) => e.plan === 'free'
    );

    return {
      canCreateFreeHousehold: !existingEntitlement,
      ownedFreeHouseholdId: existingEntitlement?.[0] ?? null,
      hasActiveTrial: false,
      ownedHouseholdCount: existingEntitlement ? 1 : 0,
    };
  }

  /**
   * Resolve effective plan based on member count.
   * Pro is required at 8+ members, Standard for 7 or fewer.
   */
  async resolveEffectivePlan(
    _householdId: string,
    memberCount: number
  ): Promise<'standard' | 'pro'> {
    return memberCount >= PRICING.PRO_MEMBER_THRESHOLD ? 'pro' : 'standard';
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
