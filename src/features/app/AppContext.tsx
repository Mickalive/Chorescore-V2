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
} from '../../infrastructure/repositories/InMemoryRepositories';
import {
  PersistentEntryRepository,
  PersistentPersistentTaskRepository,
  PersistentTodoRepository,
  PersistentChronoTimerRepository,
} from '../../infrastructure/repositories/PersistentRepositories';
import { AuthUser } from '../../application/ports';

export type DemoEntitlementMode = 'demo-premium' | 'demo-free';

interface AppState {
  app: ChoreScoreApp;
  currentUser: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => void;
  demoEntitlementMode: DemoEntitlementMode | null;
  setDemoEntitlementMode: (mode: DemoEntitlementMode) => void;
}

const AppContext = createContext<AppState | null>(null);
const DEMO_EMAIL = 'demo@chorescore.app';
const DEMO_HOUSEHOLD_ID = 'h-core';
const DEMO_ALEX_MEMBER_ID = 'm-alex';
const DEMO_SAM_MEMBER_ID = 'm-sam';
const DEMO_SAM_USER_ID = 'demo-user-sam';

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

function monthDate(monthOffset: number, day: number, hour = 18): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, day, hour, 0, 0).toISOString();
}

export function AppProvider({ children }: AppProviderProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [demoEntitlementMode, setDemoEntitlementModeState] = useState<DemoEntitlementMode>('demo-premium');

  // Create stable repository instances
  // Entries, persistentTasks, todos, and chronoTimer use AsyncStorage-backed persistent repos
  // so data survives app restart. Other repos remain InMemory for the local/demo shell.
  const reposRef = useRef({
    users: new InMemoryUserRepository(),
    memberships: new InMemoryMembershipRepository(),
    accounts: new InMemoryAccountRepository(),
    households: new InMemoryHouseholdRepository(),
    members: new InMemoryMemberRepository(),
    entries: new PersistentEntryRepository(),
    persistentTasks: new PersistentPersistentTaskRepository(),
    todos: new PersistentTodoRepository(),
    chronoTimer: new PersistentChronoTimerRepository(),
  });

  // Create stable service instances. External production providers remain behind ports.
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

  useEffect(() => {
    servicesRef.current.entitlements.setAccountRepository(reposRef.current.accounts);
    setDemoEntitlementModeState(servicesRef.current.entitlements.getMode());
  }, []);

  const appRef = useRef<ChoreScoreApp>(
    new ChoreScoreApp(servicesRef.current, reposRef.current)
  );

  useEffect(() => {
    const unsubscribe = servicesRef.current.auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  /**
   * Seed the canonical release/demo scenario used by the Android golden path.
   * This is local/demo data only. It is never sent to billing or analytics as real user data.
   */
  const ensureCanonicalDemoFixture = useCallback(async (demoUser: AuthUser) => {
    const repos = reposRef.current;
    const nowIso = new Date().toISOString();

    // Keep AuthUser.userId and local User.id aligned in the demo shell.
    if (!(await repos.users.getById(demoUser.userId))) {
      repos.users.seed([{
        id: demoUser.userId,
        email: demoUser.email,
        displayName: 'Alex',
        createdAt: nowIso,
      }]);
    }
    if (!(await repos.users.getById(DEMO_SAM_USER_ID))) {
      repos.users.seed([{
        id: DEMO_SAM_USER_ID,
        email: 'sam.demo@chorescore.app',
        displayName: 'Sam',
        createdAt: nowIso,
      }]);
    }

    let account = await repos.accounts.getByUser(demoUser.userId);
    if (!account) {
      account = await repos.accounts.create({
        userId: demoUser.userId,
        ownedFreeHouseholdId: DEMO_HOUSEHOLD_ID,
      });
    } else if (account.ownedFreeHouseholdId !== DEMO_HOUSEHOLD_ID) {
      await repos.accounts.update(demoUser.userId, { ownedFreeHouseholdId: DEMO_HOUSEHOLD_ID });
    }

    if (!(await repos.households.getById(DEMO_HOUSEHOLD_ID))) {
      repos.households.seed([{
        id: DEMO_HOUSEHOLD_ID,
        name: 'Appartement démo',
        ownerId: demoUser.userId,
        createdAt: nowIso,
      }]);
    }

    if (!(await repos.memberships.getByUserAndHousehold(demoUser.userId, DEMO_HOUSEHOLD_ID))) {
      repos.memberships.seed([{
        id: 'membership-demo-alex',
        userId: demoUser.userId,
        householdId: DEMO_HOUSEHOLD_ID,
        role: 'OWNER',
        joinedAt: nowIso,
      }]);
    }
    if (!(await repos.memberships.getByUserAndHousehold(DEMO_SAM_USER_ID, DEMO_HOUSEHOLD_ID))) {
      repos.memberships.seed([{
        id: 'membership-demo-sam',
        userId: DEMO_SAM_USER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        role: 'MEMBER',
        joinedAt: nowIso,
      }]);
    }

    const existingMembers = await repos.members.getByHousehold(DEMO_HOUSEHOLD_ID);
    if (!existingMembers.some((m) => m.id === DEMO_ALEX_MEMBER_ID)) {
      repos.members.seed([{
        id: DEMO_ALEX_MEMBER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: 'Alex',
        userId: demoUser.userId,
        joinedAt: nowIso,
      }]);
    }
    if (!existingMembers.some((m) => m.id === DEMO_SAM_MEMBER_ID)) {
      repos.members.seed([{
        id: DEMO_SAM_MEMBER_ID,
        householdId: DEMO_HOUSEHOLD_ID,
        name: 'Sam',
        userId: DEMO_SAM_USER_ID,
        joinedAt: nowIso,
      }]);
    }

    const tasks = await repos.persistentTasks.getByHousehold(DEMO_HOUSEHOLD_ID);
    let dishesTask = tasks.find((task) => task.name === 'Vaisselle');
    if (!dishesTask) {
      dishesTask = await repos.persistentTasks.create({
        householdId: DEMO_HOUSEHOLD_ID,
        name: 'Vaisselle',
        defaultWeight: 1,
      });
    }

    const entries = await repos.entries.getByHousehold(DEMO_HOUSEHOLD_ID);
    if (!entries.some((entry) => entry.label === 'Vaisselle du soir')) {
      await repos.entries.create({
        householdId: DEMO_HOUSEHOLD_ID,
        label: 'Vaisselle du soir',
        performedByMemberId: DEMO_ALEX_MEMBER_ID,
        beneficiaryMemberIds: [DEMO_ALEX_MEMBER_ID, DEMO_SAM_MEMBER_ID],
        durationMinutes: 60,
        weight: 1,
        persistentTaskId: dishesTask.id,
        occurredAt: monthDate(0, 24),
        createdBy: demoUser.userId,
      });
    }
    if (!entries.some((entry) => entry.label === 'Nettoyer le balcon')) {
      await repos.entries.create({
        householdId: DEMO_HOUSEHOLD_ID,
        label: 'Nettoyer le balcon',
        performedByMemberId: DEMO_SAM_MEMBER_ID,
        beneficiaryMemberIds: [DEMO_ALEX_MEMBER_ID, DEMO_SAM_MEMBER_ID],
        durationMinutes: 30,
        weight: 1.5,
        persistentTaskId: null,
        occurredAt: monthDate(0, 25, 10),
        createdBy: DEMO_SAM_USER_ID,
      });
    }
    // One prior-month entry makes the Free archive restriction testable on every calendar month.
    if (!entries.some((entry) => entry.label === 'Archive démo')) {
      await repos.entries.create({
        householdId: DEMO_HOUSEHOLD_ID,
        label: 'Archive démo',
        performedByMemberId: DEMO_ALEX_MEMBER_ID,
        beneficiaryMemberIds: [DEMO_ALEX_MEMBER_ID, DEMO_SAM_MEMBER_ID],
        durationMinutes: 15,
        weight: 1,
        persistentTaskId: null,
        occurredAt: monthDate(-1, 20),
        createdBy: demoUser.userId,
      });
    }

    const todos = await repos.todos.getByHousehold(DEMO_HOUSEHOLD_ID);
    if (!todos.some((todo) => todo.title === 'Sortir les cartons')) {
      await repos.todos.create({
        householdId: DEMO_HOUSEHOLD_ID,
        title: 'Sortir les cartons',
        assigneeMemberId: DEMO_SAM_MEMBER_ID,
        beneficiaryMemberIds: [DEMO_ALEX_MEMBER_ID, DEMO_SAM_MEMBER_ID],
        dueAt: null,
        reminderAt: null,
        notes: '',
        persistentTaskId: null,
        status: 'todo',
      });
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const user = await servicesRef.current.auth.signInWithEmail(email, password);
    if (!user) return;

    const isCanonicalDemo = user.email.toLowerCase() === DEMO_EMAIL;

    // The local repository normally generates IDs. For the demo shell we deliberately align
    // the repository User ID with AuthUser.userId so membership/default performer resolution is honest.
    const existingUser = await reposRef.current.users.getById(user.userId);
    if (!existingUser) {
      if (isCanonicalDemo) {
        reposRef.current.users.seed([{
          id: user.userId,
          email: user.email,
          displayName: 'Alex',
          createdAt: new Date().toISOString(),
        }]);
      } else {
        await reposRef.current.users.create({
          email: user.email,
          displayName: user.displayName,
        });
      }
    }

    const existingAccount = await reposRef.current.accounts.getByUser(user.userId);
    if (!existingAccount) {
      await reposRef.current.accounts.create({
        userId: user.userId,
        ownedFreeHouseholdId: null,
      });
    }

    if (isCanonicalDemo) {
      servicesRef.current.entitlements.setMode('demo-premium');
      setDemoEntitlementModeState('demo-premium');
      await ensureCanonicalDemoFixture({ ...user, displayName: 'Alex' });
      // Keep the visible auth identity aligned with the canonical fixture.
      servicesRef.current.auth.setUser({ ...user, displayName: 'Alex' });
    }
  }, [ensureCanonicalDemoFixture]);

  const signOut = useCallback(async () => {
    await servicesRef.current.auth.signOut();
  }, []);

  const refreshUser = useCallback(() => {
    const user = servicesRef.current.auth.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const setDemoEntitlementMode = useCallback((mode: DemoEntitlementMode) => {
    servicesRef.current.entitlements.setMode(mode);
    setDemoEntitlementModeState(mode);
  }, []);

  const value: AppState = {
    app: appRef.current,
    currentUser,
    isLoading,
    signIn,
    signOut,
    refreshUser,
    demoEntitlementMode,
    setDemoEntitlementMode,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
