import Link from "next/link";
import { adminCancelBooking } from "@/app/admin/booking-actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { getBookingSettings } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { formatInZone } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings" };

export default async function Bookings({ searchParams }: { searchParams: Promise<{ show?: string; invited?: string }> }) {
  const q = await searchParams;
  const show = q.show ?? "upcoming";
  const now = new Date();
  const [s, bookings] = await Promise.all([
    getBookingSettings(),
    prisma.booking.findMany({
      where: show === "past"
        ? { startAt: { lt: now }, status: { in: ["CONFIRMED", "PENDING"] } }
        : show === "cancelled"
        ? { status: { in: ["CANCELLED", "DECLINED"] } }
        : { startAt: { gte: now }, status: { in: ["CONFIRMED", "PENDING"] } },
      orderBy: { startAt: show === "upcoming" ? "asc" : "desc" },
      take: 200,
    }),
  ]);
  const when = (d: Date) => formatInZone(d, s.timezone, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">CLIENT PORTAL</p>
          <h1>Bookings</h1>
          <p className="admin-sub tab-row">
            {[["upcoming", "Upcoming"], ["past", "Past"], ["cancelled", "Cancelled / declined"]].map(([k, l]) => (
              <Link key={k} href={`/admin/bookings?show=${k}`} className={show === k ? "on" : ""}>{l}</Link>
            ))}
          </p>
        </div>
        <div className="editor-actions">
          <Link className="btn-ghost" href="/admin/settings#booking">Booking settings</Link>
          <Link className="btn-solid" href="/admin/bookings/new">Set up a call</Link>
        </div>
      </div>
      {q.invited && <p className="admin-notice">Invite sent. You&rsquo;ll get an email when they accept or decline. The Meet link is ready below.</p>}

      {bookings.length === 0 ? <p className="admin-empty">Nothing here.</p> : (
        <table className="admin-table">
          <thead><tr><th>When</th><th>Who</th><th>About</th><th /></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{when(b.startAt)}{b.status === "CANCELLED" && <><br /><span className="pill">Cancelled</span></>}
                  {b.status === "DECLINED" && <><br /><span className="pill pill-warn">Declined</span></>}
                  {b.status === "PENDING" && <><br /><span className="pill pill-sched">{b.startAt > now ? "Awaiting reply" : "No reply"}</span></>}
                  {b.invitedAt && b.status !== "PENDING" && <><br /><small>You invited them</small></>}</td>
                <td>
                  {b.contactId ? <Link href={`/admin/contacts/${b.contactId}`}>{b.firstName} {b.lastName ?? ""}</Link> : `${b.firstName} ${b.lastName ?? ""}`}
                  {b.businessName && <><br /><small>{b.businessName}</small></>}
                  <br /><small>{b.email}{b.phone ? ` · ${b.phone}` : ""}</small>
                </td>
                <td style={{ maxWidth: 420 }}>
                  <small style={{ whiteSpace: "pre-wrap" }}>{b.topic}</small>
                  {b.declineReason && <><br /><small style={{ whiteSpace: "pre-wrap" }}><strong>Their note:</strong> {b.declineReason}</small></>}
                </td>
                <td style={{ textAlign: "right" }}>
                  {b.meetLink && (b.status === "CONFIRMED" || b.status === "PENDING") && <a className="btn-ghost" href={b.meetLink} target="_blank" rel="noopener noreferrer">Meet</a>}
                  {(b.status === "CONFIRMED" || b.status === "PENDING") && b.startAt > now && (
                    <form action={adminCancelBooking.bind(null, b.id)} style={{ display: "inline-block", marginLeft: 8 }}>
                      <ConfirmSubmit className="btn-ghost danger" message={`${b.status === "PENDING" ? "Withdraw the invite to" : "Cancel the call with"} ${b.firstName}? They will get a cancellation email.`}>{b.status === "PENDING" ? "Withdraw" : "Cancel"}</ConfirmSubmit>
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
