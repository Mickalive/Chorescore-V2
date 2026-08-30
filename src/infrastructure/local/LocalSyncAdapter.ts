/**
 * ChoreScore V2 — Local Sync Adapter
 *
 * HONEST adapter: sync is not configured in development.
 * This adapter does not simulate network sync.
 * All data remains local only.
 */

import { SyncGateway, SyncStatus } from '../../application/ports';

export class LocalSyncAdapter implements SyncGateway {
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

  async pushChanges(_householdId: string): Promise<void> {
    // No-op
  }

  async pullChanges(_householdId: string): Promise<void> {
    // No-op
  }

  async getStatus(_householdId: string): Promise<SyncStatus> {
    return {
      isSyncing: false,
      lastSyncedAt: null,
      pendingChanges: 0,
      error: 'Sync is not configured',
    };
  }
}
