"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { emailInvoice, emailQuote, getSettings, nextNumber } from "@/lib/billing";
import { recordContact, splitName } from "@/lib/contacts";
import { subtotal, type LineItem } from "@/lib/money";
import { markInvoicePaid } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

type Result<T = { id: string }> = ({ ok: true } & T) | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const opt = (v: unknown, max = 500) => str(v, max) || null;

function cleanItems(items: LineItem[]): LineItem[] | string {
  const out: LineItem[] = [];
  for (const i of items) {
    const description = str(i.description, 300);
    if (!description) continue;
    const quantity = Math.max(1, Math.min(10000, Math.round(Number(i.quantity) || 1)));
    const unitCents = Math.round(Number(i.unitCents));
    if (!Number.isFinite(unitCents) || Math.abs(unitCents) > 100_000_000) return `Check the price on "${description}".`;
    out.push({ description, details: str(i.details, 2000), quantity, unitCents });
  }
  if (out.length === 0) return "Add at least one line item.";
  return out;
}

const toDate = (v: string | null | undefined) => (v ? new Date(`${v}T12:00:00`) : null);

// ---------- Clients ----------

export type ClientInput = {
  id?: string;
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
  status?: "LEAD" | "ACTIVE" | "PAST";
};

export async function saveClient(input: ClientInput): Promise<Result> {
  await requireAdmin();
  const email = str(input.email, 254).toLowerCase();
  const businessName = str(input.businessName, 160);
  const contactName = str(input.contactName, 120);
  if (!businessName) return { ok: false, error: "Add the business name." };
  if (!contactName) return { ok: false, error: "Add the contact's name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Add a valid email address." };

  // Keep Contacts in sync so the client's inquiries and signups show up on their record.
  const contactId = await recordContact({ email, ...splitName(contactName), source: "client" });
  const taken = await prisma.client.findFirst({ where: { contactId, NOT: input.id ? { id: input.id } : undefined } });

  const data = {
    businessName,
    contactName,
    email,
    phone: opt(input.phone, 40),
    addressLine1: opt(input.addressLine1, 160),
    addressLine2: opt(input.addressLine2, 160),
    city: opt(input.city, 80),
    state: opt(input.state, 40),
    postalCode: opt(input.postalCode, 20),
    notes: opt(input.notes, 5000),
    status: input.status ?? "LEAD",
    contactId: taken ? undefined : contactId,
  };
  const client = input.id
    ? await prisma.client.update({ where: { id: input.id }, data })
    : await prisma.client.create({ data });
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${client.id}`);
  return { ok: true, id: client.id };
}

/** "Make client" from a contact's page: prefilled client, then open it. */
export async function createClientFromContact(contactId: string) {
  await requireAdmin();
  const existing = await prisma.client.findUnique({ where: { contactId } });
  if (existing) redirect(`/admin/clients/${existing.id}`);
  const c = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!c) redirect("/admin/contacts");
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;
  const client = await prisma.client.create({
    data: { businessName: name, contactName: name, email: c.email, contactId: c.id },
  });
  redirect(`/admin/clients/${client.id}?new=1`);
}

// ---------- Quotes ----------

export type QuoteInput = {
  id?: string;
  clientId: string;
  title: string;
  intro: string;
  terms: string;
  validUntil: string | null;
  depositPercent: number;
  items: LineItem[];
};

export async function saveQuote(input: QuoteInput): Promise<Result<{ id: string; number: string }>> {
  await requireAdmin();
  const title = str(input.title, 200);
  if (!title) return { ok: false, error: "Give the quote a title." };
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) return { ok: false, error: "Pick a client." };
  const items = cleanItems(input.items);
  if (typeof items === "string") return { ok: false, error: items };
  if (input.id) {
    const current = await prisma.quote.findUnique({ where: { id: input.id } });
    if (current?.status === "ACCEPTED") return { ok: false, error: "This quote was accepted, so it can't be changed." };
  }

  const data = {
    clientId: client.id,
    title,
    intro: str(input.intro, 5000),
    terms: str(input.terms, 10000),
    validUntil: toDate(input.validUntil),
    depositPercent: Math.max(0, Math.min(100, Math.round(Number(input.depositPercent) || 0))),
  };
  const itemRows = items.map((i, position) => ({ ...i, details: i.details ?? "", position }));

  const quote = input.id
    ? await prisma.$transaction(async (tx) => {
        await tx.quoteItem.deleteMany({ where: { quoteId: input.id } });
        return tx.quote.update({ where: { id: input.id }, data: { ...data, items: { create: itemRows } } });
      })
    : await prisma.quote.create({ data: { ...data, number: await nextNumber("quote"), items: { create: itemRows } } });

  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/clients/${client.id}`);
  return { ok: true, id: quote.id, number: quote.number };
}

export async function sendQuote(id: string): Promise<Result> {
  await requireAdmin();
  const q = await prisma.quote.findUnique({ where: { id }, include: { client: true, items: true } });
  if (!q) return { ok: false, error: "Quote not found." };
  if (q.status === "ACCEPTED") return { ok: false, error: "This quote was already accepted." };
  if (subtotal(q.items) <= 0) return { ok: false, error: "The quote total must be more than $0." };
  try {
    await emailQuote(q);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Email failed." };
  }
  await prisma.quote.update({
    where: { id },
    data: { status: q.status === "DRAFT" || q.status === "DECLINED" ? "SENT" : q.status, sentAt: new Date() },
  });
  revalidatePath(`/admin/quotes/${id}`);
  revalidatePath("/admin/quotes");
  return { ok: true, id };
}

// ---------- Invoices ----------

