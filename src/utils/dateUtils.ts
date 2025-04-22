/**
 * Date utility functions for consistent UTC date handling
 */

/**
 * Returns current date in UTC as YYYY-MM-DD format
 */
export function getCurrentDateUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Converts a date to UTC date string in YYYY-MM-DD format
 * @param date JavaScript Date object or date string
 */
export function toUTCDateString(date: Date | string): string {
  if (typeof date === 'string') {
    // If already formatted as YYYY-MM-DD, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Otherwise parse it into a Date object
    date = new Date(date);
  }
  return date.toISOString().split('T')[0];
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