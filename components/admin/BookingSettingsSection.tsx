import { disconnectGoogleAction, saveBookingSettings } from "@/app/admin/booking-actions";
import { AvailabilityEditor } from "@/components/admin/AvailabilityEditor";
import { availableSlots, getBookingSettings, parseWeekly } from "@/lib/booking";
import { formatInZone, ymdKey, zonedYmd } from "@/lib/tz";
import { getConnection, GOOGLE_REDIRECT_URI, googleConfigured } from "@/lib/google";

// Minimum notice, as plain choices (stored in hours).
const NOTICE: [number, string][] = [
  [0, "No minimum"], [1, "1 hour"], [2, "2 hours"], [4, "4 hours"], [12, "12 hours"],
  [24, "1 day (24 hours)"], [48, "2 days"], [72, "3 days"], [96, "4 days"], [168, "1 week"],
];
const MESSAGES: Record<string, string> = {
  connected: "Google Calendar connected. Booking is live on the Consultation page.",
  disconnected: "Google Calendar disconnected. The Consultation page shows the inquiry form instead.",
  denied: "Google access wasn't granted.",
  invalid: "That sign-in link expired. Try connecting again.",
  failed: "Connecting failed. Try again; if it keeps failing, check the Google client ID and secret in Vercel.",
  "missing-keys": "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel first, then redeploy.",
};

export async function BookingSettingsSection({ google, saved }: { google?: string; saved?: boolean }) {
  const [s, conn] = await Promise.all([getBookingSettings(), getConnection()]);
  const weekly = parseWeekly(s);
  const keys = googleConfigured();
  const now = zonedYmd(new Date(), s.timezone);
  const today = ymdKey(now.y, now.m, now.d);
  // What a visitor would see right now, with the saved settings and calendar.
  const first = conn ? (await availableSlots().catch(() => []))[0]?.slots[0] : undefined;
  const earliest = first
    ? formatInZone(new Date(first), s.timezone, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })
    : null;
  const notice = NOTICE.some(([h]) => h === s.minNoticeHours) ? NOTICE : [...NOTICE, [s.minNoticeHours, `${s.minNoticeHours} hours`] as [number, string]].sort((a, b) => a[0] - b[0]);

  return (
    <section id="booking" style={{ marginTop: 48 }}>
      <h2 className="admin-h2">Consultation booking</h2>
      {google && MESSAGES[google] && <p className="editor-status">{MESSAGES[google]}</p>}
      {saved && <p className="editor-status">Booking settings saved.</p>}

      <ul className="check-list" style={{ marginBottom: 20 }}>
        <li className={keys ? "ok" : ""}>
          {keys ? "Google app keys added" : <>Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in Vercel (OAuth client with redirect URI <code>{GOOGLE_REDIRECT_URI}</code>)</>}
        </li>
        <li className={conn ? "ok" : ""}>{conn ? <>Booking into <strong>{conn.email}</strong>&rsquo;s calendar</> : "Calendar not connected — the Consultation page shows the inquiry form until it is"}</li>
      </ul>
      <div className="editor-actions" style={{ marginBottom: 32 }}>
        {keys && <a className={conn ? "btn-ghost" : "btn-solid"} href="/api/google/connect">{conn ? "Reconnect Google Calendar" : "Connect Google Calendar"}</a>}
        {conn && <form action={disconnectGoogleAction}><button type="submit" className="btn-ghost danger">Disconnect</button></form>}
      </div>

      <form action={saveBookingSettings} className="editor-fields">
        <div className="field-grid">
          <label className="field"><span>Meeting name</span><input name="title" defaultValue={s.title} maxLength={80} /></label>
          <label className="field"><span>Short description</span><input name="description" defaultValue={s.description} maxLength={300} /></label>
        </div>
        <div className="field-grid">
          <label className="field"><span>Length (minutes)</span><input name="durationMin" type="number" min={15} max={240} defaultValue={s.durationMin} /></label>
          <label className="field"><span>Gap between calls (minutes)</span><input name="bufferMin" type="number" min={0} max={120} defaultValue={s.bufferMin} /></label>
          <label className="field">
            <span>Minimum notice <small>how soon someone can book</small></span>
            <select name="minNoticeHours" defaultValue={s.minNoticeHours}>
              {notice.map(([h, label]) => <option key={h} value={h}>{label}</option>)}
            </select>
          </label>
          <label className="field"><span>Bookable up to (days ahead)</span><input name="windowDays" type="number" min={1} max={120} defaultValue={s.windowDays} /></label>
        </div>
        <label className="field">
          <span>Time zone <small>your hours below are in this zone; clients see times in their own</small></span>
          <input name="timezone" defaultValue={s.timezone} maxLength={60} />
        </label>
        <AvailabilityEditor weekly={weekly} daysOff={s.daysOff} today={today} />
        <p className="earliest-note">
          {earliest
            ? <>Right now, the earliest time someone can book is <strong>{earliest}</strong>. Save to update it.</>
            : conn ? "No open times in the booking window right now. Check your hours, days off, and notice." : "Connect Google Calendar to open booking."}
        </p>
        <div className="editor-actions"><button type="submit" className="btn-solid">Save booking settings</button></div>
      </form>
    </section>
  );
}
