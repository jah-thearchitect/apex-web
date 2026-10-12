import "server-only";
import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import type { Booking, BookingSettings } from "@/generated/prisma/client";
import { notifyFirm } from "./billing";
import { recordContact } from "./contacts";
import { busyTimes, createEvent, deleteEvent, getConnection, moveEvent } from "./google";
import { prisma } from "./prisma";
import { SITE_URL } from "./site";
import { addDays, longDateTime, ymdKey, zonedToUtc, zonedYmd } from "./tz";

export type WeeklyHours = Record<string, [string, string][]>;

export async function getBookingSettings(): Promise<BookingSettings> {
  return prisma.bookingSettings.upsert({ where: { id: "singleton" }, create: {}, update: {} });
}

export function parseWeekly(s: BookingSettings): WeeklyHours {
  try {
    return JSON.parse(s.weeklyHours) as WeeklyHours;
  } catch {
    return {};
  }
}

/** Booking is live once a Google calendar is connected (so busy times are respected). */
export async function bookingEnabled() {
  // Local preview of the booking UI before Google is connected (never in production).
  if (process.env.NODE_ENV !== "production" && process.env.BOOKING_PREVIEW === "1") return true;
  return !!(await getConnection());
}

const hm = (s: string) => s.split(":").map(Number) as [number, number];

/**
 * Every bookable start time in the window, grouped by the firm's calendar
 * date. A slot is offered when it fits the weekly hours, respects minimum
 * notice, and overlaps neither a confirmed booking nor a busy block on the
 * connected Google calendar (both padded by the buffer).
 */
export async function availableSlots(): Promise<{ date: string; slots: string[] }[]> {
  const s = await getBookingSettings();
  const weekly = parseWeekly(s);
  const now = Date.now();
  const earliest = now + s.minNoticeHours * 3_600_000;
  const today = zonedYmd(new Date(now), s.timezone);
  const step = (s.durationMin + s.bufferMin) * 60_000;
  const len = s.durationMin * 60_000;
  const pad = s.bufferMin * 60_000;

  const candidates: { date: string; start: Date }[] = [];
  for (let i = 0; i <= s.windowDays; i++) {
    const day = addDays(today.y, today.m, today.d, i);
    for (const [from, to] of weekly[String(day.weekday)] ?? []) {
      const [fh, fm] = hm(from);
      const [th, tm] = hm(to);
      const open = zonedToUtc(day.y, day.m, day.d, fh, fm, s.timezone).getTime();
      const close = zonedToUtc(day.y, day.m, day.d, th, tm, s.timezone).getTime();
      for (let t = open; t + len <= close; t += step) {
        if (t >= earliest) candidates.push({ date: ymdKey(day.y, day.m, day.d), start: new Date(t) });
      }
    }
  }
  if (candidates.length === 0) return [];

  const rangeFrom = candidates[0].start;
  const rangeTo = new Date(candidates[candidates.length - 1].start.getTime() + len + pad);
  const [booked, busy] = await Promise.all([
    prisma.booking.findMany({ where: { status: "CONFIRMED", startAt: { lt: rangeTo }, endAt: { gt: rangeFrom } }, select: { startAt: true, endAt: true } }),
    busyTimes(rangeFrom, rangeTo).catch((err) => {
      console.error("Google free/busy failed:", err);
      return null;
    }),
  ]);
  // If Google can't be reached, offer nothing rather than risk double-booking.
  if (busy === null) return [];
  const blocks = [...booked.map((b) => ({ start: b.startAt, end: b.endAt })), ...busy];

  const free = candidates.filter(({ start }) => {
    const a = start.getTime() - pad;
    const b = start.getTime() + len + pad;
    return !blocks.some((x) => x.start.getTime() < b && x.end.getTime() > a);
  });

  const byDate = new Map<string, string[]>();
  for (const c of free) byDate.set(c.date, [...(byDate.get(c.date) ?? []), c.start.toISOString()]);
  return [...byDate].map(([date, slots]) => ({ date, slots }));
}

async function isStillFree(startIso: string, ignoreBookingId?: string) {
  const days = await availableSlots();
  if (days.some((d) => d.slots.includes(startIso))) return true;
  // When rescheduling, the booking's own current slot is blocking itself.
  if (ignoreBookingId) {
    const own = await prisma.booking.findUnique({ where: { id: ignoreBookingId } });
    return own?.startAt.toISOString() === startIso;
  }
  return false;
}

export const manageUrl = (token: string) => `${SITE_URL}/booking/${token}`;

export type BookingInput = {
  start: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  businessName?: string;
  topic: string;
};

