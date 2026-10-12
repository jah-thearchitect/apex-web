import Link from "next/link";
import { adminCancelBooking } from "@/app/admin/booking-actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { getBookingSettings } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { formatInZone } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings" };

export default async function Bookings({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const show = (await searchParams).show ?? "upcoming";
  const now = new Date();
  const [s, bookings] = await Promise.all([
    getBookingSettings(),
    prisma.booking.findMany({
      where: show === "past" ? { startAt: { lt: now } } : show === "cancelled" ? { status: "CANCELLED" } : { startAt: { gte: now }, status: "CONFIRMED" },
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
            {[["upcoming", "Upcoming"], ["past", "Past"], ["cancelled", "Cancelled"]].map(([k, l]) => (
              <Link key={k} href={`/admin/bookings?show=${k}`} className={show === k ? "on" : ""}>{l}</Link>
            ))}
          </p>
        </div>
        <Link className="btn-ghost" href="/admin/settings#booking">Booking settings</Link>
      </div>

      {bookings.length === 0 ? <p className="admin-empty">Nothing here.</p> : (
        <table className="admin-table">
          <thead><tr><th>When</th><th>Who</th><th>About</th><th /></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{when(b.startAt)}{b.status === "CANCELLED" && <><br /><span className="pill">Cancelled</span></>}</td>
                <td>
                  {b.contactId ? <Link href={`/admin/contacts/${b.contactId}`}>{b.firstName} {b.lastName ?? ""}</Link> : `${b.firstName} ${b.lastName ?? ""}`}
                  {b.businessName && <><br /><small>{b.businessName}</small></>}
                  <br /><small>{b.email}{b.phone ? ` · ${b.phone}` : ""}</small>
                </td>
                <td style={{ maxWidth: 420 }}><small style={{ whiteSpace: "pre-wrap" }}>{b.topic}</small></td>
                <td style={{ textAlign: "right" }}>
                  {b.meetLink && b.status === "CONFIRMED" && <a className="btn-ghost" href={b.meetLink} target="_blank" rel="noopener noreferrer">Meet</a>}
                  {b.status === "CONFIRMED" && b.startAt > now && (
                    <form action={adminCancelBooking.bind(null, b.id)} style={{ display: "inline-block", marginLeft: 8 }}>
                      <ConfirmSubmit className="btn-ghost danger" message={`Cancel the call with ${b.firstName}? They will get a cancellation email.`}>Cancel</ConfirmSubmit>
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
