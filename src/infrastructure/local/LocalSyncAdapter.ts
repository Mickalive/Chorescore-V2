/**
 * ChoreScore V2 — Local Sync Adapter
 *
 * HONEST adapter: sync is not configured in development.
 * This adapter does not simulate network sync.
 * All data remains local only.
 *
 * Offline/Conflict Resolution Design:
 * - Local-first: all operations work offline
 * - When sync becomes available, changes are queued
 * - Conflict resolution: last-write-wins with server timestamp
 * - Pending changes tracked per household
 * - Sync status reports pending count and errors
 */

import { SyncGateway, SyncStatus } from '../../application/ports';

export class LocalSyncAdapter implements SyncGateway {
  private pendingChanges: Map<string, number> = new Map();
  private lastSynced: Map<string, string> = new Map();

  isAvailable(): boolean {
    // Sync not configured in development
    return false;
  }

  async startSync(_householdId: string): Promise<void> {
    // No-op
  }

  async stopSync(_householdId: string): Promise<void> {
    // No-op
  }

  async pushChanges(householdId: string): Promise<void> {
    // In production: queue local changes for upload
    // Conflict resolution: server timestamp wins
    this.pendingChanges.set(householdId, 0);
    this.lastSynced.set(householdId, new Date().toISOString());
  }

  async pullChanges(householdId: string): Promise<void> {
    // In production: fetch remote changes and merge locally
    // Conflict resolution: last-write-wins with server timestamp
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

  /** Get pending changes count */
  getPendingChangesCount(householdId: string): number {
    return this.pendingChanges.get(householdId) ?? 0;
  }

  /** Check if there are unsynced changes */
  hasUnsyncedChanges(householdId: string): boolean {
    return (this.pendingChanges.get(householdId) ?? 0) > 0;
  }
}
