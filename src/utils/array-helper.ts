/**
 * Returns unique values from an array.
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Splits an array into chunks of the given size.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Returns the last element of an array, or undefined if empty.
 */
export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}
