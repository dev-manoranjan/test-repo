/**
 * Returns the current UTC timestamp as an ISO string.
 */
export function getCurrentUtcTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Formats a Date object into YYYY-MM-DD string.
 */
export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns true if the given date is in the past.
 */
export function isPastDate(date: Date): boolean {
  return date.getTime() < Date.now();
}
