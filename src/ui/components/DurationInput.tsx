/**
 * ChoreScore V2 — Duration Input Component
 *
 * Manual duration entry with hours and minutes.
 * Clean, compact, warm design following DESIGN_BRIEF.
 */

import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Text } from './Text';
import { colors, spacing, borderRadius } from '../design-system/theme';

interface DurationInputProps {
  hours: number;
  minutes: number;
  onHoursChange: (h: number) => void;
  onMinutesChange: (m: number) => void;
}

export function DurationInput({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
}: DurationInputProps) {
  const handleHoursChange = (text: string) => {
    const val = parseInt(text, 10);
    if (isNaN(val)) {
      onHoursChange(0);
    } else {
      onHoursChange(Math.max(0, Math.min(23, val)));
    }
  };

  const handleMinutesChange = (text: string) => {
    const val = parseInt(text, 10);
    if (isNaN(val)) {
      onMinutesChange(0);
    } else {
      onMinutesChange(Math.max(0, Math.min(59, val)));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={hours > 0 ? String(hours) : ''}
          onChangeText={handleHoursChange}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Durée heures"
        />
        <Text variant="caption" style={styles.unit}>h</Text>
      </View>
      <Text variant="body" style={styles.separator}>:</Text>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={minutes > 0 ? String(minutes) : ''}
          onChangeText={handleMinutesChange}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="00"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Durée minutes"
        />
        <Text variant="caption" style={styles.unit}>min</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  input: {
    width: 36,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    padding: 0,
  },
  unit: {
    marginLeft: 2,
  },
  separator: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
