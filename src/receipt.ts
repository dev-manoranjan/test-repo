// src/receipt.ts
import { formatPrice } from "./utils/formatter";
export function printReceipt(amount: number) {
  return `Receipt total: ${formatPrice(amount)}`;
}
