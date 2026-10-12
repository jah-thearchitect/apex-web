import Link from "next/link";
import { invoiceDisplayStatus } from "@/lib/billing";
import { formatMoney, subtotal } from "@/lib/money";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

const KIND: Record<string, string> = { STANDARD: "", DEPOSIT: "Deposit", RETAINER: "Retainer" };

export default async function InvoicesList({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const show = (await searchParams).show ?? "all";
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { businessName: true } }, items: true },
  });
  const rows = invoices
    .map((i) => ({ ...i, display: invoiceDisplayStatus(i), total: subtotal(i.items) }))
    .filter((i) => show === "all" || (show === "open" ? ["Sent", "Viewed", "Overdue"].includes(i.display) : i.display.toLowerCase() === show));

  const tabs = [["all", "All"], ["open", "Open"], ["overdue", "Overdue"], ["paid", "Paid"], ["draft", "Drafts"]];

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">CLIENT PORTAL</p>
          <h1>Invoices</h1>
          <p className="admin-sub tab-row">
            {tabs.map(([k, label]) => (
              <Link key={k} href={`/admin/invoices?show=${k}`} className={show === k ? "on" : ""}>{label}</Link>
            ))}
          </p>
        </div>
        <Link className="btn-solid" href="/admin/invoices/new">New invoice</Link>
      </div>
      {rows.length === 0 ? <p className="admin-empty">No invoices here.</p> : (
        <table className="admin-table">
          <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td><Link href={`/admin/invoices/${i.id}`}>{i.number}</Link>{KIND[i.kind] && <> <span className="pill">{KIND[i.kind]}</span></>}<br /><small>{i.title}</small></td>
                <td>{i.client.businessName}</td>
                <td>{formatMoney(i.total)}</td>
                <td><span className={`pill ${i.display === "Paid" ? "pill-live" : i.display === "Overdue" ? "pill-warn" : ""}`}>{i.display}</span></td>
                <td>{formatDate(i.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
