import { NextResponse } from "next/server";
import { invoiceUrl } from "@/lib/billing";
import { subtotal } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// Starts a Stripe Checkout session for an invoice and returns its URL.
// The browser then navigates to Stripe; the webhook marks the invoice paid.
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Online payment isn't connected yet. Please contact the firm to pay." }, { status: 503 });

  const inv = await prisma.invoice.findUnique({ where: { token }, include: { client: true, items: true } });
  if (!inv) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (inv.status === "PAID") return NextResponse.json({ error: "This invoice is already paid." }, { status: 409 });
  if (inv.status === "VOID" || inv.status === "DRAFT") return NextResponse.json({ error: "This invoice can't be paid." }, { status: 409 });
  if (inv.client.paymentMethod !== "STRIPE") return NextResponse.json({ error: "This invoice is paid outside the website. Please see the payment note on the invoice." }, { status: 409 });

  const amount = subtotal(inv.items);
  if (amount <= 0) return NextResponse.json({ error: "Nothing is due on this invoice." }, { status: 409 });

  // One Stripe customer per client, so payments group together in Stripe.
  // A saved ID can be stale: test-mode customers don't exist once live keys
  // are in, and customers can be deleted in the dashboard. Recreate if so.
  let customerId = inv.client.stripeCustomerId;
  if (customerId) {
    const existing = await stripe.customers.retrieve(customerId).catch(() => null);
    if (!existing || existing.deleted) customerId = null;
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: inv.client.email,
      name: inv.client.businessName,
      metadata: { clientId: inv.clientId },
    });
    customerId = customer.id;
    await prisma.client.update({ where: { id: inv.clientId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: { name: `Invoice ${inv.number}`, description: inv.title.slice(0, 300) },
        },
      },
    ],
    payment_intent_data: { description: `Invoice ${inv.number} — ${inv.title}`.slice(0, 500), metadata: { invoiceId: inv.id } },
    metadata: { invoiceId: inv.id },
    success_url: `${invoiceUrl(inv.token)}?paid=1`,
    cancel_url: invoiceUrl(inv.token),
  });
  await prisma.invoice.update({ where: { id: inv.id }, data: { stripeCheckoutId: session.id } });
  return NextResponse.json({ url: session.url });
}
