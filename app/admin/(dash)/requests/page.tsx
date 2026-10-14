import Link from "next/link";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Requests" };

const BRIEF: Record<string, string> = { SENT: "Sent", STARTED: "In progress", SUBMITTED: "Submitted" };
const REQ: Record<string, string> = { NEW: "New", IN_PROGRESS: "In progress", DONE: "Done" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const all = show === "all";
  const [requests, briefs] = await Promise.all([
    prisma.changeRequest.findMany({
      where: all ? {} : { status: { not: "DONE" } },
      orderBy: { createdAt: "desc" },
      include: { client: { select: { businessName: true } } },
      take: 200,
    }),
    prisma.buildBrief.findMany({ orderBy: { updatedAt: "desc" }, include: { client: { select: { businessName: true } } }, take: 100 }),
  ]);

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">CLIENT PORTAL</p>
          <h1>Requests</h1>
          <p className="admin-sub">Update requests from existing clients, and build briefs from new ones.</p>
        </div>
      </div>

      <div className="admin-head" style={{ marginBottom: 12 }}>
        <h2 className="admin-h2">Update requests</h2>
        <div className="tab-row">
          <Link href="/admin/requests" className={all ? "" : "on"}>Open</Link>
          <Link href="/admin/requests?show=all" className={all ? "on" : ""}>All</Link>
        </div>
      </div>
      {requests.length === 0 ? (
        <p className="admin-empty">{all ? "No update requests yet." : "Nothing open. New requests land here and in your email."}</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Client</th><th>Request</th><th>How soon</th><th>Status</th><th>Received</th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/requests/update/${r.id}`}>{r.client.businessName}</Link><br /><small>{r.name}</small></td>
                <td>{r.kind}<br /><small>{r.details.length > 90 ? `${r.details.slice(0, 90)}…` : r.details}</small></td>
                <td><span className={`pill ${r.urgency.startsWith("Urgent") ? "req-urgent" : ""}`}>{r.urgency}</span></td>
                <td><span className={`pill ${r.status === "DONE" ? "pill-live" : r.status === "NEW" ? "pill-warn" : ""}`}>{REQ[r.status]}</span></td>
                <td>{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="admin-h2" style={{ marginTop: 48 }}>Build briefs</h2>
      {briefs.length === 0 ? (
        <p className="admin-empty">No build briefs yet. One goes out automatically when a deposit is paid, or send one from a client&rsquo;s page.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Client</th><th>Status</th><th>Sent</th><th>Submitted</th></tr></thead>
          <tbody>
            {briefs.map((b) => (
              <tr key={b.id}>
                <td><Link href={`/admin/requests/brief/${b.id}`}>{b.client.businessName}</Link></td>
                <td><span className={`pill ${b.status === "SUBMITTED" ? "pill-live" : ""}`}>{BRIEF[b.status]}</span></td>
                <td>{b.sentAt ? formatDate(b.sentAt) : "—"}</td>
                <td>{b.submittedAt ? formatDate(b.submittedAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
