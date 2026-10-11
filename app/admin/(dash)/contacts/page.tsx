import Link from "next/link";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contacts" };

const SOURCE_LABEL: Record<string, string> = { minutes: "Minutes", inquiry: "Inquiry", booking: "Booked call" };

export default async function Contacts() {
  const [contacts, subs] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { lastActivityAt: "desc" },
      include: { _count: { select: { inquiries: true } } },
    }),
    prisma.subscriber.findMany({ select: { email: true, status: true } }),
  ]);
  const subStatus = new Map(subs.map((s) => [s.email, s.status]));

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">EVERYONE WHO REACHED OUT</p>
          <h1>Contacts</h1>
          <p className="admin-sub">{contacts.length} contact{contacts.length === 1 ? "" : "s"} from Minutes signups, inquiries and booked calls</p>
        </div>
        <a className="btn-solid" href="/api/admin/contacts-csv">Download CSV</a>
      </div>

      {contacts.length === 0 ? (
        <p className="admin-empty">No contacts yet. Minutes signups, inquiries and booked consultations show up here.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Came from</th><th>Minutes</th><th>Last activity</th></tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const status = subStatus.get(c.email);
              return (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/contacts/${c.id}`}>{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</Link>
                  </td>
                  <td>{c.email}</td>
                  <td>
                    <span className="tag-row">
                      {c.sources.map((s) => <span key={s} className="pill">{SOURCE_LABEL[s] ?? s}</span>)}
                    </span>
                  </td>
                  <td>{status === "ACTIVE" ? "Subscribed" : status === "UNSUBSCRIBED" ? "Unsubscribed" : "—"}</td>
                  <td>{formatDate(c.lastActivityAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
