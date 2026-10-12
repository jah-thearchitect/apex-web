import Link from "next/link";
import { formatMoney, subtotal } from "@/lib/money";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quotes" };

const STATUS: Record<string, string> = { DRAFT: "Draft", SENT: "Sent", VIEWED: "Viewed", ACCEPTED: "Accepted", DECLINED: "Declined" };

export default async function QuotesList() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { businessName: true } }, items: true },
  });
  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">CLIENT PORTAL</p>
          <h1>Quotes</h1>
        </div>
        <Link className="btn-solid" href="/admin/quotes/new">New quote</Link>
      </div>
      {quotes.length === 0 ? <p className="admin-empty">No quotes yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Quote</th><th>Client</th><th>Total</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td><Link href={`/admin/quotes/${q.id}`}>{q.number}</Link><br /><small>{q.title}</small></td>
                <td>{q.client.businessName}</td>
                <td>{formatMoney(subtotal(q.items))}</td>
                <td><span className={`pill ${q.status === "ACCEPTED" ? "pill-live" : ""}`}>{STATUS[q.status]}</span></td>
                <td>{formatDate(q.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
