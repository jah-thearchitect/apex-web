import Link from "next/link";
import { InviteForm, type Person, type Suggestion } from "@/components/admin/InviteForm";
import { availableSlots, bookingEnabled, getBookingSettings } from "@/lib/booking";
import { prisma } from "@/lib/prisma";
import { formatInZone } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up a call" };

const splitName = (full: string) => {
  const [first, ...rest] = full.trim().split(/\s+/);
  return { firstName: first ?? "", lastName: rest.join(" ") };
};

export default async function NewInvite({ searchParams }: { searchParams: Promise<{ client?: string; contact?: string }> }) {
  const q = await searchParams;
  const [s, enabled, clients, contacts] = await Promise.all([
    getBookingSettings(),
    bookingEnabled(),
    prisma.client.findMany({ orderBy: { businessName: "asc" }, take: 500 }),
    prisma.contact.findMany({ orderBy: { lastActivityAt: "desc" }, take: 500, include: { client: true } }),
  ]);

  // Clients first (with their business), then other contacts.
  const people: Person[] = [
    ...clients.map((c) => ({ email: c.email, ...splitName(c.contactName), businessName: c.businessName, label: `${c.contactName} · ${c.businessName}` })),
    ...contacts
      .filter((c) => !c.client && !clients.some((x) => x.email.toLowerCase() === c.email.toLowerCase()))
      .map((c) => ({ email: c.email, firstName: c.firstName, lastName: c.lastName ?? "", businessName: "", label: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email })),
  ];
  let initial: Person | undefined;
  if (q.client) initial = people.find((p) => p.email === clients.find((c) => c.id === q.client)?.email);
  if (q.contact) {
    const c = contacts.find((x) => x.id === q.contact);
    if (c) initial = people.find((p) => p.email === c.email) ?? { email: c.email, firstName: c.firstName, lastName: c.lastName ?? "", businessName: c.client?.businessName ?? "", label: c.email };
  }

  let suggestions: Suggestion[] = [];
  if (enabled) {
    const days = await availableSlots().catch(() => []);
    const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => formatInZone(new Date(iso), s.timezone, o);
    suggestions = days.flatMap((d) => d.slots.slice(0, 3).map((iso) => ({
      date: d.date,
      time: fmt(iso, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
      label: fmt(iso, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    }))).slice(0, 9);
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin/bookings" className="admin-back">&larr; Bookings</Link>
          <h1>Set up a call</h1>
          <p className="admin-sub">Invite a client to a consultation. You&rsquo;ll get an email when they accept or decline.</p>
        </div>
      </div>
      {!enabled ? (
        <p className="admin-notice">Connect Google Calendar in <Link href="/admin/settings#booking">Settings</Link> first, so the call gets a Google Meet link.</p>
      ) : (
        <InviteForm people={people} initial={initial} suggestions={suggestions} durationMin={s.durationMin} timezone={s.timezone} />
      )}
    </>
  );
}