export async function createBooking(input: BookingInput): Promise<{ ok: true; booking: Booking } | { ok: false; error: string }> {
  const s = await getBookingSettings();
  if (!(await bookingEnabled())) return { ok: false, error: "Online booking isn't available right now. Please send an inquiry instead." };
  if (!(await isStillFree(input.start))) return { ok: false, error: "That time was just taken. Please pick another." };

  const start = new Date(input.start);
  const end = new Date(start.getTime() + s.durationMin * 60_000);
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ");

  let booking: Booking;
  try {
    booking = await prisma.booking.create({
      data: {
        slotKey: start.toISOString(),
        startAt: start,
        endAt: end,
        firstName: input.firstName,
        lastName: input.lastName || null,
        email: input.email,
        phone: input.phone || null,
        businessName: input.businessName || null,
        topic: input.topic,
      },
    });
  } catch {
    return { ok: false, error: "That time was just taken. Please pick another." };
  }

  try {
    const ev = await createEvent({
      summary: `${s.title}: ${name}${input.businessName ? ` (${input.businessName})` : ""}`,
      description: [
        `${name} · ${input.email}${input.phone ? ` · ${input.phone}` : ""}`,
        input.businessName ? `Business: ${input.businessName}` : "",
        "",
        "What they want to discuss:",
        input.topic,
        "",
        `Manage: ${manageUrl(booking.token)}`,
      ].filter((l) => l !== null).join("\n"),
      start,
      end,
      timeZone: s.timezone,
      attendee: { email: input.email, name },
      requestId: randomUUID(),
    });
    booking = await prisma.booking.update({ where: { id: booking.id }, data: { googleEventId: ev.id, meetLink: ev.meetLink } });
  } catch (err) {
    // Without the calendar event the slot isn't really held: undo.
    console.error("Google event create failed:", err);
    await prisma.booking.delete({ where: { id: booking.id } });
    return { ok: false, error: "We couldn't reach the calendar to confirm that time. Please try again in a moment." };
  }

  const contactId = await recordContact({ email: input.email, firstName: input.firstName, lastName: input.lastName, source: "booking" }).catch(() => null);
  if (contactId) await prisma.booking.update({ where: { id: booking.id }, data: { contactId } });

  await sendBookingEmail(booking, s, "confirmed");
  await notifyFirm(`Booked: ${s.title} with ${name}`, [
    `${name}${input.businessName ? ` (${input.businessName})` : ""} booked ${longDateTime(start, s.timezone)}.`,
    `Email: ${input.email}${input.phone ? ` · Phone: ${input.phone}` : ""}`,
    "",
    input.topic,
    "",
    booking.meetLink ? `Meet: ${booking.meetLink}` : "",
  ]);
  return { ok: true, booking };
}

export async function cancelBooking(token: string): Promise<{ ok: boolean; error?: string }> {
  const b = await prisma.booking.findUnique({ where: { token } });
  if (!b) return { ok: false, error: "Booking not found." };
  if (b.status === "CANCELLED") return { ok: true };
  if (b.googleEventId) await deleteEvent(b.googleEventId).catch((err) => console.error("Google event delete failed:", err));
  const updated = await prisma.booking.update({
    where: { id: b.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), slotKey: null },
  });
  const s = await getBookingSettings();
  await sendBookingEmail(updated, s, "cancelled");
  await notifyFirm(`Cancelled: ${s.title} with ${b.firstName}${b.lastName ? ` ${b.lastName}` : ""}`, [
    `The ${longDateTime(b.startAt, s.timezone)} ${s.title.toLowerCase()} was cancelled.`,
  ]);
  return { ok: true };
}

export async function rescheduleBooking(token: string, newStartIso: string): Promise<{ ok: boolean; error?: string }> {
  const b = await prisma.booking.findUnique({ where: { token } });
  if (!b || b.status !== "CONFIRMED") return { ok: false, error: "This booking can't be changed." };
  if (!(await isStillFree(newStartIso, b.id))) return { ok: false, error: "That time was just taken. Please pick another." };
  const s = await getBookingSettings();
  const start = new Date(newStartIso);
  const end = new Date(start.getTime() + s.durationMin * 60_000);
  const old = b.startAt;
  try {
    await prisma.booking.update({ where: { id: b.id }, data: { slotKey: start.toISOString(), startAt: start, endAt: end, reminderSentAt: null } });
  } catch {
    return { ok: false, error: "That time was just taken. Please pick another." };
  }
  try {
    if (b.googleEventId) await moveEvent(b.googleEventId, start, end, s.timezone);
  } catch (err) {
    console.error("Google event move failed:", err);
    await prisma.booking.update({ where: { id: b.id }, data: { slotKey: old.toISOString(), startAt: old, endAt: new Date(old.getTime() + s.durationMin * 60_000) } });
    return { ok: false, error: "We couldn't reach the calendar to move your time. Please try again in a moment." };
  }
  const updated = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
  await sendBookingEmail(updated, s, "rescheduled");
  await notifyFirm(`Rescheduled: ${s.title} with ${b.firstName}${b.lastName ? ` ${b.lastName}` : ""}`, [
    `Moved from ${longDateTime(old, s.timezone)} to ${longDateTime(start, s.timezone)}.`,
  ]);
  return { ok: true };
}

