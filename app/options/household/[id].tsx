/**
 * ChoreScore V2 — Household Options Screen
 *
 * Subscription, administration, members, permissions.
 * Visible only to owner/payer of the household.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '../../../src/ui/components/ScreenContainer';
import { Text } from '../../../src/ui/components/Text';
import { Card } from '../../../src/ui/components/Card';
import { Button } from '../../../src/ui/components/Button';
import { colors, spacing, borderRadius } from '../../../src/ui/design-system/theme';
import { useApp } from '../../../src/features/app/AppContext';
import { Household, Member, Membership } from '../../../src/domain/entities';

interface OptionRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function OptionRow({ label, value, onPress, danger }: OptionRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      style={styles.optionRow}
    >
      <Text variant="body" style={[danger && styles.dangerText]}>
        {label}
      </Text>
      {value && (
        <Text variant="caption">{value}</Text>
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text variant="sectionTitle" style={styles.sectionTitle}>{title}</Text>;
}

export default function HouseholdOptionsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { app, currentUser } = useApp();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [entitlement, setEntitlement] = useState<string>('free');

  const householdId = id || '';

  const loadData = useCallback(async () => {
    if (!householdId || !currentUser) return;

    try {
      const hh = await app.getHousehold(householdId);
      setHousehold(hh);

      if (hh) {
        const mems = await app.getMembersForHousehold(householdId);
        setMembers(mems);

        // Check if current user is owner
        const membership = await app.getMembershipForUser(currentUser.userId, householdId);
        setIsOwner(membership?.role === 'OWNER');

        // Get entitlement
        const ent = await app.getEntitlement(householdId);
        setEntitlement(ent.plan);
      }
    } catch (error) {
      console.error('Failed to load household options:', error);
    }
  }, [app, householdId, currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Access control: only owner/payer can see this screen
  if (!isOwner) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text variant="bodyBold" color={colors.primary}>Retour</Text>
          </TouchableOpacity>
          <Text variant="screenTitle">Options du foyer</Text>
        </View>
        <View style={styles.accessDenied}>
          <Text variant="sectionTitle" style={styles.accessDeniedTitle}>
            Accès restreint
          </Text>
          <Text variant="body" style={styles.accessDeniedText}>
            Seul le propriétaire du foyer peut accéder aux options du foyer.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text variant="bodyBold" color={colors.primary}>Retour</Text>
        </TouchableOpacity>
        <Text variant="screenTitle">Options du foyer</Text>
        {household && (
          <Text variant="caption">{household.name}</Text>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Subscription */}
        <SectionHeader title="Abonnement" />
        <Card variant="default" style={styles.sectionCard}>
          <OptionRow
            label="Plan actuel"
            value={
              entitlement === 'free' ? 'Gratuit' :
              entitlement === 'trial' ? 'Essai' :
              entitlement === 'standard' ? 'Standard' :
              'Pro'
            }
          />
          <OptionRow label="Gérer l'abonnement" />
          <OptionRow label="Historique de facturation" />
        </Card>

        {/* Administration */}
        <SectionHeader title="Administration" />
        <Card variant="default" style={styles.sectionCard}>
          <OptionRow label="Nom du foyer" value={household?.name || ''} />
          <OptionRow label="Supprimer le foyer" danger />
        </Card>

        {/* Members */}
        <SectionHeader title="Membres" />
        <Card variant="default" style={styles.sectionCard}>
          {members.map((member) => (
            <OptionRow
              key={member.id}
              label={member.name}
              value={member.userId === household?.ownerId ? 'Propriétaire' : 'Membre'}
            />
          ))}
          <OptionRow label="Inviter un membre" />
        </Card>

        {/* Permissions */}
        <SectionHeader title="Permissions" />
        <Card variant="default" style={styles.sectionCard}>
          <OptionRow label="Collaboratif (par défaut)" value="Tous peuvent saisir" />
          <OptionRow label="Permissions avancées" value="Standard+" />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  sectionCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dangerText: {
    color: colors.error,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  accessDeniedTitle: {
    marginBottom: spacing.md,
  },
  accessDeniedText: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
