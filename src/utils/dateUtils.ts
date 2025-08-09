/**
 * Date utility functions for consistent date handling
 * Note: PostgreSQL TIMESTAMP WITH TIME ZONE automatically converts to UTC
 */

/**
 * Returns current timestamp
 */
export function getCurrentTimestamp(): Date {
  return new Date();
}

/**
 * Returns current timestamp in UTC (alias for getCurrentTimestamp)
 */
export function getCurrentTimestampUTC(): Date {
  return new Date();
}

/**
 * Returns current date as YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Returns current date in UTC as YYYY-MM-DD format
 */
export function getCurrentDateUTC(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Converts a date to YYYY-MM-DD format
 * @param date JavaScript Date object or date string
 */
export function toDateString(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Converts a date to UTC date string in YYYY-MM-DD format
 * @param date JavaScript Date object or date string
 */
export function toUTCDateString(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Converts a date string to Date object in UTC
 * @param dateString Date string in YYYY-MM-DD format
 */
export function dateStringToDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Converts a date string to UTC timestamp at midnight
 * @param dateString Date string in YYYY-MM-DD format
 */
export function dateStringToUTCTimestamp(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Adds days to a date and returns date string
 * @param date JavaScript Date object or date string
 * @param days Number of days to add
 */
export function addDaysToDate(date: Date | string, days: number): string {
  const result = new Date(typeof date === 'string' ? date : date.getTime());
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

/**
 * Adds months to a date and returns date string
 * @param date JavaScript Date object or date string
 * @param months Number of months to add
 */
export function addMonthsToDate(date: Date | string, months: number): string {
  const result = new Date(typeof date === 'string' ? date : date.getTime());
  result.setMonth(result.getMonth() + months);
  return result.toISOString().split('T')[0];
}

/**
 * Gets the start of day for a given date
 * @param date Date object
 */
export function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Gets the start of day in UTC for a given timestamp
 * @param timestamp UTC timestamp
 */
export function getStartOfDayUTC(timestamp: Date): Date {
  return new Date(Date.UTC(
    timestamp.getUTCFullYear(),
    timestamp.getUTCMonth(),
    timestamp.getUTCDate()
  ));
}

/**
 * Gets the end of day for a given date
 * @param date Date object
 */
export function getEndOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/**
 * Gets the end of day in UTC for a given timestamp
 * @param timestamp UTC timestamp
 */
export function getEndOfDayUTC(timestamp: Date): Date {
  return new Date(Date.UTC(
    timestamp.getUTCFullYear(),
    timestamp.getUTCMonth(),
    timestamp.getUTCDate(),
    23, 59, 59, 999
  ));
}

/**
 * Adds days to a UTC timestamp
 * @param timestamp UTC timestamp
 * @param days Number of days to add
 */
export function addDaysToTimestamp(timestamp: Date, days: number): Date {
  const result = new Date(timestamp);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Adds months to a UTC timestamp
 * @param timestamp UTC timestamp
 * @param months Number of months to add
 */
export function addMonthsToTimestamp(timestamp: Date, months: number): Date {
  const result = new Date(timestamp);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
} 