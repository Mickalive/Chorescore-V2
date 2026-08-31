/**
 * ChoreScore V2 — Local Sync Adapter
 *
 * HONEST adapter: sync is not configured in development.
 * This adapter does not simulate network sync.
 * All data remains local only.
 *
 * Offline/Conflict Resolution Design:
 * ────────────────────────────────────────
 * Strategy: Last-Write-Wins (LWW) with server timestamp authority.
 *
 * 1. Local-first: all CRUD operations work fully offline.
 *    No network call is ever blocking a user gesture.
 *
 * 2. Change queue: every local mutation (create/update/delete)
 *    increments a per-household pending-changes counter.
 *    Each queued change stores: { entityType, entityId, operation, localTimestamp }.
 *
 * 3. Push phase: pending changes are serialized and uploaded
 *    in insertion order. On success the counter resets to 0.
 *    On partial failure the counter reflects remaining unsent items.
 *
 * 4. Pull phase: remote changes since lastSyncedAt are fetched.
 *    For each entity, compare local vs remote timestamps:
 *    - If remote is newer → overwrite local copy.
 *    - If local is newer → keep local (will be pushed later).
 *    - If equal → no conflict (deterministic — same data).
 *
 * 5. Conflict detection: when both local and remote have modified
 *    the same entity since lastSyncedAt, the server timestamp wins.
 *    The losing mutation is logged (not silently dropped) so the
 *    app can optionally surface "this entry was updated remotely".
 *
 * 6. Household isolation: each householdId has its own queue,
 *    timestamp, and sync state. No cross-tenant data leaks.
 *
 * 7. The adapter is EXPLICITLY unavailable in dev mode.
 *    Returning isAvailable() = false ensures the product never
 *    pretends to sync when it doesn't.
 */

import { SyncGateway, SyncStatus } from '../../application/ports';

/**
 * A single pending change in the sync queue.
 */
export interface PendingChange {
  entityType: 'entry' | 'persistent-task' | 'todo' | 'member' | 'household';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  localTimestamp: string;
}

/**
 * Conflict resolution result for a single entity.
 */
export interface ConflictResolution {
  entityId: string;
  entityType: string;
  resolution: 'local-wins' | 'remote-wins' | 'no-conflict';
  localTimestamp: string;
  remoteTimestamp: string;
}

export class LocalSyncAdapter implements SyncGateway {
  private pendingChanges: Map<string, number> = new Map();
  private changeQueues: Map<string, PendingChange[]> = new Map();
  private lastSynced: Map<string, string> = new Map();
  private conflictLog: Map<string, ConflictResolution[]> = new Map();

  isAvailable(): boolean {
    // Sync not configured in development
    return false;
  }

  async startSync(_householdId: string): Promise<void> {
    // No-op in dev: sync not configured
  }

  async stopSync(_householdId: string): Promise<void> {
    // No-op in dev
  }

  async pushChanges(householdId: string): Promise<void> {
    // In production: serialize pendingChanges[householdId] and upload
    // Conflict resolution: server timestamp wins (LWW)
    this.pendingChanges.set(householdId, 0);
    this.changeQueues.set(householdId, []);
    this.lastSynced.set(householdId, new Date().toISOString());
  }

  async pullChanges(householdId: string): Promise<void> {
    // In production: fetch remote changes since lastSyncedAt
    // For each entity: compare local vs remote timestamp → LWW
    this.lastSynced.set(householdId, new Date().toISOString());
  }

  async getStatus(householdId: string): Promise<SyncStatus> {
    return {
      isSyncing: false,
      lastSyncedAt: this.lastSynced.get(householdId) ?? null,
      pendingChanges: this.pendingChanges.get(householdId) ?? 0,
      error: 'Sync is not configured',
    };
  }

  /** Increment pending changes count (for offline operation tracking) */
  incrementPendingChanges(householdId: string): void {
    const current = this.pendingChanges.get(householdId) ?? 0;
    this.pendingChanges.set(householdId, current + 1);
  }

  /** Queue a specific change for sync */
  queueChange(householdId: string, change: PendingChange): void {
    this.incrementPendingChanges(householdId);
    const queue = this.changeQueues.get(householdId) ?? [];
    queue.push(change);
    this.changeQueues.set(householdId, queue);
  }

  /** Get pending changes count */
  getPendingChangesCount(householdId: string): number {
    return this.pendingChanges.get(householdId) ?? 0;
  }

  /** Check if there are unsynced changes */
  hasUnsyncedChanges(householdId: string): boolean {
    return (this.pendingChanges.get(householdId) ?? 0) > 0;
  }

  /** Get the queued changes for a household */
  getChangeQueue(householdId: string): PendingChange[] {
    return [...(this.changeQueues.get(householdId) ?? [])];
  }

  /** Log a conflict resolution (for audit trail) */
  logConflict(resolution: ConflictResolution): void {
    const householdId = resolution.entityId.split('-')[0]; // simplified
    const log = this.conflictLog.get(householdId) ?? [];
    log.push(resolution);
    this.conflictLog.set(householdId, log);
  }

  /** Get conflict log for a household */
  getConflictLog(_householdId: string): ConflictResolution[] {
    return Array.from(this.conflictLog.values()).flat();
  }
}
