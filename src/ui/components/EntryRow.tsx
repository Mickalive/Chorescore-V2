/**
 * ChoreScore V2 — Entry Row Component
 *
 * Compact transaction-style row for the history list.
 * Follows DESIGN_CONTRACT: one line, label + duration first,
 * performed by/for + date secondary, menu compact.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from './Text';
import { colors, spacing, borderRadius } from '../design-system/theme';
import { CompletedEntry, Member } from '../../domain/entities';

interface EntryRowProps {
  entry: CompletedEntry;
  members: Member[];
  onEdit?: (entry: CompletedEntry) => void;
  onDelete?: (entryId: string) => void;
  onShare?: (entry: CompletedEntry) => void;
}

export function EntryRow({ entry, members, onEdit, onDelete, onShare }: EntryRowProps) {
  const [showMenu, setShowMenu] = useState(false);

  const performer = members.find(m => m.id === entry.performedByMemberId);
  const beneficiaries = entry.beneficiaryMemberIds
    .map(id => members.find(m => m.id === id))
    .filter(Boolean)
    .map(m => m!.name);

  const formatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m} min`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Aujourd'hui";
    if (isYesterday) return 'Hier';

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const handleLongPress = () => {
    setShowMenu(true);
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      'Supprimer',
      `Supprimer "${entry.label}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onDelete?.(entry.id),
        },
      ]
    );
  };

  const beneficiaryText = entry.beneficiaryMemberIds.length === members.length
    ? 'Tout le monde'
    : beneficiaries.join(', ');

  return (
    <TouchableOpacity
      style={styles.container}
      onLongPress={handleLongPress}
      onPress={() => setShowMenu(!showMenu)}
      activeOpacity={0.7}
    >
      <View style={styles.main}>
        <View style={styles.left}>
          <Text variant="bodyBold" numberOfLines={1} style={styles.label}>
            {entry.label}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {performer?.name || 'Inconnu'} → {beneficiaryText}
          </Text>
        </View>
        <View style={styles.right}>
          <Text variant="bodyBold" color={colors.primary}>
            {formatDuration(entry.durationMinutes)}
          </Text>
          <Text variant="caption" style={styles.date}>
            {formatDate(entry.occurredAt)}
          </Text>
        </View>
      </View>

      {showMenu && (
        <View style={styles.menu}>
          {onEdit && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onEdit(entry);
              }}
            >
              <Text variant="body" color={colors.primary}>Modifier</Text>
            </TouchableOpacity>
          )}
          {onShare && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onShare(entry);
              }}
            >
              <Text variant="body" color={colors.primary}>Partager</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDelete}
            >
              <Text variant="body" color={colors.error}>Supprimer</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  main: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    marginBottom: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  date: {
    marginTop: 2,
  },
  menu: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  menuItem: {
    paddingVertical: spacing.xs,
  },
});
