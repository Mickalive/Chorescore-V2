/**
 * ChoreScore V2 — Civil Month Filtering
 *
 * Pure functions for filtering entries by civil month.
 * Free mode shows only the current civil month.
 * Premium/Trial/Standard/Pro show full archive.
 */

/**
 * Get the civil year and month from an ISO date string.
 * Returns [year, month] where month is 1-indexed (1=January, 12=December).
 */
export function getCivilYearMonth(isoDateString: string): [number, number] {
  const date = new Date(isoDateString);
  return [date.getFullYear(), date.getMonth() + 1];
}

/**
 * Check if an entry's occurredAt falls within a given civil month.
 */
export function isInCivilMonth(
  occurredAt: string,
  year: number,
  month: number
): boolean {
  const [entryYear, entryMonth] = getCivilYearMonth(occurredAt);
  return entryYear === year && entryMonth === month;
}

/**
 * Get the current civil year and month.
 */
export function getCurrentCivilMonth(): [number, number] {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1];
}

/**
 * Get the first day of a civil month as an ISO date string.
 */
export function getMonthStart(year: number, month: number): string {
  return new Date(year, month - 1, 1).toISOString();
}

/**
 * Get the last day of a civil month as an ISO date string.
 */
export function getMonthEnd(year: number, month: number): string {
  return new Date(year, month, 0, 23, 59, 59, 999).toISOString();
}

/**
 * Check if two civil months are the same.
 */
export function isSameCivilMonth(
  y1: number,
  m1: number,
  y2: number,
  m2: number
): boolean {
  return y1 === y2 && m1 === m2;
}

/**
 * Check if month (y1, m1) is strictly before month (y2, m2).
 */
export function isBeforeCivilMonth(
  y1: number,
  m1: number,
  y2: number,
  m2: number
): boolean {
  if (y1 < y2) return true;
  if (y1 > y2) return false;
  return m1 < m2;
}
