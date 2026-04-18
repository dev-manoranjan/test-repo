// src/utils/formatter.ts
export function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amount,
  );
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