export type InvoiceInput = {
  id?: string;
  clientId: string;
  title: string;
  notes: string;
  kind: "STANDARD" | "DEPOSIT" | "RETAINER";
  issueDate: string;
  dueDate: string;
  items: LineItem[];
};

export async function saveInvoice(input: InvoiceInput): Promise<Result<{ id: string; number: string }>> {
  await requireAdmin();
  const title = str(input.title, 200);
  if (!title) return { ok: false, error: "Give the invoice a title." };
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) return { ok: false, error: "Pick a client." };
  const items = cleanItems(input.items);
  if (typeof items === "string") return { ok: false, error: items };
  const issueDate = toDate(input.issueDate) ?? new Date();
  const dueDate = toDate(input.dueDate);
  if (!dueDate) return { ok: false, error: "Set a due date." };
  if (input.id) {
    const current = await prisma.invoice.findUnique({ where: { id: input.id } });
    if (current?.status === "PAID" || current?.status === "VOID") {
      return { ok: false, error: `This invoice is ${current.status.toLowerCase()}, so it can't be changed.` };
    }
  }

  const data = { clientId: client.id, title, notes: str(input.notes, 5000), kind: input.kind, issueDate, dueDate };
  const itemRows = items.map((i, position) => ({ ...i, details: i.details ?? "", position }));
  const invoice = input.id
    ? await prisma.$transaction(async (tx) => {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: input.id } });
        return tx.invoice.update({ where: { id: input.id }, data: { ...data, items: { create: itemRows } } });
      })
    : await prisma.invoice.create({ data: { ...data, number: await nextNumber("invoice"), items: { create: itemRows } } });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/clients/${client.id}`);
  return { ok: true, id: invoice.id, number: invoice.number };
}

export async function sendInvoice(id: string): Promise<Result> {
  await requireAdmin();
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { client: true, items: true } });
  if (!inv) return { ok: false, error: "Invoice not found." };
  if (inv.status === "PAID" || inv.status === "VOID") return { ok: false, error: `This invoice is ${inv.status.toLowerCase()}.` };
  if (subtotal(inv.items) <= 0) return { ok: false, error: "The invoice total must be more than $0." };
  try {
    await emailInvoice(inv);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Email failed." };
  }
  await prisma.invoice.update({ where: { id }, data: { status: inv.status === "DRAFT" ? "SENT" : inv.status, sentAt: new Date() } });
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  return { ok: true, id };
}

/** For payments made outside Stripe (check, cash, bank transfer). */
export async function recordManualPayment(id: string, method: string): Promise<Result> {
  await requireAdmin();
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!inv) return { ok: false, error: "Invoice not found." };
  if (inv.status === "VOID") return { ok: false, error: "This invoice is void." };
  await markInvoicePaid(id, { amountCents: subtotal(inv.items), method: str(method, 40) || "manual" });
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  return { ok: true, id };
}

export async function voidInvoice(id: string): Promise<Result> {
  await requireAdmin();
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return { ok: false, error: "Invoice not found." };
  if (inv.status === "PAID") return { ok: false, error: "A paid invoice can't be voided." };
  await prisma.invoice.update({ where: { id }, data: { status: "VOID" } });
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin/invoices");
  return { ok: true, id };
}

/** Copy an invoice as a new draft (e.g. next month's retainer). */
export async function duplicateInvoice(id: string) {
  await requireAdmin();
  const src = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!src) redirect("/admin/invoices");
  const s = await getSettings();
  const due = new Date(Date.now() + s.paymentTermsDays * 86_400_000);
  const copy = await prisma.invoice.create({
    data: {
      number: await nextNumber("invoice"),
      clientId: src.clientId,
      kind: src.kind === "DEPOSIT" ? "STANDARD" : src.kind,
      title: src.title,
      notes: src.notes,
      dueDate: due,
      items: { create: src.items.map(({ position, description, details, quantity, unitCents }) => ({ position, description, details, quantity, unitCents })) },
    },
  });
  redirect(`/admin/invoices/${copy.id}`);
}

// ---------- Settings & catalog ----------

export async function saveSettings(form: FormData): Promise<void> {
  await requireAdmin();
  const n = (k: string, min: number, max: number, dflt: number) => {
    const v = Math.round(Number(form.get(k)));
    return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : dflt;
  };
  await prisma.businessSettings.upsert({
    where: { id: "singleton" },
    create: {},
    update: {
      legalName: str(form.get("legalName"), 160) || "Apex Capital Consultants",
      addressLine1: str(form.get("addressLine1"), 160),
      addressLine2: str(form.get("addressLine2"), 160),
      city: str(form.get("city"), 80),
      state: str(form.get("state"), 40),
      postalCode: str(form.get("postalCode"), 20),
      billingEmail: str(form.get("billingEmail"), 254),
      phone: str(form.get("phone"), 40),
      paymentTermsDays: n("paymentTermsDays", 0, 120, 15),
      depositPercent: n("depositPercent", 0, 100, 50),
      quoteValidDays: n("quoteValidDays", 1, 365, 30),
      invoiceFooter: str(form.get("invoiceFooter"), 1000),
      quoteTerms: str(form.get("quoteTerms"), 10000),
    },
  });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function saveCatalogItem(form: FormData): Promise<void> {
  await requireAdmin();
  const name = str(form.get("name"), 200);
  const cents = Math.round(Number(String(form.get("price") ?? "").replace(/[$,\s]/g, "")) * 100);
  if (name && Number.isFinite(cents)) {
    await prisma.catalogItem.create({ data: { name, details: str(form.get("details"), 2000), unitCents: cents } });
  }
  revalidatePath("/admin/settings");
}

export async function deleteCatalogItem(id: string): Promise<void> {
  await requireAdmin();
  await prisma.catalogItem.deleteMany({ where: { id } });
  revalidatePath("/admin/settings");
}
