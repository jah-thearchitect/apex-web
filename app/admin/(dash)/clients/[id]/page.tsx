import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/admin/ClientForm";
import { CopyLink, RequestAction } from "@/components/admin/RequestButtons";
import { invoiceDisplayStatus } from "@/lib/billing";
import { updateUrl } from "@/lib/briefs";
import { formatMoney, subtotal } from "@/lib/money";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Client" };

const BRIEF_STATUS: Record<string, string> = { SENT: "Sent", STARTED: "In progress", SUBMITTED: "Submitted" };
const REQ_STATUS: Record<string, string> = { NEW: "New", IN_PROGRESS: "In progress", DONE: "Done" };
const QUOTE_STATUS: Record<string, string> = { DRAFT: "Draft", SENT: "Sent", VIEWED: "Viewed", ACCEPTED: "Accepted", DECLINED: "Declined" };

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.client.findUnique({
    where: { id },
    include: {
      quotes: { orderBy: { createdAt: "desc" }, include: { items: true } },
      invoices: { orderBy: { createdAt: "desc" }, include: { items: true } },
      contact: { include: { inquiries: { orderBy: { createdAt: "desc" } } } },
      buildBriefs: { orderBy: { createdAt: "desc" } },
      changeRequests: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!c) notFound();

  const open = c.invoices.filter((i) => i.status === "SENT" || i.status === "VIEWED");
  const paid = c.invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amountPaidCents, 0);

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin/clients" className="admin-back">&larr; All clients</Link>
          <h1>{c.businessName}</h1>
          <p className="admin-sub">
            {c.contactName} &middot; <a href={`mailto:${c.email}`}>{c.email}</a>
            {c.phone && <> &middot; {c.phone}</>}
          </p>
        </div>
        <div className="editor-actions">
          <Link className="btn-ghost" href={`/admin/quotes/new?client=${c.id}`}>New quote</Link>
          <Link className="btn-solid" href={`/admin/invoices/new?client=${c.id}`}>New invoice</Link>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat"><span>Outstanding</span><strong>{formatMoney(open.reduce((s, i) => s + subtotal(i.items), 0))}</strong><small>{open.length} open</small></div>
        <div className="stat"><span>Paid to date</span><strong>{formatMoney(paid)}</strong></div>
        <div className="stat"><span>Quotes</span><strong>{c.quotes.length}</strong></div>
      </div>

      <div className="overview-grid">
        <section className="overview-card">
          <h2 className="admin-h2">Invoices</h2>
          {c.invoices.length === 0 ? <p className="admin-empty">No invoices yet.</p> : (
            <table className="admin-table"><tbody>
              {c.invoices.map((i) => (
                <tr key={i.id}>
                  <td><Link href={`/admin/invoices/${i.id}`}>{i.number}</Link><br /><small>{i.title}</small></td>
                  <td>{formatMoney(subtotal(i.items))}</td>
                  <td><span className={`pill ${invoiceDisplayStatus(i) === "Paid" ? "pill-live" : invoiceDisplayStatus(i) === "Overdue" ? "pill-warn" : ""}`}>{invoiceDisplayStatus(i)}</span></td>
                </tr>
              ))}
            </tbody></table>
          )}
        </section>
        <section className="overview-card">
          <h2 className="admin-h2">Quotes</h2>
          {c.quotes.length === 0 ? <p className="admin-empty">No quotes yet.</p> : (
            <table className="admin-table"><tbody>
              {c.quotes.map((q) => (
                <tr key={q.id}>
                  <td><Link href={`/admin/quotes/${q.id}`}>{q.number}</Link><br /><small>{q.title}</small></td>
                  <td>{formatMoney(subtotal(q.items))}</td>
                  <td><span className={`pill ${q.status === "ACCEPTED" ? "pill-live" : ""}`}>{QUOTE_STATUS[q.status]}</span></td>
                </tr>
              ))}
            </tbody></table>
          )}
        </section>
      </div>

      <div className="overview-grid" style={{ marginTop: 24 }}>
        <section className="overview-card">
          <h2 className="admin-h2">Build brief</h2>
          {c.buildBriefs.length === 0 ? (
            <p className="admin-empty">None yet. It goes out automatically when a deposit is paid.</p>
          ) : (
            <table className="admin-table"><tbody>
              {c.buildBriefs.map((b) => (
                <tr key={b.id}>
                  <td><Link href={`/admin/requests/brief/${b.id}`}>{b.submittedAt ? `Submitted ${formatDate(b.submittedAt)}` : b.sentAt ? `Sent ${formatDate(b.sentAt)}` : "Not sent"}</Link></td>
                  <td><span className={`pill ${b.status === "SUBMITTED" ? "pill-live" : ""}`}>{BRIEF_STATUS[b.status]}</span></td>
                </tr>
              ))}
            </tbody></table>
          )}
          <div style={{ marginTop: 16 }}>
            <RequestAction
              action="sendBrief" id={c.id}
              label={c.buildBriefs.some((b) => b.status !== "SUBMITTED") ? "Resend build brief" : "Send build brief"}
              confirm={`Email the build brief to ${c.email}?`}
            />
          </div>
        </section>
        <section className="overview-card">
          <h2 className="admin-h2">Update requests</h2>
          {c.changeRequests.length === 0 ? <p className="admin-empty">No update requests yet.</p> : (
            <table className="admin-table"><tbody>
              {c.changeRequests.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/admin/requests/update/${r.id}`}>{r.kind}</Link><br /><small>{formatDate(r.createdAt)}</small></td>
                  <td><span className={`pill ${r.status === "DONE" ? "pill-live" : r.status === "NEW" ? "pill-warn" : ""}`}>{REQ_STATUS[r.status]}</span></td>
                </tr>
              ))}
            </tbody></table>
          )}
          <p className="admin-sub" style={{ margin: "16px 0 8px" }}>Their permanent update link:</p>
          <CopyLink url={updateUrl(c.requestToken)} />
          <div style={{ marginTop: 10 }}>
            <RequestAction action="sendUpdateLink" id={c.id} label="Email it to them" confirm={`Email the update link to ${c.email}?`} />
          </div>
        </section>
      </div>

      {c.contact && c.contact.inquiries.length > 0 && (
        <>
          <h2 className="admin-h2" style={{ marginTop: 40 }}>Inquiries</h2>
          <div className="inquiry-list">
            {c.contact.inquiries.map((q) => (
              <article key={q.id} className="inquiry-item">
                <p className="pill">{formatDate(q.createdAt)}</p>
                <p className="inquiry-body">{q.details}</p>
              </article>
            ))}
          </div>
        </>
      )}

      <h2 className="admin-h2" style={{ marginTop: 40 }}>Client details</h2>
      <ClientForm
        client={{
          id: c.id, businessName: c.businessName, contactName: c.contactName, email: c.email,
          phone: c.phone ?? "", addressLine1: c.addressLine1 ?? "", addressLine2: c.addressLine2 ?? "",
          city: c.city ?? "", state: c.state ?? "", postalCode: c.postalCode ?? "", notes: c.notes ?? "", status: c.status, paymentMethod: c.paymentMethod,
        }}
      />
    </>
  );
}
