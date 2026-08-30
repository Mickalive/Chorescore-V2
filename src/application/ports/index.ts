/**
 * ChoreScore V2 — Application Ports (Interfaces)
 *
 * These define the contracts between the application/domain layer
 * and the infrastructure layer. The domain never depends on any
 * external provider directly.
 */

export interface AuthGateway {
  /** Check if authentication is configured and available */
  isAvailable(): boolean;
  /** Get current user ID if authenticated */
  getCurrentUserId(): string | null;
  /** Sign in with email/password (future) */
  signInWithEmail(email: string, password: string): Promise<{ userId: string } | null>;
  /** Sign in with Google (future) */
  signInWithGoogle(): Promise<{ userId: string } | null>;
  /** Sign in with Facebook (future) */
  signInWithFacebook(): Promise<{ userId: string } | null>;
  /** Sign out */
  signOut(): Promise<void>;
  /** Listen to auth state changes */
  onAuthStateChanged(callback: (userId: string | null) => void): () => void;
}

export interface EntitlementGateway {
  /** Get entitlement for a specific household */
  getEntitlement(householdId: string): Promise<EntitlementState>;
  /** Check if a specific capability is available for a household */
  canUseFeature(householdId: string, feature: EntitlementFeature): Promise<boolean>;
  /** Start trial for a household */
  startTrial(householdId: string): Promise<void>;
  /** Check trial status */
  getTrialStatus(householdId: string): Promise<TrialStatus>;
}

export type EntitlementFeature =
  | 'weighting'
  | 'todo-planning'
  | 'history-archive'
  | 'score-archive'
  | 'advanced-export'
  | 'create-household';

export interface EntitlementState {
  plan: 'free' | 'trial' | 'standard' | 'pro';
  isTestEntitlement: boolean;
  billingIsReal: boolean;
  scoreArchiveAccess: boolean;
  historyArchiveAccess: boolean;
  weightingEnabled: boolean;
  todoPlanningEnabled: boolean;
  advancedExportEnabled: boolean;
  memberLimit: number;
  canCreateAdditionalOwnedHousehold: boolean;
  trialEndsAt?: string;
}

export interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  startedAt: string;
  endsAt: string;
}

export interface BillingGateway {
  /** Check if billing is configured */
  isAvailable(): boolean;
  /** Get subscription status for a household */
  getSubscriptionStatus(householdId: string): Promise<SubscriptionStatus | null>;
  /** Initiate purchase (future) */
  purchase(householdId: string, plan: 'standard' | 'pro'): Promise<PurchaseResult>;
  /** Restore purchases (future) */
  restorePurchases(): Promise<PurchaseResult>;
}

export interface SubscriptionStatus {
  householdId: string;
  plan: 'standard' | 'pro';
  isActive: boolean;
  expiresAt: string;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

export interface SystemShareGateway {
  /** Check if native sharing is available */
  isAvailable(): boolean;
  /** Share content via system share sheet */
  share(options: ShareOptions): Promise<ShareResult>;
}

export interface ShareOptions {
  title?: string;
  message?: string;
  url?: string;
  files?: string[];
}

export interface ShareResult {
  completed: boolean;
  method?: string;
}

export interface NotificationGateway {
  /** Check if notifications are available */
  isAvailable(): boolean;
  /** Request permission */
  requestPermission(): Promise<boolean>;
  /** Schedule a local notification */
  scheduleNotification(options: NotificationOptions): Promise<string>;
  /** Cancel a scheduled notification */
  cancelNotification(id: string): Promise<void>;
}

export interface NotificationOptions {
  title: string;
  body: string;
  scheduledAt?: string; // ISO date string
  data?: Record<string, unknown>;
}

export interface CalendarGateway {
  /** Check if calendar integration is available */
  isAvailable(): boolean;
  /** Request calendar permission */
  requestPermission(): Promise<boolean>;
  /** Create a calendar event */
  createEvent(options: CalendarEventOptions): Promise<string | null>;
  /** Delete a calendar event */
  deleteEvent(id: string): Promise<void>;
}

export interface CalendarEventOptions {
  title: string;
  notes?: string;
  startDate: string; // ISO date string
  endDate: string;
  allDay?: boolean;
}

export interface SecureStorageGateway {
  /** Store a value securely */
  setItem(key: string, value: string): Promise<void>;
  /** Retrieve a stored value */
  getItem(key: string): Promise<string | null>;
  /** Delete a stored value */
  deleteItem(key: string): Promise<void>;
  /** Clear all stored values */
  clear(): Promise<void>;
}

export interface SyncGateway {
  /** Check if sync is available */
  isAvailable(): boolean;
  /** Start listening for remote changes */
  startSync(householdId: string): Promise<void>;
  /** Stop sync for a household */
  stopSync(householdId: string): Promise<void>;
  /** Force push local changes */
  pushChanges(householdId: string): Promise<void>;
  /** Force pull remote changes */
  pullChanges(householdId: string): Promise<void>;
  /** Get sync status */
  getStatus(householdId: string): Promise<SyncStatus>;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingChanges: number;
  error: string | null;
}

/**
 * ResearchAnalyticsGateway — secondary, disableable output.
 * This is a controlled exit point for the analytics plane.
 * Disabling it MUST NOT break any product functionality.
 */
export interface ResearchAnalyticsGateway {
  /** Check if analytics collection is enabled */
  isEnabled(): boolean;
  /** Enable/disable analytics collection */
  setEnabled(enabled: boolean): void;
  /** Emit a minimized fact to the analytics pipeline */
  emitFact(fact: AnalyticsFact): void;
  /** Check if analytics is configured */
  isAvailable(): boolean;
}

export interface AnalyticsFact {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  // Never include: userId, householdId, memberId, email, free text, IP, device ID
}
