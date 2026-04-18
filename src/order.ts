// src/order.ts
import { formatPrice, formatDate } from "./utils/formatter";
export function getOrderSummary(amount: number, date: Date) {
  // Avoid UTC day-shift by formatting in a stable local calendar representation
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `Order: ${formatPrice(amount)} on ${yyyy}-${mm}-${dd}`;
}
