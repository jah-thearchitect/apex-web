import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManageBooking } from "@/components/ManageBooking";
import { PageShell } from "@/components/PageShell";
import { getBookingSettings } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { longDateTime } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

export default async function BookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await prisma.booking.findUnique({ where: { token } });
  if (!b) notFound();
  const s = await getBookingSettings();
  const past = b.endAt.getTime() < Date.now();
  const minutes = Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60_000);

  return (
    <PageShell>
      <section className="page-hero">
        <div className="wrap">
          <p className="eyebrow">YOUR {s.title.toUpperCase()}</p>
          {b.status === "CANCELLED" ? (
            <>
              <h1>This call was cancelled.</h1>
              <p>Want a new time? <a href="/consultation" className="bk-inline-link">Book again</a>.</p>
            </>
          ) : b.status === "DECLINED" ? (
            <>
              <h1>You declined this call.</h1>
              <p>Thanks for letting us know. If you change your mind, <a href="/consultation" className="bk-inline-link">pick a time that works</a>.</p>
            </>
          ) : b.status === "PENDING" ? (
            <>
              <h1>{past ? "This invite has expired." : longDateTime(b.startAt, s.timezone)}</h1>
              {!past && <p>Apex Capital Consultants invited you to a {minutes}-minute {s.title.toLowerCase()} by video.</p>}
              {!past && <p><strong>About:</strong> {b.topic}</p>}
              {!past && b.inviteNote && <p style={{ whiteSpace: "pre-wrap" }}>{b.inviteNote}</p>}
            </>
          ) : (
            <>
              <h1>{longDateTime(b.startAt, s.timezone)}</h1>
              <p>
                {minutes} minutes by video with Apex Capital Consultants
                {b.meetLink && !past && <> &middot; <a className="bk-inline-link" href={b.meetLink} target="_blank" rel="noopener noreferrer">Join the call</a></>}
              </p>
            </>
          )}
        </div>
      </section>
      {(b.status === "CONFIRMED" || b.status === "PENDING") && !past && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            <ManageBooking token={b.token} invite={b.status === "PENDING"} />
          </div>
        </section>
      )}
    </PageShell>
  );
}
