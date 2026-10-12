import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { SITE_URL } from "./site";

// Google Calendar over plain REST (no SDK): OAuth for the owner's account,
// free/busy to block taken times, and events with a Meet link per booking.
// Events are created with sendUpdates=none: the client gets Apex's own
// branded email (with an .ics file), not a Google invitation.

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];
export const GOOGLE_REDIRECT_URI = `${SITE_URL}/api/google/callback`;
const CAL = "https://www.googleapis.com/calendar/v3";

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// ----- token encryption at rest -----
function key() {
  const secret = process.env.GOOGLE_TOKEN_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  return createHash("sha256").update(`google-token:${secret}`).digest();
}
function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}
function decrypt(enc: string) {
  const [iv, tag, data] = enc.split(".").map((s) => Buffer.from(s, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

// ----- OAuth -----
export function authUrl(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...params,
    }),
  });
  const json = (await res.json()) as { access_token?: string; refresh_token?: string; id_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(json.error_description || json.error || "Google token request failed.");
  return json;
}

/** Finishes the connect flow: stores the account's email and encrypted refresh token. */
export async function completeConnection(code: string) {
  const tok = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: GOOGLE_REDIRECT_URI });
  if (!tok.refresh_token) throw new Error("Google didn't return a refresh token. Remove the app's access in your Google account and connect again.");
  const info = (await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  })).json()) as { email?: string };
  const data = { email: info.email ?? "unknown", refreshTokenEncrypted: encrypt(tok.refresh_token), connectedAt: new Date() };
  await prisma.googleConnection.upsert({ where: { id: "singleton" }, create: data, update: data });
  cachedToken = null;
  return data.email;
}

export async function disconnectGoogle() {
  await prisma.googleConnection.deleteMany({});
  cachedToken = null;
}

export async function getConnection() {
  return prisma.googleConnection.findUnique({ where: { id: "singleton" } });
}

let cachedToken: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.token;
  const conn = await getConnection();
  if (!conn || !googleConfigured()) return null;
  const tok = await tokenRequest({ refresh_token: decrypt(conn.refreshTokenEncrypted), grant_type: "refresh_token" });
  cachedToken = { token: tok.access_token!, expires: Date.now() + (tok.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

async function gfetch(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  if (!token) throw new Error("Google Calendar isn't connected.");
  const res = await fetch(`${CAL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? `Google Calendar error ${res.status}`);
  return json;
}

/** Busy intervals on the connected calendar between two instants. */
export async function busyTimes(from: Date, to: Date): Promise<{ start: Date; end: Date }[]> {
  const conn = await getConnection();
  if (!conn) return [];
  const json = (await gfetch("/freeBusy", {
    method: "POST",
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: conn.calendarId }] }),
  })) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> };
  const cal = json.calendars?.[conn.calendarId] ?? Object.values(json.calendars ?? {})[0];
  return (cal?.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

export type EventInput = {
  summary: string;
  description: string;
  start: Date;
  end: Date;
  timeZone: string;
  attendee: { email: string; name: string };
  requestId: string;
};

/** Creates the calendar event with a Google Meet link. */
export async function createEvent(e: EventInput): Promise<{ id: string; meetLink: string | null }> {
  const conn = await getConnection();
  if (!conn) throw new Error("Google Calendar isn't connected.");
  const json = (await gfetch(`/calendars/${encodeURIComponent(conn.calendarId)}/events?conferenceDataVersion=1&sendUpdates=none`, {
    method: "POST",
    body: JSON.stringify({
      summary: e.summary,
      description: e.description,
      start: { dateTime: e.start.toISOString(), timeZone: e.timeZone },
      end: { dateTime: e.end.toISOString(), timeZone: e.timeZone },
      attendees: [{ email: e.attendee.email, displayName: e.attendee.name }],
      conferenceData: { createRequest: { requestId: e.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
      reminders: { useDefault: true },
    }),
  })) as { id: string; hangoutLink?: string };
  return { id: json.id, meetLink: json.hangoutLink ?? null };
}

export async function moveEvent(eventId: string, start: Date, end: Date, timeZone: string) {
  const conn = await getConnection();
  if (!conn) return;
  await gfetch(`/calendars/${encodeURIComponent(conn.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`, {
    method: "PATCH",
    body: JSON.stringify({ start: { dateTime: start.toISOString(), timeZone }, end: { dateTime: end.toISOString(), timeZone } }),
  });
}

export async function deleteEvent(eventId: string) {
  const conn = await getConnection();
  if (!conn) return;
  try {
    await gfetch(`/calendars/${encodeURIComponent(conn.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`, { method: "DELETE" });
  } catch (err) {
    // Already deleted in Google: nothing left to do.
    if (!(err instanceof Error && /deleted|not found|410|404/i.test(err.message))) throw err;
  }
}
