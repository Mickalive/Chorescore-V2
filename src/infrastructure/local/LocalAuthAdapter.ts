/**
 * ChoreScore V2 — Local Auth Adapter
 *
 * Development-only adapter that provides local authentication.
 * In production, this would be replaced by a real OAuth/email provider.
 * This adapter is HONEST: it does not simulate OAuth or external auth.
 * Providers (Google, Facebook) are ports — adapter decides if available.
 */

import { AuthGateway, AuthUser } from '../../application/ports';

export class LocalAuthAdapter implements AuthGateway {
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  isAvailable(): boolean {
    // Local auth is always available in development
    return true;
  }

  getCurrentUserId(): string | null {
    return this.currentUser?.userId ?? null;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  async signInWithEmail(email: string, _password: string): Promise<AuthUser | null> {
    // Local development: create a simple user with stable ID
    const userId = `local-user-${email.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
    const user: AuthUser = {
      userId,
      email,
      displayName: email.split('@')[0],
      provider: 'email',
    };
    this.currentUser = user;
    this.notifyListeners();
    return user;
  }

  async signInWithGoogle(): Promise<AuthUser | null> {
    // Not configured: returns null (honest adapter)
    return null;
  }

  async signInWithFacebook(): Promise<AuthUser | null> {
    // Not configured: returns null (honest adapter)
    return null;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    this.notifyListeners();
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /** Set user for demo/testing purposes */
  setUser(user: AuthUser | null): void {
    this.currentUser = user;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentUser);
    }
  }
}
