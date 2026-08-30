/**
 * ChoreScore V2 — Member Selector Component
 *
 * Compact selector for "Fait par" (single) and "Fait pour" (multi).
 * Follows DESIGN_CONTRACT: usable with large households, no color-based identity.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Text } from './Text';
import { colors, spacing, borderRadius } from '../design-system/theme';
import { Member } from '../../domain/entities';

interface MemberSelectorProps {
  label: string;
  members: Member[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  allowMultiple?: boolean;
  showEveryone?: boolean;
}

export function MemberSelector({
  label,
  members,
  selectedIds,
  onSelectionChange,
  allowMultiple = false,
  showEveryone = false,
}: MemberSelectorProps) {
  const toggleMember = (memberId: string) => {
    if (!allowMultiple) {
      onSelectionChange([memberId]);
      return;
    }

    if (selectedIds.includes(memberId)) {
      const next = selectedIds.filter(id => id !== memberId);
      onSelectionChange(next.length > 0 ? next : [memberId]);
    } else {
      onSelectionChange([...selectedIds, memberId]);
    }
  };

  const toggleEveryone = () => {
    if (!allowMultiple) return;
    if (selectedIds.length === members.length) {
      onSelectionChange([members[0]?.id].filter(Boolean) as string[]);
    } else {
      onSelectionChange(members.map(m => m.id));
    }
  };

  const isEveryoneSelected = allowMultiple && selectedIds.length === members.length;

  return (
    <View style={styles.container}>
      <Text variant="caption" style={styles.label}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {showEveryone && allowMultiple && (
          <TouchableOpacity
            style={[styles.chip, isEveryoneSelected && styles.chipSelected]}
            onPress={toggleEveryone}
            activeOpacity={0.7}
          >
            <Text
              variant="body"
              color={isEveryoneSelected ? colors.textOnPrimary : colors.text}
              style={styles.chipText}
            >
              Tout le monde
            </Text>
          </TouchableOpacity>
        )}
        {members.map(member => {
          const isSelected = selectedIds.includes(member.id);
          return (
            <TouchableOpacity
              key={member.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleMember(member.id)}
              activeOpacity={0.7}
            >
              <Text
                variant="body"
                color={isSelected ? colors.textOnPrimary : colors.text}
                style={styles.chipText}
              >
                {member.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontWeight: '500',
  },
});
