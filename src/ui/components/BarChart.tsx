/**
 * ChoreScore V2 — Bar Chart Component
 *
 * Simple bar chart for displaying time performed per member.
 * Names and values are directly readable on the chart.
 * No color-coded legends needed.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, spacing, borderRadius } from '../design-system/theme';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarData[];
  maxValue?: number;
  formatValue?: (value: number) => string;
}

export function BarChart({
  data,
  maxValue,
  formatValue = (v) => `${v} min`,
}: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <View style={styles.container}>
      {data.map((item, index) => (
        <View key={item.label} style={styles.barRow}>
          <Text variant="body" style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.min((Math.abs(item.value) / max) * 100, 100)}%`,
                  backgroundColor: item.color || colors.chartColors[index % colors.chartColors.length],
                },
              ]}
            />
          </View>
          <Text variant="bodyBold" style={styles.value}>
            {formatValue(item.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    width: 80,
    color: colors.text,
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  value: {
    width: 60,
    textAlign: 'right',
    color: colors.text,
  },
});