// ---------- emails ----------

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** A calendar file the client can add to any calendar app. */
export function buildIcs(b: Booking, s: BookingSettings, method: "REQUEST" | "CANCEL") {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Apex Capital Consultants//Booking//EN",
    `METHOD:${method === "CANCEL" ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${b.id}@acc-funds.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(b.startAt)}`,
    `DTEND:${icsDate(b.endAt)}`,
    `SUMMARY:${icsText(`${s.title} with Apex Capital Consultants`)}`,
    `DESCRIPTION:${icsText(`${b.meetLink ? `Join: ${b.meetLink}\n` : ""}Manage your booking: ${manageUrl(b.token)}`)}`,
    b.meetLink ? `LOCATION:${icsText(b.meetLink)}` : "",
    method === "CANCEL" ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

type Kind = "confirmed" | "rescheduled" | "cancelled" | "reminder";

export async function sendBookingEmail(b: Booking, s: BookingSettings, kind: Kind) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_FROM_EMAIL || process.env.BILLING_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return;
  const when = longDateTime(b.startAt, s.timezone);
  const heading = {
    confirmed: "You're booked.",
    rescheduled: "Your call has been moved.",
    cancelled: "Your call is cancelled.",
    reminder: "Your call is coming up.",
  }[kind];
  const P = (t: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#2b2d31;">${t}</p>`;
  const body =
    P(`Hi ${esc(b.firstName)},`) +
    (kind === "cancelled"
      ? P(`Your ${esc(s.title.toLowerCase())} on <strong>${esc(when)}</strong> is cancelled. If you'd like a new time, you can book again any time.`)
      : P(`Your ${esc(s.title.toLowerCase())} with Apex is on <strong>${esc(when)}</strong> (${s.durationMin} minutes).`) +
        (b.meetLink ? P(`Join by video: <a href="${b.meetLink}" style="color:#2f5f7a;">${esc(b.meetLink)}</a>`) : "") +
        P(kind === "reminder" ? "See you soon." : "A calendar file is attached so you can add it to your calendar."));
  const cta = kind === "cancelled"
    ? { label: "Book a new time", url: `${SITE_URL}/consultation` }
    : { label: "Reschedule or cancel", url: manageUrl(b.token) };
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F1F1EE;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F1EE;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<tr><td style="background:#0A0B0D;padding:22px 32px;">
  <span style="display:inline-block;vertical-align:middle;border:1px solid #8a6a36;padding:5px 12px;font-family:Georgia,serif;font-size:17px;color:#EDEEEC;">Apex</span>
  <img src="${SITE_URL}/brand/apex-mark-dark.png" width="44" height="29" alt="" style="display:inline-block;vertical-align:middle;margin-left:10px;border:0;">
</td></tr>
<tr><td style="padding:36px 32px 12px;">
  <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:26px;font-weight:500;color:#101113;">${heading}</h1>
  ${body}
  <p style="margin:24px 0 8px;"><a href="${cta.url}" style="display:inline-block;background:#0A0B0D;color:#EDEEEC;font-family:'Courier New',monospace;font-size:13px;letter-spacing:1px;text-decoration:none;padding:13px 22px;">${cta.label}</a></p>
</td></tr>
<tr><td style="padding:20px 32px 30px;border-top:1px solid #e3e3de;"><p style="margin:0;font-size:12px;color:#8A8D8F;">Apex Capital Consultants &middot; ${esc(s.title)}</p></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${heading}\n\nHi ${b.firstName},\n\n${kind === "cancelled" ? `Your ${s.title.toLowerCase()} on ${when} is cancelled.` : `Your ${s.title.toLowerCase()} with Apex is on ${when}.${b.meetLink ? `\nJoin: ${b.meetLink}` : ""}`}\n\n${cta.label}: ${cta.url}`;
  const subject = {
    confirmed: `Confirmed: ${s.title} with Apex — ${when}`,
    rescheduled: `Moved: ${s.title} with Apex — ${when}`,
    cancelled: `Cancelled: ${s.title} with Apex`,
    reminder: `Reminder: ${s.title} with Apex — ${when}`,
  }[kind];
  try {
    await new Resend(apiKey).emails.send({
      from,
      to: b.email,
      subject,
      html,
      text,
      replyTo: process.env.BILLING_REPLY_TO || undefined,
      attachments: kind === "reminder" ? undefined : [{ filename: "apex-consultation.ics", content: Buffer.from(buildIcs(b, s, kind === "cancelled" ? "CANCEL" : "REQUEST")) }],
    });
  } catch (err) {
    console.error(`Booking ${kind} email failed:`, err);
  }
}
