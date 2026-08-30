/**
 * ChoreScore V2 — Local Auth Adapter
 *
 * Development-only adapter that provides local authentication.
 * In production, this would be replaced by a real OAuth/email provider.
 * This adapter is HONEST: it does not simulate OAuth or external auth.
 */

import { AuthGateway } from '../../application/ports';

export class LocalAuthAdapter implements AuthGateway {
  private currentUserId: string | null = null;
  private listeners: Array<(userId: string | null) => void> = [];

  isAvailable(): boolean {
    // Local auth is always available in development
    return true;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  async signInWithEmail(_email: string, _password: string): Promise<{ userId: string } | null> {
    // Local development: create a simple user ID
    this.currentUserId = `local-user-${Date.now()}`;
    this.notifyListeners();
    return { userId: this.currentUserId };
  }

  async signInWithGoogle(): Promise<{ userId: string } | null> {
    // Not configured: returns null
    return null;
  }

  async signInWithFacebook(): Promise<{ userId: string } | null> {
    // Not configured: returns null
    return null;
  }

  async signOut(): Promise<void> {
    this.currentUserId = null;
    this.notifyListeners();
  }

  onAuthStateChanged(callback: (userId: string | null) => void): () => void {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.currentUserId);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /** Set user for demo/testing purposes */
  setUser(userId: string | null): void {
    this.currentUserId = userId;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentUserId);
    }
  }
}
