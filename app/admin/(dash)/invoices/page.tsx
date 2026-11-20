import Link from "next/link";
import { remindInvoiceFromList } from "@/app/admin/billing-actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { invoiceDisplayStatus } from "@/lib/billing";
import { formatMoney, subtotal } from "@/lib/money";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

const KIND: Record<string, string> = { STANDARD: "", DEPOSIT: "Deposit", RETAINER: "Retainer" };

export default async function InvoicesList({ searchParams }: { searchParams: Promise<{ show?: string; reminded?: string; remindError?: string }> }) {
  const q = await searchParams;
  const show = q.show ?? "all";
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { businessName: true, email: true } }, items: true, reminders: { orderBy: { createdAt: "desc" }, take: 1 } },
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
      {q.reminded && <p className="admin-notice">Reminder sent for {q.reminded}. You were blind-copied.</p>}
      {q.remindError && <p className="admin-notice" style={{ borderColor: "#c96b6b", color: "#e59a9a" }}>{q.remindError}</p>}
      {rows.length === 0 ? <p className="admin-empty">No invoices here.</p> : (
        <table className="admin-table">
          <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Status</th><th>Due</th><th /></tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td><Link href={`/admin/invoices/${i.id}`}>{i.number}</Link>{KIND[i.kind] && <> <span className="pill">{KIND[i.kind]}</span></>}<br /><small>{i.title}</small></td>
                <td>
                  {i.client.businessName}
                  {i.reminders[0] && <><br /><small>Reminded {formatDate(i.reminders[0].createdAt)}</small></>}
                  {["Sent", "Viewed", "Overdue"].includes(i.display) && i.total > 0 && (
                    <div className="mobile-only">
                      <span className={`pill ${i.display === "Overdue" ? "pill-warn" : ""}`}>{i.display}</span>
                      <form action={remindInvoiceFromList.bind(null, i.id)}>
                        <ConfirmSubmit className="btn-ghost" message={`Email ${i.client.email} a reminder about ${i.number}?`}>Remind</ConfirmSubmit>
                      </form>
                    </div>
                  )}
                </td>
                <td>{formatMoney(i.total)}</td>
                <td><span className={`pill ${i.display === "Paid" ? "pill-live" : i.display === "Overdue" ? "pill-warn" : ""}`}>{i.display}</span></td>
                <td>{formatDate(i.dueDate)}</td>
                <td style={{ textAlign: "right" }}>
                  {["Sent", "Viewed", "Overdue"].includes(i.display) && i.total > 0 && (
                    <form action={remindInvoiceFromList.bind(null, i.id)}>
                      <ConfirmSubmit className="btn-ghost" message={`Email ${i.client.email} a reminder about ${i.number}?`}>Remind</ConfirmSubmit>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
