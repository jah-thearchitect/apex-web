import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/docs/DocumentView";
import { PayButton, PrintButton } from "@/components/docs/DocButtons";
import { getSettings, invoiceDisplayStatus } from "@/lib/billing";
import { formatMoney, paymentMethodNote, subtotal, workStartNote } from "@/lib/money";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";
import { getAdminId } from "@/lib/session";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; from?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const inv = await prisma.invoice.findUnique({
    where: { token },
    include: { client: true, items: { orderBy: { position: "asc" } } },
  });
  // Drafts are visible only to a signed-in admin (preview).
  const isAdmin = !!(await getAdminId());
  if (!inv || (inv.status === "DRAFT" && !isAdmin)) notFound();

  // First open by the client marks it viewed (admin previews don't count).
  if (inv.status === "SENT" && !isAdmin) {
    await prisma.invoice.update({ where: { id: inv.id }, data: { status: "VIEWED", viewedAt: new Date() } });
  }

  const settings = await getSettings();
  const total = subtotal(inv.items);
  const display = invoiceDisplayStatus(inv);
  const tone = display === "Paid" ? "paid" : display === "Void" ? "void" : display === "Draft" ? "neutral" : "due";
  const payable = inv.status !== "PAID" && inv.status !== "VOID" && inv.status !== "DRAFT";
  // Clients paid through Gusto or offline never see an online Pay button.
  const online = inv.client.paymentMethod === "STRIPE";
  const methodNote = paymentMethodNote(inv.client.paymentMethod);

  return (
    <div className="doc-page">
      <div className="doc-toolbar">
        <span className="doc-hint">{isAdmin && inv.status === "DRAFT" ? "Draft preview" : "Secure invoice"}</span>
        <div className="row" style={{ display: "flex", gap: 10 }}>
          <PrintButton />
          {payable && online && stripeConfigured() && <PayButton token={inv.token} label={`Pay ${formatMoney(total)}`} />}
        </div>
      </div>

      <DocumentView
        kind="Invoice"
        number={inv.number}
        title={inv.title}
        settings={settings}
        client={inv.client}
        items={inv.items}
        status={{ label: display, tone }}
        meta={[
          { label: "Issued", value: formatDate(inv.issueDate) },
          { label: "Due", value: inv.kind === "DEPOSIT" ? "On receipt" : formatDate(inv.dueDate) },
          ...(inv.paidAt ? [{ label: "Paid", value: formatDate(inv.paidAt) }] : []),
        ]}
        extraTotals={
          inv.status === "PAID"
            ? [{ label: "Paid", cents: inv.amountPaidCents }, { label: "Balance due", cents: 0, strong: true }]
            : [{ label: "Amount due", cents: total, strong: true }]
        }
        footerNote={inv.notes || settings.invoiceFooter}
      >
        {workStartNote(inv.kind) && inv.status !== "PAID" && inv.status !== "VOID" && (
          <p className="doc-start-note">{workStartNote(inv.kind)}</p>
        )}
        {methodNote && payable && <p className="doc-start-note">{methodNote}</p>}
        {sp.paid && inv.status !== "PAID" && (
          <div className="doc-action">
            <h2>Payment received — confirming.</h2>
            <p>Your payment went through. This page will show <strong>Paid</strong> as soon as the payment processor confirms it, usually within a minute.</p>
          </div>
        )}
        {inv.status === "PAID" && (
          <div className="doc-action">
            <h2 className="doc-ok">Paid in full. Thank you.</h2>
            <p>You can download this invoice as a PDF for your records.</p>
          </div>
        )}
        {sp.from === "quote" && inv.status !== "PAID" && (
          <div className="doc-action">
            <h2>Proposal accepted.</h2>
            <p>The next step is the deposit below. Once it&rsquo;s paid, the firm will reach out to kick off your build.</p>
            {online && !stripeConfigured() && <p className="doc-alert">Online payment is being set up. The firm will follow up with payment details.</p>}
          </div>
        )}
        {payable && online && !stripeConfigured() && sp.from !== "quote" && (
          <p className="doc-alert" style={{ marginTop: 24 }}>Online payment is being set up. Please contact the firm for payment details.</p>
        )}
      </DocumentView>
    </div>
  );
}
