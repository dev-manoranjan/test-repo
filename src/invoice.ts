// src/invoice.ts
import { formatPrice, formatDate } from "./utils/formatter";
export function getInvoiceDetails(amount: number, date: Date) {
  return `Invoice: ${formatPrice(amount)} due ${formatDate(date)}`;
}
