import "server-only";
import { notifyFirm } from "./billing";
import { formatMoney } from "./money";
import { prisma } from "./prisma";

/**
 * Marks an invoice paid. Idempotent: Stripe can deliver the same webhook
 * more than once, and a second call leaves the first payment untouched.
 * A paid invoice makes its client ACTIVE.
 */
export async function markInvoicePaid(
  invoiceId: string,
  payment: { amountCents: number; method: string; stripePaymentIntentId?: string | null; stripeCheckoutId?: string | null }
) {
  const updated = await prisma.invoice.updateMany({
    where: { id: invoiceId, status: { not: "PAID" } },
    data: {
      status: "PAID",
      paidAt: new Date(),
      amountPaidCents: payment.amountCents,
      paymentMethod: payment.method,
      stripePaymentIntentId: payment.stripePaymentIntentId ?? undefined,
      stripeCheckoutId: payment.stripeCheckoutId ?? undefined,
    },
  });
  if (updated.count === 0) return false;

  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { client: true } });
  if (inv) {
    await prisma.client.update({ where: { id: inv.clientId }, data: { status: "ACTIVE" } });
    await notifyFirm(`Paid: ${inv.number} — ${inv.client.businessName}`, [
      `${inv.client.businessName} paid invoice ${inv.number} (${inv.title}).`,
      `Amount: ${formatMoney(payment.amountCents)} via ${payment.method}.`,
    ]);
  }
  return true;
}
