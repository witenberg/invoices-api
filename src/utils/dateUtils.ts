/**
 * Date utility functions for consistent UTC date handling
 */

/**
 * Returns current date in UTC as YYYY-MM-DD format
 */
export function getCurrentDateUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )).toISOString().split('T')[0];
}

/**
 * Converts a date to UTC date string in YYYY-MM-DD format
 * @param date JavaScript Date object or date string
 */
export function toUTCDateString(date: string | Date): string {
  const d = new Date(date);
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate()
  )).toISOString().split('T')[0];
}

/**
 * Adds days to a date and returns UTC date string
 * @param date JavaScript Date object or date string
 * @param days Number of days to add
 */
export function addDaysToDate(date: Date | string, days: number): string {
  const result = new Date(typeof date === 'string' ? date : date.getTime());
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

/**
 * Adds months to a date and returns UTC date string
 * @param date JavaScript Date object or date string
 * @param months Number of months to add
 */
export function addMonthsToDate(date: Date | string, months: number): string {
  const result = new Date(typeof date === 'string' ? date : date.getTime());
  result.setMonth(result.getMonth() + months);
  return result.toISOString().split('T')[0];
}

export function formatDateForDisplay(date: string, timeZone: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone
  });
}

export function formatDateTimeForDisplay(date: string, timeZone: string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone
  });
} 