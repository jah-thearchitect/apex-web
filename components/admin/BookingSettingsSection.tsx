import { disconnectGoogleAction, saveBookingSettings } from "@/app/admin/booking-actions";
import { getBookingSettings, parseWeekly } from "@/lib/booking";
import { getConnection, GOOGLE_REDIRECT_URI, googleConfigured } from "@/lib/google";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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
          <label className="field"><span>Minimum notice (hours)</span><input name="minNoticeHours" type="number" min={0} max={720} defaultValue={s.minNoticeHours} /></label>
          <label className="field"><span>Bookable up to (days ahead)</span><input name="windowDays" type="number" min={1} max={120} defaultValue={s.windowDays} /></label>
        </div>
        <label className="field">
          <span>Time zone <small>your hours below are in this zone; clients see times in their own</small></span>
          <input name="timezone" defaultValue={s.timezone} maxLength={60} />
        </label>
        <div className="field">
          <span>Weekly hours</span>
          <div className="hours-grid">
            {DAYS.map((name, d) => {
              const range = weekly[String(d)]?.[0];
              return (
                <div className="hours-row" key={d}>
                  <label className="check"><input type="checkbox" name={`day${d}_on`} defaultChecked={!!range} /> {name}</label>
                  <input type="time" name={`day${d}_start`} defaultValue={range?.[0] ?? "10:00"} aria-label={`${name} start`} />
                  <span>to</span>
                  <input type="time" name={`day${d}_end`} defaultValue={range?.[1] ?? "13:30"} aria-label={`${name} end`} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="editor-actions"><button type="submit" className="btn-solid">Save booking settings</button></div>
      </form>
    </section>
  );
}
