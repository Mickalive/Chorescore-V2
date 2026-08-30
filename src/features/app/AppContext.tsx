/**
 * ChoreScore V2 — App Context
 *
 * Provides the ChoreScoreApp instance and current user state to all screens.
 * This is the central state management for the application.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ChoreScoreApp } from '../../application/use-cases/ChoreScoreApp';
import { LocalAuthAdapter } from '../../infrastructure/local/LocalAuthAdapter';
import { LocalEntitlementAdapter } from '../../infrastructure/local/LocalEntitlementAdapter';
import { LocalBillingAdapter } from '../../infrastructure/local/LocalBillingAdapter';
import { SystemShareAdapter } from '../../infrastructure/local/LocalSystemShareAdapter';
import { LocalNotificationAdapter } from '../../infrastructure/local/LocalNotificationAdapter';
import { LocalCalendarAdapter } from '../../infrastructure/local/LocalCalendarAdapter';
import { LocalSecureStorageAdapter } from '../../infrastructure/local/LocalSecureStorageAdapter';
import { LocalSyncAdapter } from '../../infrastructure/local/LocalSyncAdapter';
import { LocalResearchAnalyticsAdapter } from '../../infrastructure/local/LocalResearchAnalyticsAdapter';
import {
  InMemoryUserRepository,
  InMemoryMembershipRepository,
  InMemoryAccountRepository,
  InMemoryHouseholdRepository,
  InMemoryMemberRepository,
  InMemoryTodoRepository,
} from '../../infrastructure/repositories/InMemoryRepositories';
import {
  PersistentEntryRepository,
  PersistentPersistentTaskRepository,
  PersistentChronoTimerRepository,
} from '../../infrastructure/repositories/PersistentRepositories';
import { AuthUser } from '../../application/ports';

interface AppState {
  app: ChoreScoreApp;
  currentUser: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create stable repository instances
  // Entries, persistentTasks, and chronoTimer use AsyncStorage-backed persistent repos
  // so data survives app restart. Other repos remain InMemory for now.
  const reposRef = useRef({
    users: new InMemoryUserRepository(),
    memberships: new InMemoryMembershipRepository(),
    accounts: new InMemoryAccountRepository(),
    households: new InMemoryHouseholdRepository(),
    members: new InMemoryMemberRepository(),
    entries: new PersistentEntryRepository(),
    persistentTasks: new PersistentPersistentTaskRepository(),
    todos: new InMemoryTodoRepository(),
    chronoTimer: new PersistentChronoTimerRepository(),
  });

  // Create stable service instances
  // AccountRepository is injected into entitlement adapter so that
  // getAccountEntitlement resolves via AccountRepository.ownedFreeHouseholdId
  // instead of a global entitlements map scan.
  const servicesRef = useRef({
    auth: new LocalAuthAdapter(),
    entitlements: new LocalEntitlementAdapter(),
    share: new SystemShareAdapter(),
    notifications: new LocalNotificationAdapter(),
    calendar: new LocalCalendarAdapter(),
    secureStorage: new LocalSecureStorageAdapter(),
    sync: new LocalSyncAdapter(),
    analytics: new LocalResearchAnalyticsAdapter(),
  });

  // Inject account repository into entitlement adapter
  useEffect(() => {
    servicesRef.current.entitlements.setAccountRepository(reposRef.current.accounts);
  }, []);

  // Create the app instance
  const appRef = useRef<ChoreScoreApp>(
    new ChoreScoreApp(servicesRef.current, reposRef.current)
  );

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = servicesRef.current.auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const user = await servicesRef.current.auth.signInWithEmail(email, password);
    if (user) {
      // Ensure user exists in repository
      const existingUser = await reposRef.current.users.getById(user.userId);
      if (!existingUser) {
        await reposRef.current.users.create({
          email: user.email,
          displayName: user.displayName,
        });
      }
      // Ensure account exists
      const existingAccount = await reposRef.current.accounts.getByUser(user.userId);
      if (!existingAccount) {
        await reposRef.current.accounts.create({
          userId: user.userId,
          ownedFreeHouseholdId: null,
        });
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    await servicesRef.current.auth.signOut();
  }, []);

  const refreshUser = useCallback(() => {
    const user = servicesRef.current.auth.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const value: AppState = {
    app: appRef.current,
    currentUser,
    isLoading,
    signIn,
    signOut,
    refreshUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
