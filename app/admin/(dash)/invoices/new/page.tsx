import { DocEditor } from "@/components/admin/DocEditor";
import { editorContext } from "@/lib/adminDocs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "New invoice" };

export default async function NewInvoice({ searchParams }: { searchParams: Promise<{ client?: string; request?: string }> }) {
  const sp = await searchParams;
  // ?request=<id>: bill an update request. Prefills the client, a title,
  // and the request as the line item; the price is left for you to set.
  const req = sp.request
    ? await prisma.changeRequest.findUnique({ where: { id: sp.request }, include: { invoice: { select: { number: true } } } })
    : null;
  const ctx = await editorContext(req?.clientId ?? sp.client ?? "");
  if (!req) return <DocEditor type="invoice" {...ctx} />;

  const details = req.details.length > 600 ? `${req.details.slice(0, 600)}…` : req.details;
  return (
    <DocEditor
      type="invoice"
      {...ctx}
      defaults={{
        ...ctx.defaults,
        title: `Update: ${req.kind}`,
        items: [{ description: `${req.kind} (${req.build})`, details, quantity: 1, unitCents: 0 }],
        changeRequestId: req.invoice ? undefined : req.id,
        note: req.invoice
          ? `This request was already billed on ${req.invoice.number}. Saving makes a separate invoice that isn't linked to it.`
          : `Billing the update request from ${req.name}. Set the price, then save or send.`,
      }}
    />
  );
}
