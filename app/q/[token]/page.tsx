import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/docs/DocumentView";
import { PrintButton } from "@/components/docs/DocButtons";
import { getSettings } from "@/lib/billing";
import { depositCents, subtotal } from "@/lib/money";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";
import { getAdminId } from "@/lib/session";
import { acceptQuote, declineQuote } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Proposal", robots: { index: false, follow: false } };

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; accepted?: string; expired?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const q = await prisma.quote.findUnique({
    where: { token },
    include: {
      client: true,
      items: { orderBy: { position: "asc" } },
      invoices: { where: { kind: "DEPOSIT" }, select: { token: true, status: true } },
    },
  });
  const isAdmin = !!(await getAdminId());
  if (!q || (q.status === "DRAFT" && !isAdmin)) notFound();

  if (q.status === "SENT" && !isAdmin) {
    await prisma.quote.update({ where: { id: q.id }, data: { status: "VIEWED", viewedAt: new Date() } });
  }

  const settings = await getSettings();
  const total = subtotal(q.items);
  const deposit = depositCents(total, q.depositPercent);
  const expired = !!q.validUntil && q.validUntil.getTime() < Date.now() - 86_400_000;
  const statusLabel = q.status === "ACCEPTED" ? "Accepted" : q.status === "DECLINED" ? "Declined" : expired ? "Expired" : q.status === "DRAFT" ? "Draft" : "Awaiting approval";
  const tone = q.status === "ACCEPTED" ? "paid" : q.status === "DECLINED" || expired ? "void" : "due";
  const depositInvoice = q.invoices[0];

  return (
    <div className="doc-page">
      <div className="doc-toolbar">
        <span className="doc-hint">{isAdmin && q.status === "DRAFT" ? "Draft preview" : "Proposal"}</span>
        <PrintButton />
      </div>

      <DocumentView
        kind="Quote"
        number={q.number}
        title={q.title}
        settings={settings}
        client={q.client}
        items={q.items}
        intro={q.intro}
        status={{ label: statusLabel, tone }}
        meta={[
          { label: "Date", value: formatDate(q.sentAt ?? q.createdAt) },
          ...(q.validUntil ? [{ label: "Valid until", value: formatDate(q.validUntil) }] : []),
        ]}
        extraTotals={q.depositPercent > 0 ? [{ label: `Deposit due to start (${q.depositPercent}%)`, cents: deposit, strong: true }] : []}
      >
        {(q.terms || settings.quoteTerms) && (
          <div className="doc-block">
            <h2>Terms</h2>
            <p className="doc-terms">{q.terms || settings.quoteTerms}</p>
          </div>
        )}

        {q.status === "ACCEPTED" ? (
          <div className="doc-action">
            <h2 className="doc-ok">Accepted{q.acceptedName ? ` by ${q.acceptedName}` : ""}{q.acceptedAt ? ` on ${formatDate(q.acceptedAt)}` : ""}.</h2>
            {depositInvoice && depositInvoice.status !== "PAID" && (
              <p>Your deposit invoice is ready. <Link href={`/i/${depositInvoice.token}`}>View and pay the deposit</Link>.</p>
            )}
            {depositInvoice?.status === "PAID" && <p>Your deposit is paid. The firm will be in touch to kick off your build.</p>}
            {sp.accepted && !depositInvoice && <p>Thank you. The firm will be in touch to kick off your build.</p>}
          </div>
        ) : q.status === "DECLINED" ? (
          <div className="doc-action">
            <h2>This proposal was declined.</h2>
            <p>If that was a mistake or you&rsquo;d like changes, reply to the email it came in.</p>
          </div>
        ) : expired || sp.expired ? (
          <div className="doc-action">
            <h2>This proposal has expired.</h2>
            <p>Reply to the email it came in and the firm will send an updated version.</p>
          </div>
        ) : q.status !== "DRAFT" ? (
          <div className="doc-action" id="accept">
            <h2>Accept this proposal</h2>
            <p>
              Type your name to accept the scope and terms above.
              {q.depositPercent > 0 && " You'll go straight to the deposit invoice to get started."}
            </p>
            <form action={acceptQuote}>
              <input type="hidden" name="token" value={q.token} />
              <input type="text" name="name" required maxLength={120} placeholder="Your full name" aria-label="Your full name" autoComplete="name" />
              <label className="check">
                <input type="checkbox" name="agree" required />
                <span>I&rsquo;m authorized to accept this proposal for {q.client.businessName} and agree to its terms.</span>
              </label>
              <div className="row">
                <button type="submit" className="doc-btn doc-btn-solid">Accept proposal</button>
              </div>
            </form>
            <form action={declineQuote} style={{ marginTop: 10 }}>
              <input type="hidden" name="token" value={q.token} />
              <button type="submit" className="doc-link-btn">Decline this proposal</button>
            </form>
            {sp.error && <p className="doc-alert">Type your name and tick the box to accept.</p>}
          </div>
        ) : null}
      </DocumentView>
    </div>
  );
}
