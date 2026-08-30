/**
 * ChoreScore V2 — Civil Month Filtering Tests
 *
 * Tests for the civil month utility functions.
 */

import {
  isInCivilMonth,
  getCurrentCivilMonth,
  getCivilYearMonth,
  getMonthStart,
  getMonthEnd,
  isSameCivilMonth,
  isBeforeCivilMonth,
} from '../../src/domain/calculations/civilMonth';

describe('Civil Month Filtering', () => {
  describe('getCivilYearMonth', () => {
    it('should extract year and month from ISO date string', () => {
      const [year, month] = getCivilYearMonth('2026-08-15T10:00:00Z');
      expect(year).toBe(2026);
      expect(month).toBe(8);
    });

    it('should handle January correctly', () => {
      const [year, month] = getCivilYearMonth('2026-01-01T00:00:00Z');
      expect(year).toBe(2026);
      expect(month).toBe(1);
    });

    it('should handle December correctly', () => {
      const [year, month] = getCivilYearMonth('2026-12-31T23:59:59Z');
      expect(year).toBe(2026);
      expect(month).toBe(12);
    });
  });

  describe('isInCivilMonth', () => {
    it('should return true for same year and month', () => {
      expect(isInCivilMonth('2026-08-15T10:00:00Z', 2026, 8)).toBe(true);
    });

    it('should return false for different month', () => {
      expect(isInCivilMonth('2026-08-15T10:00:00Z', 2026, 7)).toBe(false);
    });

    it('should return false for different year', () => {
      expect(isInCivilMonth('2026-08-15T10:00:00Z', 2025, 8)).toBe(false);
    });

    it('should return true for first day of month', () => {
      expect(isInCivilMonth('2026-08-01T00:00:00Z', 2026, 8)).toBe(true);
    });

    it('should return true for last day of month', () => {
      expect(isInCivilMonth('2026-08-31T23:59:59Z', 2026, 8)).toBe(true);
    });
  });

  describe('getCurrentCivilMonth', () => {
    it('should return current year and month', () => {
      const [year, month] = getCurrentCivilMonth();
      const now = new Date();
      expect(year).toBe(now.getFullYear());
      expect(month).toBe(now.getMonth() + 1);
    });

    it('should return month in range 1-12', () => {
      const [, month] = getCurrentCivilMonth();
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
    });
  });

  describe('getMonthStart', () => {
    it('should return first day of month', () => {
      const start = getMonthStart(2026, 8);
      const date = new Date(start);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(7); // August is 7 in JS
      expect(date.getDate()).toBe(1);
    });
  });

  describe('getMonthEnd', () => {
    it('should return last day of month', () => {
      const end = getMonthEnd(2026, 8);
      const date = new Date(end);
      expect(date.getDate()).toBe(31);
    });

    it('should handle February in leap year', () => {
      const end = getMonthEnd(2028, 2);
      const date = new Date(end);
      expect(date.getDate()).toBe(29);
    });

    it('should handle February in non-leap year', () => {
      const end = getMonthEnd(2027, 2);
      const date = new Date(end);
      expect(date.getDate()).toBe(28);
    });
  });

  describe('isSameCivilMonth', () => {
    it('should return true for same year and month', () => {
      expect(isSameCivilMonth(2026, 8, 2026, 8)).toBe(true);
    });

    it('should return false for different month', () => {
      expect(isSameCivilMonth(2026, 8, 2026, 7)).toBe(false);
    });

    it('should return false for different year', () => {
      expect(isSameCivilMonth(2026, 8, 2025, 8)).toBe(false);
    });
  });

  describe('isBeforeCivilMonth', () => {
    it('should return true for earlier month same year', () => {
      expect(isBeforeCivilMonth(2026, 7, 2026, 8)).toBe(true);
    });

    it('should return false for same month', () => {
      expect(isBeforeCivilMonth(2026, 8, 2026, 8)).toBe(false);
    });

    it('should return false for later month', () => {
      expect(isBeforeCivilMonth(2026, 9, 2026, 8)).toBe(false);
    });

    it('should return true for earlier year', () => {
      expect(isBeforeCivilMonth(2025, 12, 2026, 1)).toBe(true);
    });

    it('should return false for later year', () => {
      expect(isBeforeCivilMonth(2027, 1, 2026, 12)).toBe(false);
    });
  });
});
