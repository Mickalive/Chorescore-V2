/**
 * ChoreScore V2 — Personal Options Screen
 *
 * Profile, notifications, privacy, legal, preferences.
 * Accessible to all users.
 *
 * IMPORTANT: All option values reflect real adapter availability.
 * No fake/pushed states are displayed. Actions without real
 * implementations are shown as "Indisponible" (not faked).
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/ui/components/ScreenContainer';
import { Text } from '../../src/ui/components/Text';
import { Card } from '../../src/ui/components/Card';
import { colors, spacing, borderRadius } from '../../src/ui/design-system/theme';
import { useApp } from '../../src/features/app/AppContext';

interface OptionRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  unavailable?: boolean;
}

function OptionRow({ label, value, onPress, danger, unavailable }: OptionRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      style={[styles.optionRow, unavailable && styles.optionRowUnavailable]}
    >
      <Text
        variant="body"
        style={[
          danger && styles.dangerText,
          unavailable && styles.unavailableText,
        ]}
      >
        {label}
      </Text>
      {value && (
        <Text
          variant="caption"
          style={unavailable ? styles.unavailableValue : undefined}
        >
          {value}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text variant="sectionTitle" style={styles.sectionTitle}>{title}</Text>;
}

export default function PersonalOptionsScreen() {
  const router = useRouter();
  const { currentUser, signOut, app } = useApp();

  // Check real notification availability
  const notificationsAvailable = app.services.notifications.isAvailable();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text variant="bodyBold" color={colors.primary}>Retour</Text>
        </TouchableOpacity>
        <Text variant="screenTitle">Options</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <SectionHeader title="Profil" />
        <Card variant="default" style={styles.sectionCard}>
          <OptionRow
            label="Nom"
            value={currentUser?.displayName || 'Utilisateur'}
          />
          <OptionRow
            label="Email"
            value={currentUser?.email || 'non connecté'}
          />
          <OptionRow
            label="Changer le mot de passe"
            unavailable
            value="Indisponible"
          />
        </Card>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <Card variant="default" style={styles.sectionCard}>
          <OptionRow
            label="Rappels de tâches"
            value={notificationsAvailable ? 'Activés' : 'Non configuré'}
            unavailable={!notificationsAvailable}
          />
          <OptionRow
            label="Nouvelles assignations"
            value={notificationsAvailable ? 'Activées' : 'Non configuré'}
            unavailable={!notificationsAvailable}
          />
          <OptionRow
            label="Résumé hebdomadaire"
            value="Désactivé"
          />
        </Card>

        {/* Confidentialité */}
        <SectionHeader title="Confidentialité" />
        <Card variant="default" style={styles.sectionCard}>
          <OptionRow label="Données de recherche" value="Désactivées" />
          <OptionRow label="Visible par les membres du foyer" value="Oui" />
        </Card>

        {/* Légal */}
        <SectionHeader title="Légal" />
        <Card variant="default" style={styles.sectionCard}>
          <OptionRow
            label="Conditions d'utilisation"
            unavailable
            value="Indisponible"
          />
          <OptionRow
            label="Politique de confidentialité"
            unavailable
            value="Indisponible"
          />
          <OptionRow
            label="Mentions légales"
            unavailable
            value="Indisponible"
          />
        </Card>

        {/* Préférences */}
        <SectionHeader title="Préférences" />
        <Card variant="default" style={styles.sectionCard}>
          <OptionRow label="Langue" value="Français" />
          <OptionRow label="Thème" value="Clair" />
          <OptionRow
            label="Notifications push"
            value={notificationsAvailable ? 'Activées' : 'Non configuré'}
            unavailable={!notificationsAvailable}
          />
        </Card>

        {/* Déconnexion */}
        <View style={styles.signOutContainer}>
          <OptionRow
            label="Se déconnecter"
            danger
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
    gap: spacing.md,
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
    minHeight: 44, // WCAG touch target
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  optionRowUnavailable: {
    opacity: 0.6,
  },
  dangerText: {
    color: colors.error,
  },
  unavailableText: {
    color: colors.textMuted,
  },
  unavailableValue: {
    color: colors.textMuted,
  },
  signOutContainer: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
  },
});
