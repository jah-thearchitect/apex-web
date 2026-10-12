import { notFound } from "next/navigation";
import { DocEditor } from "@/components/admin/DocEditor";
import { editorContext, ymd } from "@/lib/adminDocs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quote" };

const STATUS: Record<string, string> = { DRAFT: "Draft", SENT: "Sent", VIEWED: "Viewed", ACCEPTED: "Accepted", DECLINED: "Declined" };

export default async function EditQuote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await prisma.quote.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } }, invoices: { select: { id: true, number: true } } },
  });
  if (!q) notFound();
  const ctx = await editorContext(q.clientId);
  return (
    <DocEditor
      type="quote"
      {...ctx}
      doc={{
        id: q.id,
        number: q.number,
        token: q.token,
        status: q.status,
        displayStatus: STATUS[q.status] + (q.status === "ACCEPTED" && q.acceptedName ? ` by ${q.acceptedName}` : ""),
        clientId: q.clientId,
        title: q.title,
        intro: q.intro,
        terms: q.terms,
        validUntil: q.validUntil ? ymd(q.validUntil) : "",
        depositPercent: q.depositPercent,
        sentAt: q.sentAt?.toISOString() ?? null,
        locked: q.status === "ACCEPTED",
        items: q.items,
        relatedLinks: [
          { label: "View client", href: `/admin/clients/${q.clientId}` },
          ...q.invoices.map((i) => ({ label: `Deposit invoice ${i.number}`, href: `/admin/invoices/${i.id}` })),
        ],
      }}
    />
  );
}
