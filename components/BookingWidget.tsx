"use client";

import { useEffect, useMemo, useState } from "react";

type Day = { date: string; slots: string[] };
type SlotsResponse = { enabled: boolean; timezone?: string; durationMin?: number; title?: string; days: Day[] };

const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: localTz(), ...opts }).format(new Date(iso));
const localDateKey = (iso: string) => fmt(iso, { year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * On-site booking: pick a day, pick a time (shown in the visitor's own time
 * zone), fill a short form, confirm. In "reschedule" mode it skips the form
 * and moves an existing booking instead.
 */
export function BookingWidget({ mode = "book", token, onDone }: { mode?: "book" | "reschedule"; token?: string; onDone?: () => void }) {
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "details" | "done">("pick");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneToken, setDoneToken] = useState<string | null>(null);

  async function load() {
    setLoadError(false);
    try {
      const res = await fetch("/api/booking/slots", { cache: "no-store" });
      const json = (await res.json()) as SlotsResponse;
      setData(json);
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => { load(); }, []);

  // Regroup the firm's slots by the visitor's local calendar date.
  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of data?.days ?? []) for (const s of d.slots) map.set(localDateKey(s), [...(map.get(localDateKey(s)) ?? []), s]);
    return [...map].map(([key, slots]) => ({ key, slots: slots.sort(), first: slots[0] }));
  }, [data]);

  useEffect(() => {
    if (days.length && (!day || !days.some((d) => d.key === day))) setDay(days[0].key);
  }, [days, day]);

  const selected = days.find((d) => d.key === day);
  const tzLabel = fmt(new Date().toISOString(), { timeZoneName: "long" }).split(", ").pop();

  async function submitBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot) return;
    setBusy(true);
    setStatus("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, start: slot }),
      });
      const json = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok) {
        setStatus(json.error ?? "That didn't go through. Please try again.");
        if (res.status === 409) { setStep("pick"); setSlot(null); load(); }
      } else {
        setDoneToken(json.token ?? null);
        setStep("done");
      }
    } catch {
      setStatus("That didn't go through. Please try again.");
    }
    setBusy(false);
  }

  async function submitReschedule() {
    if (!slot || !token) return;
    setBusy(true);
    setStatus("");
    const res = await fetch(`/api/booking/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", start: slot }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setStatus(json.error ?? "That didn't go through. Please try again.");
      setSlot(null);
      load();
      return;
    }
    onDone?.();
  }

  if (loadError) {
    return <div className="bk"><p className="bk-empty">The calendar couldn&rsquo;t load. <button type="button" className="bk-link" onClick={load}>Try again</button></p></div>;
  }
  if (!data) return <div className="bk"><p className="bk-empty">Loading available times…</p></div>;
  if (!data.enabled || days.length === 0) {
    return (
      <div className="bk">
        <p className="bk-empty">
          {data.enabled ? "No open times in the next couple of weeks." : "Online booking is opening soon."} Send an inquiry below and the firm will set a time with you.
        </p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="bk bk-done" role="status">
        <p className="eyebrow">CONFIRMED</p>
        <h3>You&rsquo;re booked.</h3>
        <p>{slot && fmt(slot, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</p>
        <p className="bk-muted">A confirmation with your video link and a calendar file is on its way to your inbox.</p>
        {doneToken && <a className="arrow-link" href={`/booking/${doneToken}`}>View or change your booking</a>}
      </div>
    );
  }

  return (
    <div className="bk">
      {step === "pick" && (
        <>
          <div className="bk-head">
            <span className="bk-label">1 &middot; Pick a day</span>
            <span className="bk-tz">Times in {tzLabel}</span>
          </div>
          <div className="bk-days" role="listbox" aria-label="Available days">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                role="option"
                aria-selected={d.key === day}
                className={`bk-day${d.key === day ? " on" : ""}`}
                onClick={() => { setDay(d.key); setSlot(null); }}
              >
                <span className="bk-dow">{fmt(d.first, { weekday: "short" })}</span>
                <span className="bk-date">{fmt(d.first, { day: "numeric" })}</span>
                <span className="bk-mon">{fmt(d.first, { month: "short" })}</span>
              </button>
            ))}
          </div>

          <div className="bk-head" style={{ marginTop: 28 }}>
            <span className="bk-label">2 &middot; Pick a time</span>
            <span className="bk-tz">{data.durationMin} min &middot; video call</span>
          </div>
          <div className="bk-times">
            {selected?.slots.map((s) => (
              <button key={s} type="button" className={`bk-time${s === slot ? " on" : ""}`} onClick={() => setSlot(s)}>
                {fmt(s, { hour: "numeric", minute: "2-digit" })}
              </button>
            ))}
          </div>

          <div className="bk-foot">
            {slot && (
              <span className="bk-choice">
                {fmt(slot, { weekday: "long", month: "long", day: "numeric" })} at {fmt(slot, { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            {mode === "book" ? (
              <button type="button" className="btn-solid" disabled={!slot} onClick={() => setStep("details")}>Continue</button>
            ) : (
              <button type="button" className="btn-solid" disabled={!slot || busy} onClick={submitReschedule}>{busy ? "Moving…" : "Move my call here"}</button>
            )}
          </div>
          {status && <p className="bk-status">{status}</p>}
        </>
      )}

      {step === "details" && slot && (
        <form className="bk-form" onSubmit={submitBooking}>
          <div className="bk-head">
            <span className="bk-label">3 &middot; Your details</span>
            <button type="button" className="bk-link" onClick={() => setStep("pick")}>&larr; Change time</button>
          </div>
          <p className="bk-choice">
            {data.title} &middot; {fmt(slot, { weekday: "long", month: "long", day: "numeric" })} at {fmt(slot, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
          </p>
          <div className="bk-grid">
            <input name="firstName" required maxLength={60} placeholder="First name" aria-label="First name" autoComplete="given-name" />
            <input name="lastName" maxLength={80} placeholder="Last name" aria-label="Last name" autoComplete="family-name" />
            <input name="email" type="email" required maxLength={254} placeholder="you@business.com" aria-label="Email" autoComplete="email" />
            <input name="phone" type="tel" maxLength={40} placeholder="Phone (optional)" aria-label="Phone (optional)" autoComplete="tel" />
            <input name="businessName" maxLength={160} placeholder="Business name (optional)" aria-label="Business name (optional)" autoComplete="organization" className="bk-wide" />
            <textarea name="topic" required maxLength={3000} rows={4} placeholder="What are you looking to discuss?" aria-label="What are you looking to discuss?" className="bk-wide" />
          </div>
          <div className="hp-field" aria-hidden="true">
            <label>Company website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <div className="bk-foot">
            <button type="submit" className="btn-solid" disabled={busy}>{busy ? "Booking…" : "Confirm booking"}</button>
          </div>
          {status && <p className="bk-status">{status}</p>}
        </form>
      )}
    </div>
  );
}
