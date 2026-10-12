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

export function depositCents(totalCents: number, percent: number) {
  return Math.round((totalCents * percent) / 100);
}
