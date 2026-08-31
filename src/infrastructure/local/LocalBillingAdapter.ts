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
}
