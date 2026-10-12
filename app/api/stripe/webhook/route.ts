import { NextResponse } from "next/server";
import { markInvoicePaid } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";

// Stripe -> site. Verifies the signature, then marks the invoice paid once
// the money has actually cleared (card payments clear immediately; bank
// payments arrive later as async_payment_succeeded).
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe isn't configured." }, { status: 503 });

  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const invoiceId = session.metadata?.invoiceId;
    if (invoiceId && session.payment_status === "paid") {
      await markInvoicePaid(invoiceId, {
        amountCents: session.amount_total ?? 0,
        method: "Stripe",
        stripeCheckoutId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      });
    }
  }
  return NextResponse.json({ received: true });
}
