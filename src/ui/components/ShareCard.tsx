/**
 * ChoreScore V2 — Share Card Component
 *
 * Generates shareable visual cards for ChoreScore data.
 * Cards are recognizable, mobile-readable, and contain only
 * information the user explicitly chose to share.
 *
 * No guilt-inducing text is generated automatically.
 * The card is a clean, warm summary of selected data.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, spacing, borderRadius, typography } from '../design-system/theme';

export interface ShareCardData {
  /** Type of card to render */
  type: 'score' | 'entry' | 'balance' | 'compensation';
  /** Period label (e.g., "Mois", "Semaine") */
  period?: string;
  /** Household name if user allows */
  householdName?: string;
  /** Entry details for entry card */
  entry?: {
    label: string;
    durationMinutes: number;
    performedBy: string;
    beneficiaryText: string;
  };
  /** Balance data for score/balance cards */
  balances?: Array<{
    name: string;
    minutes: number;
  }>;
  /** Compensation data */
  compensations?: Array<{
    from: string;
    to: string;
    minutes: number;
  }>;
  /** Performed minutes */
  performedMinutes?: Record<string, number>;
}

interface ShareCardProps {
  data: ShareCardData;
  style?: ViewStyle;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? '-' : '';
  if (h > 0 && m > 0) return `${sign}${h}h ${m} min`;
  if (h > 0) return `${sign}${h}h`;
  return `${sign}${m} min`;
}

/**
 * Renders a share card that can be captured as an image for sharing.
 * The card is self-contained with ChoreScore branding.
 */
export function ShareCard({ data, style }: ShareCardProps) {
  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="bodyBold" style={styles.brandName}>
          ChoreScore
        </Text>
        {data.period && (
          <Text variant="caption" style={styles.periodLabel}>
            {data.period}
          </Text>
        )}
      </View>

      {/* Household name if provided */}
      {data.householdName && (
        <Text variant="caption" style={styles.householdName}>
          {data.householdName}
        </Text>
      )}

      {/* Content based on type */}
      {data.type === 'entry' && data.entry && (
        <View style={styles.content}>
          <Text variant="bodyBold" style={styles.entryLabel} numberOfLines={2}>
            {data.entry.label}
          </Text>
          <Text variant="metric" style={styles.metricValue}>
            {formatDuration(data.entry.durationMinutes)}
          </Text>
          <Text variant="caption" style={styles.entryMeta}>
            {data.entry.performedBy} → {data.entry.beneficiaryText}
          </Text>
        </View>
      )}

      {data.type === 'score' && data.balances && (
        <View style={styles.content}>
          {data.balances.map((b, i) => (
            <View key={i} style={styles.balanceRow}>
              <Text variant="body" style={styles.balanceName} numberOfLines={1}>
                {b.name}
              </Text>
              <Text
                variant="bodyBold"
                style={[
                  styles.balanceValue,
                  { color: b.minutes >= 0 ? colors.success : colors.error },
                ]}
              >
                {b.minutes >= 0 ? '+' : ''}{formatDuration(b.minutes)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {data.type === 'balance' && data.balances && (
        <View style={styles.content}>
          <Text variant="sectionTitle" style={styles.sectionLabel}>
            Équilibres
          </Text>
          {data.balances.map((b, i) => (
            <View key={i} style={styles.balanceRow}>
              <Text variant="body" style={styles.balanceName} numberOfLines={1}>
                {b.name}
              </Text>
              <Text
                variant="bodyBold"
                style={[
                  styles.balanceValue,
                  { color: b.minutes >= 0 ? colors.success : colors.error },
                ]}
              >
                {b.minutes >= 0 ? '+' : ''}{formatDuration(b.minutes)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {data.type === 'compensation' && data.compensations && (
        <View style={styles.content}>
          <Text variant="sectionTitle" style={styles.sectionLabel}>
            Rattrapages
          </Text>
          {data.compensations.map((c, i) => (
            <Text key={i} variant="body" style={styles.compensationText}>
              {c.from} → {c.to} : {formatDuration(c.minutes)}
            </Text>
          ))}
        </View>
      )}

      {/* Performed time if available */}
      {data.performedMinutes && Object.keys(data.performedMinutes).length > 0 && (
        <View style={styles.performedSection}>
          <Text variant="caption" style={styles.performedLabel}>
            Temps effectué
          </Text>
          {Object.entries(data.performedMinutes).map(([name, mins]) => (
            <View key={name} style={styles.balanceRow}>
              <Text variant="body" style={styles.balanceName} numberOfLines={1}>
                {name}
              </Text>
              <Text variant="bodyBold" style={styles.balanceValue}>
                {formatDuration(mins)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text variant="caption" style={styles.footerText}>
          fait avec ♡ par ChoreScore
        </Text>
      </View>
    </View>
  );
}

/**
 * Generate text content for sharing when image capture is not available.
 * This is the fallback for platforms without image sharing.
 */
export function generateShareText(data: ShareCardData): string {
  const lines: string[] = [];

  if (data.period) {
    lines.push(`📊 ChoreScore — ${data.period}`);
  } else {
    lines.push('📊 ChoreScore');
  }

  if (data.householdName) {
    lines.push(`🏠 ${data.householdName}`);
  }

  lines.push('');

  if (data.type === 'entry' && data.entry) {
    lines.push(`${data.entry.label}`);
    lines.push(`${formatDuration(data.entry.durationMinutes)}`);
    lines.push(`${data.entry.performedBy} → ${data.entry.beneficiaryText}`);
  }

  if ((data.type === 'score' || data.type === 'balance') && data.balances) {
    for (const b of data.balances) {
      const sign = b.minutes >= 0 ? '+' : '';
      lines.push(`${b.name}: ${sign}${formatDuration(b.minutes)}`);
    }
  }

  if (data.type === 'compensation' && data.compensations) {
    lines.push('Rattrapages');
    for (const c of data.compensations) {
      lines.push(`  ${c.from} → ${c.to}: ${formatDuration(c.minutes)}`);
    }
  }

  if (data.performedMinutes && Object.keys(data.performedMinutes).length > 0) {
    lines.push('');
    lines.push('Temps effectué:');
    for (const [name, mins] of Object.entries(data.performedMinutes)) {
      lines.push(`  ${name}: ${formatDuration(mins)}`);
    }
  }

  lines.push('');
  lines.push('fait avec ♡ par ChoreScore');

  return lines.join('\n');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: 320,
    // Subtle shadow for card appearance
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brandName: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 18,
  },
  periodLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  householdName: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  content: {
    marginBottom: spacing.md,
  },
  entryLabel: {
    marginBottom: spacing.xs,
    color: colors.text,
  },
  metricValue: {
    ...typography.metric,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  entryMeta: {
    color: colors.textSecondary,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    color: colors.text,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  balanceName: {
    flex: 1,
    color: colors.text,
    marginRight: spacing.md,
  },
  balanceValue: {
    ...typography.bodyBold,
  },
  performedSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  performedLabel: {
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  compensationText: {
    color: colors.text,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
});
