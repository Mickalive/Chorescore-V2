/**
 * ChoreScore V2 — Tenant Isolation & Encryption Documentation
 *
 * This module documents the security architecture for the operational backend.
 * Every data access is scoped by householdId (the tenant boundary).
 *
 * ══════════════════════════════════════════════════════════════════
 * TENANT ISOLATION MODEL
 * ══════════════════════════════════════════════════════════════════
 *
 * ChoreScore uses householdId as the tenant boundary.
 * All data operations MUST be scoped by householdId:
 *
 * 1. Storage isolation:
 *    - Each household's data is stored in a separate namespace/partition.
 *    - No query may return data from multiple households.
 *    - Cross-tenant joins are prohibited.
 *
 * 2. Access control:
 *    - AuthZ is enforced server-side on every request.
 *    - The authenticated user's membership determines household access.
 *    - Role-based permissions (OWNER > PAYER > ADMIN > MEMBER)
 *      are resolved per-household, never globally.
 *
 * 3. Encryption:
 *    - In transit: TLS 1.2+ for all network communication.
 *    - At rest: AES-256 for stored data on server,
 *      Keychain/EncryptedSharedPreferences on device.
 *    - Encryption keys are rotated periodically and stored
 *      in a dedicated key management service.
 *
 * 4. Audit:
 *    - All data access is logged with: userId, householdId,
 *      action, timestamp, and result.
 *    - Logs are immutable and retained for compliance.
 *
 * 5. The operational store is NEVER sold or exposed to data buyers.
 *    It is strictly for product operation (sync, billing, auth).
 *
 * ══════════════════════════════════════════════════════════════════
 * SEPARATION: OPERATIONAL vs ANALYTICS
 * ══════════════════════════════════════════════════════════════════
 *
 * The operational store CANNOT be anonymized because it must
 * return correct data to the correct households.
 *
 * The Research Analytics Store is derived via PrivacyTransformPipeline
 * and contains ZERO operational IDs, ZERO free text, ZERO join keys.
 *
 * The two stores are:
 * - Physically separated (different storage backends)
 * - Logically separated (different schemas, different access controls)
 * - Never cross-referenced in any query or export
 *
 * ══════════════════════════════════════════════════════════════════
 * DATA FLOW
 * ══════════════════════════════════════════════════════════════════
 *
 * Client Device → AuthGW → API Gateway → AuthZ middleware
 *                                        ↓
 *                                  Tenant-scoped DB query
 *                                        ↓
 *                                  Response (scoped to householdId)
 *
 * Analytics (optional, disableable):
 * Operational Store → PrivacyTransformPipeline → Safe Aggregation
 *                                                → PrivacyReleaseGate
 *                                                → Research Analytics Store
 */

import { TenantIsolationConfig } from '../../application/ports';

/**
 * Default tenant isolation configuration for ChoreScore.
 */
const DEFAULT_TENANT_CONFIG: TenantIsolationConfig = {
  householdId: '', // Must be set per-tenant
  encryptionEnabled: true,
  encryptionAlgorithm: 'AES-256-GCM',
  storageIsolated: true,
};

/**
 * Get the default tenant isolation configuration.
 * The householdId must be provided per-request/operation.
 */
export function getDefaultTenantConfig(householdId: string): TenantIsolationConfig {
  return {
    ...DEFAULT_TENANT_CONFIG,
    householdId,
  };
}

/**
 * Validate that a data access is properly tenant-scoped.
 * Returns true if the access is allowed, false otherwise.
 *
 * This is a documentation/utility function that enforces
 * the invariant: every data access MUST include a householdId.
 */
export function validateTenantScope(
  householdId: string | null | undefined,
  operation: string
): { valid: boolean; error?: string } {
  if (!householdId || householdId.trim() === '') {
    return {
      valid: false,
      error: `Tenant isolation violation: operation '${operation}' called without householdId`,
    };
  }
  return { valid: true };
}

/**
 * Encryption configuration for data at rest.
 */
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  mode: string;
}

/**
 * Default encryption configuration for ChoreScore data at rest.
 */
export const ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'AES',
  keyLength: 256,
  mode: 'GCM',
};

/**
 * Security documentation constants for reference.
 */
export const SECURITY_DOCS = {
  /** Required TLS version for in-transit encryption */
  MIN_TLS_VERSION: '1.2',

  /** Encryption algorithm for data at rest */
  AT_REST_ALGORITHM: 'AES-256-GCM',

  /** Session token expiry (24 hours) */
  SESSION_TOKEN_EXPIRY_MS: 24 * 60 * 60 * 1000,

  /** Maximum failed login attempts before lockout */
  MAX_LOGIN_ATTEMPTS: 5,

  /** Lockout duration after max failed attempts (15 minutes) */
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,

  /** Password minimum length */
  MIN_PASSWORD_LENGTH: 8,

  /** Audit log retention period (1 year) */
  AUDIT_LOG_RETENTION_DAYS: 365,
} as const;
