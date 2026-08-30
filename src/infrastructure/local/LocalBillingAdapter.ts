/**
 * ChoreScore V2 — Local Billing Adapter
 *
 * HONEST adapter: billing is not configured in development.
 * All purchase operations return explicitly unavailable.
 */

import { BillingGateway, SubscriptionStatus, PurchaseResult } from '../../application/ports';

export class LocalBillingAdapter implements BillingGateway {
  isAvailable(): boolean {
    // Billing is not configured in development
    return false;
  }

  async getSubscriptionStatus(_householdId: string): Promise<SubscriptionStatus | null> {
    // No real billing configured
    return null;
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
}
