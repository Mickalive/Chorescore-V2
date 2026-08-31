/**
 * ChoreScore V2 — Consent / Purpose / Jurisdiction Policy Service
 *
 * Manages consent records and policy rules per jurisdiction/purpose.
 * The architecture must allow consent/preference handling without
 * presupposing a single legal basis.
 *
 * Features:
 * - Default policies per jurisdiction (EU-GDPR, US-CCPA, CH-DSG, UK-GDPR)
 * - Dynamic policy addition for new jurisdictions
 * - Consent recording, checking, and withdrawal
 * - Retention period enforcement per jurisdiction
 * - Deletion-on-withdrawal support
 * - canProcessData() checks both consent and policy requirements
 */

import {
  ConsentRecord,
  ConsentPolicy,
  DataProcessingPurpose,
  Jurisdiction,
} from './types';

/**
 * Default consent policies per jurisdiction.
 * These are examples — actual policies must be validated by legal
 * before commercial activation.
 */
const DEFAULT_POLICIES: ConsentPolicy[] = [
  {
    policyId: 'eu-gdpr-default',
    jurisdiction: 'EU-GDPR',
    purposeConsentRequired: {
      'product-improvement': false, // Legitimate interest
      'research-statistics': true, // Consent required
      'anonymized-data-product': true, // Consent required
      'synthetic-data-generation': true, // Consent required
      'academic-collaboration': true, // Consent required
    },
    explicitOptInRequired: true,
    retroactiveWithdrawalSupported: true,
    retentionDays: 365 * 3, // 3 years
    deletionOnWithdrawal: true,
  },
  {
    policyId: 'us-ccpa-default',
    jurisdiction: 'US-CCPA',
    purposeConsentRequired: {
      'product-improvement': false,
      'research-statistics': false, // Opt-out model
      'anonymized-data-product': false,
      'synthetic-data-generation': false,
      'academic-collaboration': false,
    },
    explicitOptInRequired: false,
    retroactiveWithdrawalSupported: true,
    retentionDays: 365 * 2, // 2 years
    deletionOnWithdrawal: true,
  },
  {
    policyId: 'ch-dsg-default',
    jurisdiction: 'CH-DSG',
    purposeConsentRequired: {
      'product-improvement': false,
      'research-statistics': true,
      'anonymized-data-product': true,
      'synthetic-data-generation': true,
      'academic-collaboration': true,
    },
    explicitOptInRequired: true,
    retroactiveWithdrawalSupported: true,
    retentionDays: 365 * 3,
    deletionOnWithdrawal: true,
  },
  {
    policyId: 'uk-gdpr-default',
    jurisdiction: 'UK-GDPR',
    purposeConsentRequired: {
      'product-improvement': false,
      'research-statistics': true,
      'anonymized-data-product': true,
      'synthetic-data-generation': true,
      'academic-collaboration': true,
    },
    explicitOptInRequired: true,
    retroactiveWithdrawalSupported: true,
    retentionDays: 365 * 3,
    deletionOnWithdrawal: true,
  },
];

/**
 * ConsentPolicyService — manages consent records and policy rules.
 */
export class ConsentPolicyService {
  private policies: ConsentPolicy[];
  private consentRecords: ConsentRecord[] = [];

  constructor(policies?: ConsentPolicy[]) {
    this.policies = policies ?? [...DEFAULT_POLICIES];
  }

  /**
   * Get the policy for a specific jurisdiction.
   */
  getPolicyForJurisdiction(jurisdiction: Jurisdiction): ConsentPolicy | undefined {
    return this.policies.find(p => p.jurisdiction === jurisdiction);
  }

  /**
   * Get all configured policies.
   */
  getAllPolicies(): ConsentPolicy[] {
    return [...this.policies];
  }

  /**
   * Add or update a consent policy for a jurisdiction.
   * Used for dynamic policy management (e.g., adding new jurisdictions).
   */
  setPolicy(policy: ConsentPolicy): void {
    const existingIndex = this.policies.findIndex(p => p.jurisdiction === policy.jurisdiction);
    if (existingIndex >= 0) {
      this.policies[existingIndex] = policy;
    } else {
      this.policies.push(policy);
    }
  }

