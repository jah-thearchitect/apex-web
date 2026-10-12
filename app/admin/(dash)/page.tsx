import Link from "next/link";
import { invoiceDisplayStatus } from "@/lib/billing";
import { formatMoney, subtotal } from "@/lib/money";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [open, paidThisMonth, quotes, clients, subscribers] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "VIEWED"] } },
      include: { client: { select: { businessName: true } }, items: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.invoice.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amountPaidCents: true } }),
    prisma.quote.findMany({
      where: { status: { in: ["SENT", "VIEWED"] } },
      include: { client: { select: { businessName: true } }, items: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.subscriber.count({ where: { status: "ACTIVE" } }),
  ]);

  const outstanding = open.reduce((s, i) => s + subtotal(i.items), 0);
  const overdue = open.filter((i) => invoiceDisplayStatus(i) === "Overdue");

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">CLIENT PORTAL</p>
          <h1>Overview</h1>
        </div>
        <div className="editor-actions">
          <Link className="btn-ghost" href="/admin/quotes/new">New quote</Link>
          <Link className="btn-solid" href="/admin/invoices/new">New invoice</Link>
        </div>
      </div>

      {!stripeConfigured() && (
        <p className="admin-notice">Online payments aren&rsquo;t connected yet. Invoices still send and can be marked paid by hand; the Pay button switches on once the Stripe keys are added in Vercel.</p>
      )}

      <div className="stat-row">
        <div className="stat"><span>Outstanding</span><strong>{formatMoney(outstanding)}</strong><small>{open.length} open invoice{open.length === 1 ? "" : "s"}</small></div>
        <div className="stat"><span>Overdue</span><strong className={overdue.length ? "warn" : ""}>{overdue.length}</strong><small>{formatMoney(overdue.reduce((s, i) => s + subtotal(i.items), 0))}</small></div>
        <div className="stat"><span>Paid this month</span><strong>{formatMoney(paidThisMonth._sum.amountPaidCents ?? 0)}</strong><small>since {formatDate(monthStart)}</small></div>
        <div className="stat"><span>Active clients</span><strong>{clients}</strong><small>{subscribers} Minutes subscribers</small></div>
      </div>

      <div className="overview-grid">
        <section className="overview-card">
          <h2 className="admin-h2">Open invoices</h2>
          {open.length === 0 ? <p className="admin-empty">Nothing outstanding.</p> : (
            <table className="admin-table">
              <tbody>
                {open.slice(0, 8).map((i) => (
                  <tr key={i.id}>
                    <td><Link href={`/admin/invoices/${i.id}`}>{i.number}</Link><br /><small>{i.client.businessName}</small></td>
                    <td>{formatMoney(subtotal(i.items))}</td>
                    <td><span className={`pill ${invoiceDisplayStatus(i) === "Overdue" ? "pill-warn" : ""}`}>{invoiceDisplayStatus(i)}</span><br /><small>due {formatDate(i.dueDate)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="overview-card">
          <h2 className="admin-h2">Quotes awaiting a decision</h2>
          {quotes.length === 0 ? <p className="admin-empty">No quotes out right now.</p> : (
            <table className="admin-table">
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td><Link href={`/admin/quotes/${q.id}`}>{q.number}</Link><br /><small>{q.client.businessName}</small></td>
                    <td>{formatMoney(subtotal(q.items))}</td>
                    <td><span className="pill">{q.status === "VIEWED" ? "Viewed" : "Sent"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
