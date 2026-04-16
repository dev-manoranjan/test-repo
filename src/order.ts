// src/order.ts
import { formatPrice, formatDate } from "./utils/formatter";
export function getOrderSummary(amount: number, date: Date) {
  return `Order: ${formatPrice(amount)} on ${formatDate(date)}`;
}
