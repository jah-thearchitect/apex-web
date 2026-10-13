// Money is stored as integer cents everywhere; these are the only places
// that turn it into dollars.

export type LineItem = { description: string; details?: string; quantity: number; unitCents: number };

export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function lineTotal(item: Pick<LineItem, "quantity" | "unitCents">) {
  return item.quantity * item.unitCents;
}

export function subtotal(items: Pick<LineItem, "quantity" | "unitCents">[]) {
  return items.reduce((sum, i) => sum + lineTotal(i), 0);
}

/** "1,250.50" / "$1250" / "1250" -> 125050 cents. Returns null if not a number. */
export function parseDollars(input: string): number | null {
  const n = Number(input.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  STRIPE: "Online (card or bank via Stripe)",
  GUSTO: "Gusto direct deposit",
  OFFLINE: "Check or bank transfer",
};

/** How-to-pay line on invoices for clients who don't pay online. */
export function paymentMethodNote(method: string): string | null {
  if (method === "GUSTO") return "Payment via Gusto direct deposit. No card payment is needed.";
  if (method === "OFFLINE") return "Payment by check or bank transfer. The firm will share payment details.";
  return null;
}

/** Start-of-work line shown on invoices (none for retainers: work is ongoing). */
export function workStartNote(kind: string): string | null {
  if (kind === "DEPOSIT") return "Project work begins upon receipt of the deposit.";
  if (kind === "STANDARD") return "Project work begins upon receipt of payment.";
  return null;
}

export function depositCents(totalCents: number, percent: number) {
  return Math.round((totalCents * percent) / 100);
}
