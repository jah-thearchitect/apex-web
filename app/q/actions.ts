"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { emailInvoice, getSettings, nextNumber, notifyFirm } from "@/lib/billing";
import { depositCents, formatMoney, subtotal } from "@/lib/money";
import { prisma } from "@/lib/prisma";

/**
 * Client accepts a quote from its private link. Records the typed name,
 * then (if the quote asks for a deposit) creates the deposit invoice,
 * emails it, and sends the client straight to it to pay.
 */
export async function acceptQuote(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const agreed = formData.get("agree") === "on";
  const q = await prisma.quote.findUnique({ where: { token }, include: { client: true, items: true } });
  if (!q) redirect("/");
  if (!name || !agreed) redirect(`/q/${token}?error=1#accept`);
  if (q.status === "ACCEPTED") redirect(`/q/${token}`);
  if (q.validUntil && q.validUntil.getTime() < Date.now() - 86_400_000) redirect(`/q/${token}?expired=1`);

  // Only the first acceptance counts, even if the button is pressed twice.
  const claimed = await prisma.quote.updateMany({
    where: { id: q.id, status: { not: "ACCEPTED" } },
    data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedName: name },
  });
  if (claimed.count === 0) redirect(`/q/${token}`);

  const total = subtotal(q.items);
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await notifyFirm(`Accepted: ${q.number} — ${q.client.businessName}`, [
    `${name} accepted quote ${q.number} (${q.title}) for ${q.client.businessName}.`,
    `Total: ${formatMoney(total)}. Deposit: ${q.depositPercent}%.`,
    `IP: ${ip}`,
  ]);

  if (q.depositPercent > 0) {
    const s = await getSettings();
    const amount = depositCents(total, q.depositPercent);
    const inv = await prisma.invoice.create({
      data: {
        number: await nextNumber("invoice"),
        clientId: q.clientId,
        quoteId: q.id,
        kind: "DEPOSIT",
        title: `Deposit — ${q.title}`,
        notes: s.invoiceFooter,
        dueDate: new Date(),
        status: "SENT",
        sentAt: new Date(),
        items: {
          create: [{ position: 0, description: `${q.depositPercent}% deposit for ${q.number}: ${q.title}`, quantity: 1, unitCents: amount }],
        },
      },
      include: { client: true, items: true },
    });
    try {
      await emailInvoice(inv);
    } catch (err) {
      console.error("Deposit invoice email failed:", err);
    }
    redirect(`/i/${inv.token}?from=quote`);
  }
  redirect(`/q/${token}?accepted=1`);
}

export async function declineQuote(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const q = await prisma.quote.findUnique({ where: { token }, include: { client: true } });
  if (!q) redirect("/");
  if (q.status !== "ACCEPTED") {
    await prisma.quote.update({ where: { id: q.id }, data: { status: "DECLINED", declinedAt: new Date() } });
    await notifyFirm(`Declined: ${q.number} — ${q.client.businessName}`, [`Quote ${q.number} (${q.title}) was declined.`]);
  }
  redirect(`/q/${token}`);
}
