/**
 * ChoreScore V2 — Local Secure Storage Adapter
 *
 * Uses an in-memory store for development.
 * In production, this would use Keychain (iOS) or EncryptedSharedPreferences (Android).
 */

import { SecureStorageGateway } from '../../application/ports';

export class LocalSecureStorageAdapter implements SecureStorageGateway {
  private store: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async deleteItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