  /**
   * Check if consent is required for a purpose in a jurisdiction.
   */
  isConsentRequired(jurisdiction: Jurisdiction, purpose: DataProcessingPurpose): boolean {
    const policy = this.getPolicyForJurisdiction(jurisdiction);
    if (!policy) return true; // Default: require consent if no policy found
    return policy.purposeConsentRequired[purpose] ?? true;
  }

  /**
   * Record a consent decision.
   */
  recordConsent(record: Omit<ConsentRecord, 'timestamp'>): ConsentRecord {
    const fullRecord: ConsentRecord = {
      ...record,
      timestamp: new Date().toISOString(),
    };
    this.consentRecords.push(fullRecord);
    return fullRecord;
  }

  /**
   * Check if a user has granted consent for a purpose.
   * Uses the most recent record by insertion order when timestamps are equal.
   */
  hasConsent(userId: string, purpose: DataProcessingPurpose): boolean {
    // Find the latest consent record for this user and purpose
    // Filter in reverse order to get the most recently added record first
    const relevantRecords = this.consentRecords
      .filter(r => r.userId === userId && r.purpose === purpose);

    if (relevantRecords.length === 0) return false;
    // Last element is most recent (records are appended chronologically)
    return relevantRecords[relevantRecords.length - 1].granted;
  }

  /**
   * Withdraw consent for a purpose.
   */
  withdrawConsent(userId: string, purpose: DataProcessingPurpose, jurisdiction: Jurisdiction): ConsentRecord {
    return this.recordConsent({
      userId,
      purpose,
      granted: false,
      jurisdiction,
      noticeVersion: '1.0.0',
      withdrawable: true,
    });
  }

  /**
   * Get all consent records for a user.
   */
  getUserConsentRecords(userId: string): ConsentRecord[] {
    return this.consentRecords.filter(r => r.userId === userId);
  }

  /**
   * Check if data can be processed for a purpose given consent and policy.
   */
  canProcessData(
    userId: string,
    jurisdiction: Jurisdiction,
    purpose: DataProcessingPurpose
  ): boolean {
    const consentRequired = this.isConsentRequired(jurisdiction, purpose);
    if (!consentRequired) return true; // Not required → allowed
    return this.hasConsent(userId, purpose);
  }

  /**
   * Get data retention period for a jurisdiction.
   */
  getRetentionDays(jurisdiction: Jurisdiction): number {
    const policy = this.getPolicyForJurisdiction(jurisdiction);
    return policy?.retentionDays ?? 365 * 3; // Default 3 years
  }

  /**
   * Check if deletion is required on consent withdrawal.
   */
  isDeletionRequiredOnWithdrawal(jurisdiction: Jurisdiction): boolean {
    const policy = this.getPolicyForJurisdiction(jurisdiction);
    return policy?.deletionOnWithdrawal ?? true;
  }

  /**
   * Check if consent records have exceeded the retention period.
   * Returns records that should be purged.
   */
  getExpiredRecords(jurisdiction: Jurisdiction): ConsentRecord[] {
    const retentionDays = this.getRetentionDays(jurisdiction);
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    return this.consentRecords.filter(r => {
      if (r.jurisdiction !== jurisdiction) return false;
      return new Date(r.timestamp).getTime() < cutoff;
    });
  }

  /**
   * Purge expired consent records for a jurisdiction.
   */
  purgeExpiredRecords(jurisdiction: Jurisdiction): number {
    const expired = this.getExpiredRecords(jurisdiction);
    const expiredIds = new Set(expired.map(r => r.timestamp));
    this.consentRecords = this.consentRecords.filter(r => !expiredIds.has(r.timestamp));
    return expired.length;
  }
}

/**
 * Create a default consent policy service.
 */
export function createDefaultConsentPolicy(): ConsentPolicyService {
  return new ConsentPolicyService();
}
