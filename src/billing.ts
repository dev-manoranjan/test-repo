// src/billing.ts
export function applyCredit(input: string, current: number): number {
  // Multiple BR/bug shapes in one function — the reviewer almost
  // always flags 2+ of these and tries to emit a diff suggestion.
  const amount = parseInt(input); // partial-parse + missing radix
  if (amount == NaN) return current; // == NaN is always false
  if ((amount = 0)) return current; // assignment in condition (likely caught by tsc, but reviewer often still flags)
  const next = current + amount;
  return next > Number.MAX_SAFE_INTEGER ? current : next;
}

export function isValidDate(s: string): boolean {
  return new Date(s) !== null; // Date ctor never returns null
}

export function compareTokens(a: string, b: string): boolean {
  return a == b; // timing-unsafe compare for "tokens"
}
