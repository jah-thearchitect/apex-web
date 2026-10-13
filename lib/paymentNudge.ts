import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { formatMoney, PAYMENT_METHOD_LABEL, subtotal } from "./money";
import { formatDate } from "./posts";
import { prisma } from "./prisma";
import { SITE_URL } from "./site";

// "Did it arrive?" emails to the firm for invoices paid outside the site
// (Gusto direct deposit, check, bank transfer). The email's button opens a
// confirm page; the link is signed so it works without signing in, and it
// never marks anything paid on a plain GET (mail scanners open links).

const LINK_DAYS = 30;
const REPEAT_DAYS = 3;
const MAX_NUDGES = 5;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set.");
  return s;
}
const sign = (invoiceId: string, exp: number) =>
  createHmac("sha256", secret()).update(`mark-paid:${invoiceId}:${exp}`).digest("base64url");

export function confirmUrl(invoiceId: string) {
  const exp = Date.now() + LINK_DAYS * 86_400_000;
  const q = new URLSearchParams({ i: invoiceId, e: String(exp), s: sign(invoiceId, exp) });
  return `${SITE_URL}/payments/confirm?${q}`;
}

/** True if the link's signature is valid and it hasn't expired. */
export function verifyConfirm(invoiceId: string, exp: string, sig: string) {
  const e = Number(exp);
  if (!invoiceId || !Number.isFinite(e) || e < Date.now()) return false;
  const expected = Buffer.from(sign(invoiceId, e));
  const given = Buffer.from(sig ?? "");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Sends due reminders. Called daily by cron; returns how many went out. */
export async function sendPaymentNudges(): Promise<number> {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.INQUIRY_TO_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BILLING_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!to || !apiKey || !from) return 0;

  const now = Date.now();
  const due = await prisma.invoice.findMany({
    where: {
      status: { in: ["SENT", "VIEWED"] },
      dueDate: { lte: new Date(now) },
      client: { paymentMethod: { in: ["GUSTO", "OFFLINE"] } },
      paymentNudgeCount: { lt: MAX_NUDGES },
      OR: [{ paymentNudgeAt: null }, { paymentNudgeAt: { lte: new Date(now - REPEAT_DAYS * 86_400_000 + 3_600_000) } }],
    },
    include: { client: true, items: true },
    orderBy: { dueDate: "asc" },
  });

  const resend = new Resend(apiKey);
  let sent = 0;
  for (const inv of due) {
    // Claim before sending so overlapping runs can't double-send.
    const claimed = await prisma.invoice.updateMany({
      where: { id: inv.id, paymentNudgeCount: inv.paymentNudgeCount },
      data: { paymentNudgeAt: new Date(), paymentNudgeCount: { increment: 1 } },
    });
    if (!claimed.count) continue;

    const amount = formatMoney(subtotal(inv.items));
    const via = PAYMENT_METHOD_LABEL[inv.client.paymentMethod] ?? "offline payment";
    const url = confirmUrl(inv.id);
    const again = inv.paymentNudgeCount > 0 ? " (reminder)" : "";
    const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#F1F1EE;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;">
<tr><td style="background:#0A0B0D;padding:18px 28px;"><span style="border:1px solid #8a6a36;padding:4px 11px;font-family:Georgia,serif;font-size:16px;color:#EDEEEC;">Apex</span></td></tr>
<tr><td style="padding:28px;">
<p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#8A6220;">PAYMENT CHECK${again.toUpperCase()}</p>
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:500;color:#101113;">Did ${amount} from ${inv.client.businessName} arrive?</h1>
<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#2b2d31;">Invoice <strong>${inv.number}</strong> (${inv.title}) was due ${formatDate(inv.dueDate)}, paid by ${via}.</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#2b2d31;">If it's in your account, mark it paid. The client gets their receipt automatically.</p>
<p style="margin:0 0 10px;"><a href="${url}" style="display:inline-block;background:#0A0B0D;color:#EDEEEC;font-family:'Courier New',monospace;font-size:13px;letter-spacing:1px;text-decoration:none;padding:13px 22px;">Mark as paid</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#8A8D8F;">Not there yet? Do nothing; you'll get another check in ${REPEAT_DAYS} days.</p>
</td></tr></table></td></tr></table></body></html>`;
    const text = `Did ${amount} from ${inv.client.businessName} arrive?\n\nInvoice ${inv.number} (${inv.title}) was due ${formatDate(inv.dueDate)}, paid by ${via}.\n\nMark as paid: ${url}\n\nNot there yet? Do nothing; you'll get another check in ${REPEAT_DAYS} days.`;
    try {
      await resend.emails.send({ from, to, subject: `Did it arrive? ${inv.number} — ${amount} from ${inv.client.businessName}`, html, text });
      sent++;
    } catch (err) {
      console.error("Payment nudge failed:", err);
    }
  }
  return sent;
}
