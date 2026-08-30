/**
 * ChoreScore V2 — Local Entitlement Adapter
 *
 * Provides entitlement logic for demo/test mode.
 * This is a HONEST adapter: it does not simulate billing or purchases.
 * The demo/test entitlement is explicitly isolated from production.
 *
 * Account-level entitlements resolve the "one free household" rule
 * at the account level, using AccountRepository.ownedFreeHouseholdId.
 */

import {
  EntitlementGateway,
  EntitlementFeature,
  EntitlementState,
  TrialStatus,
  AccountEntitlementState,
} from '../../application/ports';
import { PRICING } from '../../domain/entities';
import { AccountRepository } from '../../application/use-cases/ChoreScoreApp';

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
  private accountRepository: AccountRepository | null = null;

  constructor(accountRepository?: AccountRepository) {
    // Default to demo-premium for testing
    this.mode = 'demo-premium';
    this.accountRepository = accountRepository ?? null;
  }

  /** Inject account repository (allows late binding for testing) */
  setAccountRepository(repo: AccountRepository): void {
    this.accountRepository = repo;
  }

  async getEntitlement(householdId: string): Promise<EntitlementState> {
    if (this.mode === 'demo-free') {
      return FREE_ENTITLEMENT;
    }

    const stored = this.entitlements.get(householdId);
    if (!stored) {
      return DEMO_PREMIUM_ENTITLEMENT;
    }

    // Wire trial expiry: if the entitlement is a trial and trialEndsAt is in the past,
    // return Free entitlement without destroying data.
    if (stored.plan === 'trial' && stored.trialEndsAt) {
      const trialEndDate = new Date(stored.trialEndsAt);
      if (trialEndDate.getTime() < Date.now()) {
        return FREE_ENTITLEMENT;
      }
    }

    return stored;
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
   * Resolves via AccountRepository.ownedFreeHouseholdId,
   * consistent with createHousehold's account-level check.
   */
  async getAccountEntitlement(userId: string): Promise<AccountEntitlementState> {
    if (this.mode === 'demo-premium') {
      // In demo-premium, still consult AccountRepository for accurate state
      // The demo-premium mode bypass is only for createHousehold entitlement checks
      const account = this.accountRepository
        ? await this.accountRepository.getByUser(userId)
        : null;

      const ownedFreeHouseholdId = account?.ownedFreeHouseholdId ?? null;

      return {
        canCreateFreeHousehold: ownedFreeHouseholdId === null,
        ownedFreeHouseholdId,
        hasActiveTrial: true,
        ownedHouseholdCount: ownedFreeHouseholdId !== null ? 1 : 0,
      };
    }

    // In demo-free, resolve via AccountRepository — never via global entitlements map scan
    const account = this.accountRepository
      ? await this.accountRepository.getByUser(userId)
      : null;

    const ownedFreeHouseholdId = account?.ownedFreeHouseholdId ?? null;

    return {
      canCreateFreeHousehold: ownedFreeHouseholdId === null,
      ownedFreeHouseholdId,
      hasActiveTrial: false,
      ownedHouseholdCount: ownedFreeHouseholdId !== null ? 1 : 0,
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
