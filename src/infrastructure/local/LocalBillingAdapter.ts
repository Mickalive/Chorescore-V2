/**
 * ChoreScore V2 — Local Billing Adapter
 *
 * HONEST adapter: billing is not configured in development.
 * All purchase operations return explicitly unavailable.
 *
 * Provider-agnostic: the BillingGateway port abstracts the actual
 * payment provider (Stripe, StoreKit, Google Play Billing).
 * In production, adapters would handle actual payment processing.
 *
 * Entitlement restoration: when a purchase is restored, the
 * household's entitlement state is updated to reflect the
 * purchased plan without destroying any existing data.
 *
 * Per-household billing: billing is attached to the household,
 * not to a global account subscription. Each household has its
 * own plan/billing state, owner/payor, and rights.
 *
 * Restoration logic:
 * 1. On app start, call restorePurchases() to re-sync with
 *    the payment provider.
 * 2. For each household with an active subscription, update
 *    the entitlement state.
 * 3. No data is destroyed on downgrade; entitlement controls
 *    which features are visible/usable.
 * 4. After restoration, Premium features become immediately
 *    available (weighting, archive, To-do, etc.)
 */

import { BillingGateway, SubscriptionStatus, PurchaseResult } from '../../application/ports';

export class LocalBillingAdapter implements BillingGateway {
  private subscriptions: Map<string, SubscriptionStatus> = new Map();

  isAvailable(): boolean {
    // Billing is not configured in development
    return false;
  }

  async getSubscriptionStatus(householdId: string): Promise<SubscriptionStatus | null> {
    return this.subscriptions.get(householdId) ?? null;
  }

  async purchase(_householdId: string, _plan: 'standard' | 'pro'): Promise<PurchaseResult> {
    return {
      success: false,
      error: 'Billing is not configured. This is a demo/test environment.',
    };
  }

  async restorePurchases(): Promise<PurchaseResult> {
    return {
      success: false,
      error: 'Billing is not configured. This is a demo/test environment.',
    };
  }

  /**
   * Restore entitlements for a household from stored subscriptions.
   * In production, this would verify with the payment provider
   * and restore the household's plan without destroying data.
   *
   * The restoration process:
   * 1. Check local subscription store for active subscriptions
   * 2. Verify subscription validity (not expired)
   * 3. Update entitlement state to reflect restored plan
   * 4. Return restoration result with plan details
   *
   * Key invariant: NO data is destroyed during restoration.
   * CompletedEntries, PersistentTasks, TodoItems, and all
   * historical data remain intact regardless of plan changes.
   */
  async restoreEntitlements(householdId: string): Promise<{
    restored: boolean;
    plan: 'standard' | 'pro' | null;
    expiresAt: string | null;
  }> {
    const subscription = this.subscriptions.get(householdId);
    if (!subscription || !subscription.isActive) {
      return { restored: false, plan: null, expiresAt: null };
    }

    // Check if subscription is expired
    if (new Date(subscription.expiresAt).getTime() < Date.now()) {
      this.subscriptions.delete(householdId);
      return { restored: false, plan: null, expiresAt: null };
    }

    return {
      restored: true,
      plan: subscription.plan,
      expiresAt: subscription.expiresAt,
    };
  }

  /** Set subscription for a household (for testing) */
  setSubscription(householdId: string, subscription: SubscriptionStatus): void {
    this.subscriptions.set(householdId, subscription);
  }

  /** Clear subscription for a household (for testing) */
  clearSubscription(householdId: string): void {
    this.subscriptions.delete(householdId);
  }

  /**
   * Simulate entitlement restoration after purchase restore.
   * In production, this would verify with the payment provider
   * and restore the household's plan without destroying data.
   */
  async simulateEntitlementRestoration(
    householdId: string,
    plan: 'standard' | 'pro'
  ): Promise<SubscriptionStatus> {
    const subscription: SubscriptionStatus = {
      householdId,
      plan,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    this.subscriptions.set(householdId, subscription);
    return subscription;
  }

  /** Get all active subscriptions (for multi-household billing audit) */
  getActiveSubscriptions(): SubscriptionStatus[] {
    const now = Date.now();
    return Array.from(this.subscriptions.values()).filter(
      s => s.isActive && new Date(s.expiresAt).getTime() > now
    );
  }
}
