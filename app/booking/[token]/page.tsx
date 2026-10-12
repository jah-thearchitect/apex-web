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
          ) : (
            <>
              <h1>{longDateTime(b.startAt, s.timezone)}</h1>
              <p>
                {s.durationMin} minutes by video with Apex Capital Consultants
                {b.meetLink && !past && <> &middot; <a className="bk-inline-link" href={b.meetLink} target="_blank" rel="noopener noreferrer">Join the call</a></>}
              </p>
            </>
          )}
        </div>
      </section>
      {b.status === "CONFIRMED" && !past && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            <ManageBooking token={b.token} />
          </div>
        </section>
      )}
    </PageShell>
  );
}
