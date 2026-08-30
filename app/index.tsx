/**
 * ChoreScore V2 — Root Index Screen
 *
 * Shows the list of households the user belongs to.
 * Entry point after authentication.
 * Each household shows name + member count + plan badge.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../src/ui/components/ScreenContainer';
import { Text } from '../src/ui/components/Text';
import { Card } from '../src/ui/components/Card';
import { Button } from '../src/ui/components/Button';
import { colors, spacing, borderRadius } from '../src/ui/design-system/theme';
import { useApp } from '../src/features/app/AppContext';
import { Household, Member } from '../src/domain/entities';

interface HouseholdWithDetails {
  household: Household;
  memberCount: number;
  plan: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { app, currentUser, isLoading, signIn } = useApp();
  const [households, setHouseholds] = useState<HouseholdWithDetails[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loadHouseholds = useCallback(async () => {
    if (!currentUser) return;

    try {
      const userHouseholds = await app.getHouseholdsForUser(currentUser.userId);
      const details: HouseholdWithDetails[] = [];

      for (const household of userHouseholds) {
        const members = await app.getMembersForHousehold(household.id);
        const entitlement = await app.getEntitlement(household.id);
        details.push({
          household,
          memberCount: members.length,
          plan: entitlement.plan,
        });
      }

      setHouseholds(details);

      // Check account-level entitlement for creation
      const accountEntitlement = await app.getAccountEntitlement(currentUser.userId);
      setCanCreate(accountEntitlement.canCreateFreeHousehold);
    } catch (error) {
      console.error('Failed to load households:', error);
    }
  }, [app, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadHouseholds();
    }
  }, [currentUser, loadHouseholds]);

  const openHousehold = (id: string) => {
    router.push(`/household/${id}`);
  };

  const handleCreateHousehold = async () => {
    if (!currentUser) return;

    try {
      await app.createHousehold('Mon foyer', currentUser.userId);
      await loadHouseholds();
    } catch (error) {
      Alert.alert(
        'Création impossible',
        'Vous avez déjà un foyer gratuit. Passez à Standard ou Pro pour créer des foyers supplémentaires.'
      );
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) return;
    await signIn(email, password);
    setShowSignIn(false);
  };

  const handleDemoSignIn = async () => {
    await signIn('demo@chorescore.app', 'demo-password');
  };

  // Show sign-in screen if not authenticated
  if (!isLoading && !currentUser) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Text variant="screenTitle">ChoreScore</Text>
          <Text variant="caption">Le Tricount du temps domestique</Text>
        </View>

        {!showSignIn ? (
          <View style={styles.signInContainer}>
            <Text variant="body" style={styles.signInPrompt}>
              Connectez-vous pour accéder à vos foyers
            </Text>

            <Button
              title="Démonstration"
              variant="primary"
              onPress={handleDemoSignIn}
              style={styles.demoButton}
            />

            <Button
              title="Se connecter"
              variant="secondary"
              onPress={() => setShowSignIn(true)}
              style={styles.signInButton}
            />

            <Text variant="caption" style={styles.signInNote}>
              Google et Facebook seront disponibles lorsque les providers seront configurés
            </Text>
          </View>
        ) : (
          <View style={styles.signInForm}>
            <Text variant="sectionTitle" style={styles.formTitle}>
              Connexion
            </Text>

            <View style={styles.inputGroup}>
              <Text variant="caption">Email</Text>
              <View style={styles.input}>
                <Text variant="body">votre@email.com</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text variant="caption">Mot de passe</Text>
              <View style={styles.input}>
                <Text variant="body">••••••••</Text>
              </View>
            </View>

            <Button
              title="Se connecter"
              variant="primary"
              onPress={handleSignIn}
              style={styles.submitButton}
            />

            <Button
              title="Retour"
              variant="ghost"
              onPress={() => setShowSignIn(false)}
              size="small"
            />
          </View>
        )}
      </ScreenContainer>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text variant="body">Chargement...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text variant="screenTitle">ChoreScore</Text>
        <Text variant="caption">
          {currentUser?.displayName || 'Le Tricount du temps domestique'}
        </Text>
      </View>

      <View style={styles.list}>
        {households.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="sectionTitle" style={styles.emptyTitle}>
              Aucun foyer
            </Text>
            <Text variant="body" style={styles.emptyText}>
              Créez votre premier foyer pour commencer à partager les tâches domestiques.
            </Text>
          </View>
        ) : (
          households.map((item) => (
            <TouchableOpacity
              key={item.household.id}
              onPress={() => openHousehold(item.household.id)}
              activeOpacity={0.7}
            >
              <Card variant="highlighted" style={styles.householdCard}>
                <View style={styles.householdRow}>
                  <View style={styles.householdInfo}>
                    <Text variant="sectionTitle">{item.household.name}</Text>
                    <Text variant="caption">
                      {item.memberCount} {item.memberCount > 1 ? 'membres' : 'membre'}
                    </Text>
                  </View>
                  <View style={styles.householdActions}>
                    <View style={styles.planBadge}>
                      <Text variant="caption" style={styles.planBadgeText}>
                        {item.plan === 'free' && 'Gratuit'}
                        {item.plan === 'trial' && 'Essai'}
                        {item.plan === 'standard' && 'Standard'}
                        {item.plan === 'pro' && 'Pro'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push(`/options/household/${item.household.id}`)}
                      activeOpacity={0.7}
                      style={styles.householdOptionsButton}
                    >
                      <Text variant="caption" color={colors.primary}>Options</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <Button
          title="Créer un foyer"
          variant={canCreate ? 'primary' : 'secondary'}
          onPress={handleCreateHousehold}
          disabled={!canCreate}
        />
        {!canCreate && households.length > 0 && (
          <Text variant="caption" style={styles.creationNote}>
            Vous avez déjà un foyer gratuit. Passez à Standard ou Pro pour en créer un autre.
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title="Options"
          variant="ghost"
          onPress={() => router.push('/options/personal')}
          size="small"
        />
        <Button
          title="Premium"
          variant="ghost"
          onPress={() => {}}
          size="small"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  householdCard: {
    marginBottom: spacing.sm,
  },
  householdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  householdInfo: {
    flex: 1,
  },
  householdActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  planBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  householdOptionsButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  planBadgeText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actions: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  creationNote: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    marginBottom: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  signInContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  signInPrompt: {
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  demoButton: {
    marginBottom: spacing.md,
    width: '100%',
  },
  signInButton: {
    width: '100%',
  },
  signInNote: {
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  signInForm: {
    paddingVertical: spacing.xl,
  },
  formTitle: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
