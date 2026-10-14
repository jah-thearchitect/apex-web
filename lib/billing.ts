import "server-only";
import { Resend } from "resend";
import type { BusinessSettings } from "@/generated/prisma/client";
import { formatMoney, paymentMethodNote, subtotal, workStartNote } from "./money";
import { formatDate } from "./posts";
import { prisma } from "./prisma";
import { SITE_URL } from "./site";

export async function getSettings(): Promise<BusinessSettings> {
  return prisma.businessSettings.upsert({ where: { id: "singleton" }, create: {}, update: {} });
}

/** Next number in a sequence: "Q-0001", "INV-0001". Atomic. */
export async function nextNumber(name: "quote" | "invoice") {
  const row = await prisma.counter.upsert({
    where: { name },
    create: { name, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${name === "quote" ? "Q" : "INV"}-${String(row.value).padStart(4, "0")}`;
}

export const quoteUrl = (token: string) => `${SITE_URL}/q/${token}`;
export const invoiceUrl = (token: string) => `${SITE_URL}/i/${token}`;

export type DisplayStatus = "Draft" | "Sent" | "Viewed" | "Paid" | "Overdue" | "Void";

export function invoiceDisplayStatus(inv: { status: string; dueDate: Date }): DisplayStatus {
  if (inv.status === "PAID") return "Paid";
  if (inv.status === "VOID") return "Void";
  if (inv.status === "DRAFT") return "Draft";
  // Overdue only once the whole due day has passed, so "due on receipt"
  // (due date = today) doesn't show as overdue the moment it's sent.
  if (inv.dueDate.getTime() + 86_400_000 < Date.now()) return "Overdue";
  return inv.status === "VIEWED" ? "Viewed" : "Sent";
}

export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Shared light, table-based email shell (matches the Minutes emails).
export function emailShell(heading: string, bodyHtml: string, cta: { label: string; url: string }, footer: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F1F1EE;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F1EE;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<tr><td style="background:#0A0B0D;padding:22px 32px;">
  <span style="display:inline-block;vertical-align:middle;border:1px solid #8a6a36;padding:5px 12px;font-family:Georgia,serif;font-size:17px;color:#EDEEEC;">Apex</span>
  <img src="${SITE_URL}/brand/apex-mark-dark.png" width="44" height="29" alt="" style="display:inline-block;vertical-align:middle;margin-left:10px;border:0;">
</td></tr>
<tr><td style="padding:36px 32px 12px;">
  <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:26px;font-weight:500;line-height:1.25;color:#101113;">${heading}</h1>
  ${bodyHtml}
  <p style="margin:28px 0 8px;"><a href="${cta.url}" style="display:inline-block;background:#0A0B0D;color:#EDEEEC;font-family:'Courier New',monospace;font-size:13px;letter-spacing:1px;text-decoration:none;padding:13px 22px;">${cta.label}</a></p>
</td></tr>
<tr><td style="padding:20px 32px 30px;border-top:1px solid #e3e3de;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#8A8D8F;">${footer}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

export const P = (s: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#2b2d31;">${s}</p>`;

export async function send(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BILLING_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email isn't configured (RESEND_API_KEY / BILLING_FROM_EMAIL).");
  const replyTo = process.env.BILLING_REPLY_TO || undefined;
  const { error } = await new Resend(apiKey).emails.send({ from, to, subject, html, text, replyTo });
  if (error) throw new Error(error.message);
}

type ItemRow = { quantity: number; unitCents: number };

export async function emailQuote(q: {
  number: string; token: string; title: string; validUntil: Date | null;
  client: { contactName: string; email: string }; items: ItemRow[];
}) {
  const s = await getSettings();
  const first = q.client.contactName.split(/\s+/)[0] || "there";
  const total = formatMoney(subtotal(q.items));
  const valid = q.validUntil ? ` It's valid through ${formatDate(q.validUntil)}.` : "";
  const html = emailShell(
    esc(`Your proposal: ${q.title}`),
    P(`Hi ${esc(first)},`) +
      P(`Your proposal from ${esc(s.legalName)} is ready. Quote ${q.number} totals <strong>${total}</strong>.${valid}`) +
      P("You can review the full scope and accept it online."),
    { label: "Review the proposal", url: quoteUrl(q.token) },
    `${esc(s.legalName)} &middot; Quote ${q.number}`
  );
  const text = `Hi ${first},\n\nYour proposal from ${s.legalName} is ready. Quote ${q.number} totals ${total}.${valid}\n\nReview and accept it here: ${quoteUrl(q.token)}`;
  await send(q.client.email, `Proposal ${q.number}: ${q.title}`, html, text);
}

export async function emailInvoice(inv: {
  number: string; token: string; title: string; dueDate: Date; kind: string;
  client: { contactName: string; email: string; paymentMethod?: string }; items: ItemRow[];
}) {
  const s = await getSettings();
  const first = inv.client.contactName.split(/\s+/)[0] || "there";
  const total = formatMoney(subtotal(inv.items));
  const what = inv.kind === "DEPOSIT" ? "Your deposit invoice" : "Your invoice";
  const method = paymentMethodNote(inv.client.paymentMethod ?? "STRIPE");
  const html = emailShell(
    esc(`${what}: ${inv.title}`),
    P(`Hi ${esc(first)},`) +
      P(`${what} ${inv.number} from ${esc(s.legalName)} is ready. The amount due is <strong>${total}</strong>, due ${formatDate(inv.dueDate)}.`) +
      (workStartNote(inv.kind) ? P(`<strong>${workStartNote(inv.kind)}</strong>`) : "") +
      (method ? P(method) + P("You can view it and download a PDF.") : P("You can view it, download a PDF, and pay online.")),
    { label: method ? "View invoice" : "View & pay invoice", url: invoiceUrl(inv.token) },
    `${esc(s.legalName)} &middot; Invoice ${inv.number}`
  );
  const start = workStartNote(inv.kind);
  const text = `Hi ${first},\n\n${what} ${inv.number} from ${s.legalName} is ready. Amount due: ${total}, due ${formatDate(inv.dueDate)}.${start ? `\n\n${start}` : ""}${method ? `\n\n${method}` : ""}\n\n${method ? "View" : "View and pay"}: ${invoiceUrl(inv.token)}`;
  await send(inv.client.email, `Invoice ${inv.number} from ${s.legalName}`, html, text);
}

/** Heads-up to the firm (quote accepted, invoice paid). Never throws. */
export async function notifyFirm(subject: string, lines: string[]) {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.INQUIRY_TO_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BILLING_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!to || !apiKey || !from) return;
  try {
    await new Resend(apiKey).emails.send({ from, to, subject, text: lines.join("\n") });
  } catch (err) {
    console.error("Firm notification failed:", err);
  }
}

/** Branded "payment received" note to the client. Never throws. */
export async function emailPaymentReceipt(inv: {
  number: string; token: string; title: string;
  client: { contactName: string; email: string };
}, amountCents: number, method: string) {
  try {
    const s = await getSettings();
    const first = inv.client.contactName.split(/\s+/)[0] || "there";
    const amount = formatMoney(amountCents);
    const html = emailShell(
      esc(`Payment received: ${inv.number}`),
      P(`Hi ${esc(first)},`) +
        P(`Thank you. We received your payment of <strong>${amount}</strong> for invoice ${inv.number} (${esc(inv.title)}).`) +
        P("The invoice now shows as paid, and you can download a PDF copy for your records."),
      { label: "View paid invoice", url: invoiceUrl(inv.token) },
      `${esc(s.legalName)} &middot; Invoice ${inv.number} &middot; Paid via ${esc(method)}`
    );
    const text = `Hi ${first},\n\nThank you. We received your payment of ${amount} for invoice ${inv.number} (${inv.title}).\n\nView the paid invoice: ${invoiceUrl(inv.token)}`;
    await send(inv.client.email, `Payment received: Invoice ${inv.number}`, html, text);
  } catch (err) {
    console.error("Payment receipt email failed:", err);
  }
}
