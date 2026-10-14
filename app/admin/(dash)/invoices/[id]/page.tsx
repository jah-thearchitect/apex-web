import { notFound } from "next/navigation";
import { DocEditor } from "@/components/admin/DocEditor";
import { editorContext, ymd } from "@/lib/adminDocs";
import { invoiceDisplayStatus } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice" };

export default async function EditInvoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } }, quote: { select: { id: true, number: true } }, changeRequest: { select: { id: true, kind: true } } },
  });
  if (!inv) notFound();
  const ctx = await editorContext(inv.clientId);
  const display = invoiceDisplayStatus(inv);
  return (
    <DocEditor
      type="invoice"
      {...ctx}
      doc={{
        id: inv.id,
        number: inv.number,
        token: inv.token,
        status: inv.status,
        displayStatus: display === "Paid" ? `Paid ${formatMoney(inv.amountPaidCents)}${inv.paymentMethod ? ` via ${inv.paymentMethod}` : ""}` : display,
        clientId: inv.clientId,
        title: inv.title,
        notes: inv.notes,
        kind: inv.kind,
        issueDate: ymd(inv.issueDate),
        dueDate: ymd(inv.dueDate),
        sentAt: inv.sentAt?.toISOString() ?? null,
        locked: inv.status === "PAID" || inv.status === "VOID",
        items: inv.items,
        relatedLinks: [
          { label: "View client", href: `/admin/clients/${inv.clientId}` },
          ...(inv.quote ? [{ label: `From quote ${inv.quote.number}`, href: `/admin/quotes/${inv.quote.id}` }] : []),
          ...(inv.changeRequest ? [{ label: `From update request: ${inv.changeRequest.kind}`, href: `/admin/requests/update/${inv.changeRequest.id}` }] : []),
        ],
      }}
    />
  );
}
