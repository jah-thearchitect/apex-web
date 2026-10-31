import Link from "next/link";
import { notFound } from "next/navigation";
import { CallMessageForm } from "@/components/admin/CallMessageForm";
import { CopyButton } from "@/components/admin/CopyButton";
import { getBookingSettings } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { longDateTime } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const metadata = { title: "Call details" };

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [b, s] = await Promise.all([
    prisma.booking.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "desc" } } } }),
    getBookingSettings(),
  ]);
  if (!b) notFound();
  const name = `${b.firstName}${b.lastName ? ` ${b.lastName}` : ""}`;
  const when = longDateTime(b.startAt, s.timezone);
  const minutes = Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60_000);
  const active = b.status === "CONFIRMED" || b.status === "PENDING";
  const sentAt = (d: Date) => longDateTime(d, s.timezone);

  const lead = b.status === "PENDING"
    ? "I sent you an invitation for a call, and I'm following up. The details are below."
    : "Thanks for booking a consultation with Apex. This note confirms your call, and the details are below.";
  const topic = b.topic.replace(/\s+/g, " ").trim().slice(0, 300);
  const defaultBody = [
    `Hi ${b.firstName},`,
    "",
    lead,
    "",
    `${b.invitedAt ? "We'll be talking about" : "You mentioned you'd like to discuss"}: ${topic}`,
    "",
    "Reply to this email if anything changes or you have questions before we talk.",
    "",
    "Talk soon,",
    "Apex Capital Consultants",
  ].join("\n");

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin/bookings" className="admin-back">&larr; Bookings</Link>
          <h1>Call with {name}</h1>
          <p className="admin-sub">
            {when} &middot; {minutes} minutes &middot;{" "}
            {b.status === "CONFIRMED" ? "Confirmed" : b.status === "PENDING" ? "Awaiting their reply" : b.status === "DECLINED" ? "Declined" : "Cancelled"}
          </p>
        </div>
        {active && b.meetLink && (
          <div className="editor-actions">
            <CopyButton text={b.meetLink} label="Copy Meet link" />
            <a className="btn-solid" href={b.meetLink} target="_blank" rel="noopener noreferrer">Join Google Meet</a>
          </div>
        )}
      </div>

      <div className="overview-grid" style={{ marginBottom: 40 }}>
        <section className="overview-card">
          <h2 className="admin-h2">Who</h2>
          <p style={{ margin: 0, lineHeight: 1.8 }}>
            {b.contactId ? <Link href={`/admin/contacts/${b.contactId}`}>{name}</Link> : name}
            {b.businessName && <><br /><small>{b.businessName}</small></>}
            <br /><a href={`mailto:${b.email}`}>{b.email}</a>
            {b.phone && <><br /><a href={`tel:${b.phone}`}>{b.phone}</a></>}
          </p>
        </section>
        <section className="overview-card">
          <h2 className="admin-h2">About the call</h2>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{b.topic}</p>
          {b.inviteNote && <p style={{ whiteSpace: "pre-wrap" }}><small><strong>Your note to them:</strong> {b.inviteNote}</small></p>}
          {b.declineReason && <p style={{ whiteSpace: "pre-wrap" }}><small><strong>Their note:</strong> {b.declineReason}</small></p>}
        </section>
      </div>

      {active ? (
        <>
          <h2 className="admin-h2">Message the client</h2>
          <p className="admin-sub" style={{ marginBottom: 20 }}>Confirm the call and tell them what to have ready. The date, time, and Meet link are added to the email for you.</p>
          <CallMessageForm bookingId={b.id} email={b.email} defaultSubject={`Your consultation with Apex — ${when}`} defaultBody={defaultBody} />
        </>
      ) : (
        <p className="admin-empty">This call is {b.status === "DECLINED" ? "declined" : "cancelled"}, so there&rsquo;s nothing to send about it.</p>
      )}

      {b.messages.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2 className="admin-h2">Already sent</h2>
          <div className="inquiry-list">
            {b.messages.map((m) => (
              <div className="inquiry-item" key={m.id}>
                <small style={{ color: "var(--on-ink-faint)" }}>{sentAt(m.createdAt)} &middot; {m.subject}</small>
                <div className="inquiry-body">{m.body}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
