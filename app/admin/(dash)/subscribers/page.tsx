import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subscribers" };

export default async function Subscribers() {
  const subs = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, firstName: true, lastName: true, status: true, source: true, createdAt: true, unsubscribedAt: true },
  });
  const active = subs.filter((s) => s.status === "ACTIVE").length;

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">THE MASTERMIND MINUTES</p>
          <h1>Subscribers</h1>
          <p className="admin-sub">{active} active &middot; {subs.length - active} unsubscribed</p>
        </div>
        <a className="btn-solid" href="/api/admin/subscribers-csv">Download CSV</a>
      </div>

      {subs.length === 0 ? (
        <p className="admin-empty">No one has joined yet. Signups from the site show up here.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Status</th><th>Joined from</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id}>
                <td>{[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}</td>
                <td>{s.email}</td>
                <td>
                  <span className={`pill ${s.status === "ACTIVE" ? "pill-live" : ""}`}>
                    {s.status === "ACTIVE" ? "Active" : `Unsubscribed${s.unsubscribedAt ? ` ${formatDate(s.unsubscribedAt)}` : ""}`}
                  </span>
                </td>
                <td>{s.source ?? "—"}</td>
                <td>{formatDate(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
