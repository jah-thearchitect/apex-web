import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatMoney, PAYMENT_METHOD_LABEL, subtotal } from "@/lib/money";
import { markInvoicePaid } from "@/lib/payments";
import { verifyConfirm } from "@/lib/paymentNudge";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirm payment", robots: { index: false, follow: false } };

const METHOD_WORD: Record<string, string> = { GUSTO: "Gusto", OFFLINE: "check / bank transfer" };

// Opened from the "Did it arrive?" email. Viewing does nothing; only the
// button (a POST) marks the invoice paid, after re-checking the signature.
async function confirm(form: FormData) {
  "use server";
  const i = String(form.get("i") ?? "");
  const e = String(form.get("e") ?? "");
  const s = String(form.get("s") ?? "");
  const q = new URLSearchParams({ i, e, s });
  if (!verifyConfirm(i, e, s)) redirect(`/payments/confirm?${q}`);
  const inv = await prisma.invoice.findUnique({ where: { id: i }, include: { client: true, items: true } });
  if (inv && inv.status !== "PAID" && inv.status !== "VOID") {
    await markInvoicePaid(inv.id, { amountCents: subtotal(inv.items), method: METHOD_WORD[inv.client.paymentMethod] ?? "manual" });
  }
  redirect(`/payments/confirm?${q}&done=1`);
}

export default async function ConfirmPayment({ searchParams }: { searchParams: Promise<{ i?: string; e?: string; s?: string; done?: string }> }) {
  const { i = "", e = "", s = "", done } = await searchParams;
  const valid = verifyConfirm(i, e, s);
  const inv = valid ? await prisma.invoice.findUnique({ where: { id: i }, include: { client: true, items: true } }) : null;

  return (
    <main className="admin-login">
      <div className="inquiry-panel" style={{ maxWidth: 520 }}>
        <p className="eyebrow">PAYMENT CHECK</p>
        {!valid || !inv ? (
          <>
            <h3>This link has expired.</h3>
            <p>Open the invoice in Admin and use &ldquo;Record payment received&rdquo; instead.</p>
          </>
        ) : inv.status === "PAID" ? (
          <>
            <h3>{inv.number} is marked paid.</h3>
            <p>
              {formatMoney(inv.amountPaidCents)} from {inv.client.businessName}
              {inv.paidAt ? `, recorded ${formatDate(inv.paidAt)}` : ""}.{done ? " The client's receipt is on its way." : ""}
            </p>
          </>
        ) : inv.status === "VOID" ? (
          <>
            <h3>{inv.number} was voided.</h3>
            <p>Nothing to record.</p>
          </>
        ) : (
          <>
            <h3>Mark {inv.number} as paid?</h3>
            <p>
              {formatMoney(subtotal(inv.items))} from <strong>{inv.client.businessName}</strong> ({inv.title}), via{" "}
              {PAYMENT_METHOD_LABEL[inv.client.paymentMethod] ?? "offline payment"}. The client will get their receipt.
            </p>
            <form action={confirm} style={{ marginTop: 22 }}>
              <input type="hidden" name="i" value={i} />
              <input type="hidden" name="e" value={e} />
              <input type="hidden" name="s" value={s} />
              <button type="submit" className="btn-solid">Yes, it arrived — mark paid</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
