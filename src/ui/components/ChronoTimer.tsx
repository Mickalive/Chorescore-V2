/**
 * ChoreScore V2 — Chrono Timer Component
 *
 * Live timer that counts up from a start time.
 * Survives app backgrounding by recalculating from startedAt.
 * Follows DESIGN_BRIEF: large, immediately readable duration.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from '../design-system/theme';

interface ChronoTimerProps {
  isRunning: boolean;
  startedAt: string | null;
  onElapsed?: (minutes: number) => void;
}

export function ChronoTimer({ isRunning, startedAt, onElapsed }: ChronoTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && startedAt) {
      const updateElapsed = () => {
        const now = Date.now();
        const start = new Date(startedAt).getTime();
        const diffMs = Math.max(0, now - start);
        const minutes = Math.floor(diffMs / 60000);
        setElapsed(minutes);
      };

      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 10000); // Update every 10 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsed(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, startedAt]);

  useEffect(() => {
    if (onElapsed && !isRunning && elapsed > 0) {
      onElapsed(elapsed);
    }
  }, [isRunning]);

  if (!isRunning) return null;

  const hours = Math.floor(elapsed / 60);
  const mins = elapsed % 60;

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text variant="metric" style={styles.time}>
        {hours > 0 ? `${hours}h ` : ''}{mins > 0 ? `${mins} min` : '0 min'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  time: {
    color: colors.text,
  },
});
