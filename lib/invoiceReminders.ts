import "server-only";
import { emailInvoiceReminder } from "./billing";
import { claimKey, dueAutoKind, inSendingHours, QUIET_HOURS, type ReminderKind } from "./invoiceReminderRules";
import { subtotal } from "./money";
import { prisma } from "./prisma";

const HOUR = 3_600_000;

type Result = { ok: true } | { ok: false; error: string };

/**
 * Emails the client a reminder about an unpaid invoice and records it.
 * Manual reminders (the Remind button) are recorded after they send;
 * automatic ones claim their slot first, so two overlapping cron runs can't
 * both send, and give the slot back if the email fails so the next run retries.
 */
export async function sendInvoiceReminder(invoiceId: string, kind: ReminderKind): Promise<Result> {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { client: true, items: true } });
  if (!inv) return { ok: false, error: "Invoice not found." };
  if (inv.status !== "SENT" && inv.status !== "VIEWED") return { ok: false, error: `This invoice is ${inv.status.toLowerCase()}, so there's nothing to remind about.` };
  if (subtotal(inv.items) <= 0) return { ok: false, error: "The invoice total is $0, so there's nothing to collect." };

  if (kind === "MANUAL") {
    // A guard against a double click, not a rule: the button asks first, too.
    const recent = await prisma.invoiceReminder.findFirst({ where: { invoiceId, createdAt: { gte: new Date(Date.now() - HOUR) } }, orderBy: { createdAt: "desc" } });
    if (recent) {
      const mins = Math.max(1, Math.round((Date.now() - recent.createdAt.getTime()) / 60_000));
      return { ok: false, error: `A reminder went out ${mins} minute${mins === 1 ? "" : "s"} ago. Give it a bit before sending another.` };
    }
    try {
      await emailInvoiceReminder(inv);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "The email didn't send." };
    }
    await prisma.invoiceReminder.create({ data: { invoiceId, kind } });
    return { ok: true };
  }

  if (!inv.sentAt) return { ok: false, error: "This invoice hasn't been sent." };
  const key = claimKey(invoiceId, inv.sentAt, kind);
  try {
    await prisma.invoiceReminder.create({ data: { invoiceId, kind, claimKey: key } });
  } catch {
    return { ok: false, error: "Already sent." };
  }
  try {
    await emailInvoiceReminder(inv);
  } catch (err) {
    await prisma.invoiceReminder.delete({ where: { claimKey: key } }).catch(() => {});
    return { ok: false, error: err instanceof Error ? err.message : "The email didn't send." };
  }
  return { ok: true };
}

/**
 * Hourly: sends the 48-hour and 72-hour reminders that are due, during the
 * working day only. Skips invoices with automatic reminders switched off,
 * and ones that were reminded in the last 12 hours.
 */
export async function runInvoiceReminders(now = new Date()): Promise<{ sent: number; skipped: string }> {
  if (!inSendingHours(now)) return { sent: 0, skipped: "outside sending hours" };
  const candidates = await prisma.invoice.findMany({
    where: {
      status: { in: ["SENT", "VIEWED"] },
      autoReminders: true,
      sentAt: { not: null, lte: new Date(now.getTime() - 48 * HOUR), gt: new Date(now.getTime() - 96 * HOUR) },
      reminders: { none: { createdAt: { gte: new Date(now.getTime() - QUIET_HOURS * HOUR) } } },
    },
    select: { id: true, sentAt: true },
  });
  let sent = 0;
  for (const c of candidates) {
    const kind = dueAutoKind(c.sentAt!, now);
    if (!kind) continue;
    const r = await sendInvoiceReminder(c.id, kind);
    if (r.ok) sent++;
    else if (r.error !== "Already sent.") console.error(`Invoice reminder (${kind}) for ${c.id} failed:`, r.error);
  }
  return { sent, skipped: "" };
}
