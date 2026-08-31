/**
 * ChoreScore V2 — Premium Offers Screen
 *
 * Shows the canonical pricing grid: Trial / Free / Standard / Pro.
 * Accessible from root 'Premium' button, TodoScreen, and ScoreScreen CTAs.
 *
 * Canonical grid (from MONETIZATION.md):
 * - Essai complet : 30 jours
 * - Gratuit : un foyer créé/possédé, saisie de base, historique + Score limités au mois courant
 * - Standard : 2,99 €/mois/foyer, jusqu'à 7 membres
 * - Pro : 5,99 €/mois/foyer, requis dès 8 membres
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/ui/components/ScreenContainer';
import { Text } from '../../src/ui/components/Text';
import { Card } from '../../src/ui/components/Card';
import { Button } from '../../src/ui/components/Button';
import { colors, spacing, borderRadius, typography } from '../../src/ui/design-system/theme';
import { PRICING } from '../../src/domain/entities';

export default function PremiumOffersScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text variant="bodyBold" color={colors.primary}>Retour</Text>
        </TouchableOpacity>
        <Text variant="screenTitle">ChoreScore Premium</Text>
        <Text variant="caption" style={styles.subtitle}>
          Libère tout le potentiel du Tricount du temps domestique
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Trial card */}
        <Card variant="highlighted" style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text variant="sectionTitle" style={styles.planTitle}>Essai gratuit</Text>
            <View style={[styles.badge, styles.badgeTrial]}>
              <Text variant="caption" style={styles.badgeText}>{PRICING.TRIAL_DAYS} jours</Text>
            </View>
          </View>
          <Text variant="body" style={styles.planDescription}>
            Accès complet à toutes les fonctionnalités Premium pendant {PRICING.TRIAL_DAYS} jours, sans engagement.
          </Text>
          <View style={styles.planFeatures}>
            <FeatureItem text="Toutes les fonctionnalités Standard & Pro" />
            <FeatureItem text="Pas de carte bancaire requise" />
            <FeatureItem text="Annulation à tout moment" />
          </View>
          <Button
            title="Commencer l'essai"
            variant="primary"
            onPress={() => {}}
            disabled
            style={styles.planButton}
          />
          <Text variant="caption" style={styles.unavailableLabel}>
            Bientôt disponible
          </Text>
        </Card>

        {/* Free card */}
        <Card variant="default" style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text variant="sectionTitle" style={styles.planTitle}>Gratuit</Text>
            <View style={[styles.badge, styles.badgeFree]}>
              <Text variant="caption" style={styles.badgeText}>0 €</Text>
            </View>
          </View>
          <Text variant="body" style={styles.planDescription}>
            Un foyer gratuit avec les fonctionnalités essentielles.
          </Text>
          <View style={styles.planFeatures}>
            <FeatureItem text="Un foyer créé/possédé gratuitement" />
            <FeatureItem text="Saisie de tâches réalisées" />
            <FeatureItem text="Historique & Score du mois courant" />
            <FeatureItem text="Collaboration entre membres" />
          </View>
          <Text variant="caption" style={styles.planLimit}>
            Pas de planification To-do, pas de pondération, archive limitée au mois civil.
          </Text>
        </Card>

        {/* Standard card */}
        <Card variant="default" style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text variant="sectionTitle" style={styles.planTitle}>Standard</Text>
            <View style={[styles.badge, styles.badgeStandard]}>
              <Text variant="caption" style={styles.badgeText}>{PRICING.STANDARD_MONTHLY_EUR} €/mois</Text>
            </View>
          </View>
          <Text variant="body" style={styles.planDescription}>
            Pour les foyers jusqu'à {PRICING.STANDARD_MEMBER_LIMIT} membres qui veulent plus de fonctionnalités.
          </Text>
          <View style={styles.planFeatures}>
            <FeatureItem text="Planification To-do" />
            <FeatureItem text="Pondération avancée" />
            <FeatureItem text="Historique complet (toutes périodes)" />
            <FeatureItem text="Export PDF" />
            <FeatureItem text="Multi-foyers" />
            <FeatureItem text={`Jusqu'à ${PRICING.STANDARD_MEMBER_LIMIT} membres`} />
          </View>
          <Button
            title="Choisir Standard"
            variant="secondary"
            onPress={() => {}}
            disabled
            style={styles.planButton}
          />
          <Text variant="caption" style={styles.unavailableLabel}>
            Bientôt disponible
          </Text>
        </Card>

        {/* Pro card */}
        <Card variant="highlighted" style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text variant="sectionTitle" style={styles.planTitle}>Pro</Text>
            <View style={[styles.badge, styles.badgePro]}>
              <Text variant="caption" style={styles.badgeText}>{PRICING.PRO_MONTHLY_EUR} €/mois</Text>
            </View>
          </View>
          <Text variant="body" style={styles.planDescription}>
            Requis pour les foyers de {PRICING.PRO_MEMBER_THRESHOLD} membres et plus.
          </Text>
          <View style={styles.planFeatures}>
            <FeatureItem text="Toutes les fonctionnalités Standard" />
            <FeatureItem text={`Dès ${PRICING.PRO_MEMBER_THRESHOLD} membres`} />
            <FeatureItem text="Performance et support prioritaires" />
          </View>
          <Button
            title="Choisir Pro"
            variant="primary"
            onPress={() => {}}
            disabled
            style={styles.planButton}
          />
          <Text variant="caption" style={styles.unavailableLabel}>
            Bientôt disponible
          </Text>
        </Card>

        {/* FAQ note */}
        <View style={styles.faqNote}>
          <Text variant="caption" style={styles.faqText}>
            La facturation est attachée au foyer, pas à ton compte. Tu peux rejoindre des foyers existants sans payer. Les offres payantes sont optionnelles et gérables à tout moment depuis les Options du foyer.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text variant="body" style={styles.checkmark}>✓</Text>
      <Text variant="body" style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  planCard: {
    marginBottom: spacing.lg,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  planTitle: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeTrial: {
    backgroundColor: colors.primaryLight,
  },
  badgeFree: {
    backgroundColor: colors.surfaceAlt,
  },
  badgeStandard: {
    backgroundColor: colors.surfaceHighlight,
  },
  badgePro: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontWeight: '600',
  },
  planDescription: {
    marginBottom: spacing.md,
    color: colors.textSecondary,
  },
  planFeatures: {
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  checkmark: {
    color: colors.success,
    fontWeight: '700',
  },
  featureText: {
    flex: 1,
  },
  planLimit: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  planButton: {
    marginTop: spacing.sm,
  },
  unavailableLabel: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  faqNote: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  faqText: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
