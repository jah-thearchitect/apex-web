import Link from "next/link";
import { formatMoney, subtotal } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clients" };

const STATUS: Record<string, string> = { LEAD: "Lead", ACTIVE: "Active", PAST: "Past" };

export default async function ClientsList() {
  const clients = await prisma.client.findMany({
    orderBy: [{ status: "asc" }, { businessName: "asc" }],
    include: { invoices: { where: { status: { in: ["SENT", "VIEWED"] } }, include: { items: true } } },
  });

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">CLIENT PORTAL</p>
          <h1>Clients</h1>
          <p className="admin-sub">{clients.length} client{clients.length === 1 ? "" : "s"}</p>
        </div>
        <Link className="btn-solid" href="/admin/clients/new">New client</Link>
      </div>

      {clients.length === 0 ? (
        <p className="admin-empty">No clients yet. Add one, or open a contact and choose &ldquo;Make client&rdquo;.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Business</th><th>Contact</th><th>Status</th><th>Outstanding</th></tr></thead>
          <tbody>
            {clients.map((c) => {
              const owed = c.invoices.reduce((s, i) => s + subtotal(i.items), 0);
              return (
                <tr key={c.id}>
                  <td><Link href={`/admin/clients/${c.id}`}>{c.businessName}</Link></td>
                  <td>{c.contactName}<br /><small>{c.email}</small></td>
                  <td><span className={`pill ${c.status === "ACTIVE" ? "pill-live" : ""}`}>{STATUS[c.status]}</span></td>
                  <td>{owed ? formatMoney(owed) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
