"use client";

import { useActionState, useState } from "react";
import { inviteClient, type InviteState } from "@/app/admin/booking-actions";

export type Person = { email: string; firstName: string; lastName: string; businessName: string; label: string };
export type Suggestion = { date: string; time: string; label: string };

export function InviteForm({
  people,
  initial,
  suggestions,
  durationMin,
  timezone,
}: {
  people: Person[];
  initial?: Person;
  suggestions: Suggestion[];
  durationMin: number;
  timezone: string;
}) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteClient, {});
  const [who, setWho] = useState({
    email: initial?.email ?? "",
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    businessName: initial?.businessName ?? "",
  });
  const [when, setWhen] = useState({ date: "", time: "" });

  // Picking a known client or contact by email fills in the rest.
  function onEmail(email: string) {
    const p = people.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    setWho(p ? { email, firstName: p.firstName, lastName: p.lastName, businessName: p.businessName } : { ...who, email });
  }
  const set = (k: keyof typeof who) => (e: React.ChangeEvent<HTMLInputElement>) => setWho({ ...who, [k]: e.target.value });

  return (
    <form action={action} className="editor-fields" style={{ maxWidth: 760 }}>
      <label className="field">
        <span>Client email <small>start typing to pick a client or contact, or enter any email</small></span>
        <input name="email" type="email" required maxLength={254} list="invite-people" value={who.email} onChange={(e) => onEmail(e.target.value)} autoComplete="off" />
        <datalist id="invite-people">
          {people.map((p) => <option key={p.email} value={p.email}>{p.label}</option>)}
        </datalist>
      </label>
      <div className="field-grid">
        <label className="field"><span>First name</span><input name="firstName" required maxLength={60} value={who.firstName} onChange={set("firstName")} /></label>
        <label className="field"><span>Last name</span><input name="lastName" maxLength={80} value={who.lastName} onChange={set("lastName")} /></label>
        <label className="field"><span>Business</span><input name="businessName" maxLength={160} value={who.businessName} onChange={set("businessName")} /></label>
      </div>

      <div className="field">
        <span>When <small>{timezone.replace("_", " ")} time</small></span>
        {suggestions.length > 0 && (
          <div className="slot-picks" style={{ margin: "0 0 6px" }}>
            {suggestions.map((s) => (
              <button
                type="button"
                key={s.date + s.time}
                className={`slot${when.date === s.date && when.time === s.time ? " on" : ""}`}
                onClick={() => setWhen({ date: s.date, time: s.time })}
              >
                {s.label}
              </button>
            ))}
            <small className="muted">Your next open times. Or set any date and time below, even outside your booking hours.</small>
          </div>
        )}
        <div className="avail-range">
          <input type="date" name="date" required value={when.date} onChange={(e) => setWhen({ ...when, date: e.target.value })} />
          <input type="time" name="time" required value={when.time} onChange={(e) => setWhen({ ...when, time: e.target.value })} />
          <select name="durationMin" defaultValue={String(durationMin)} className="slot" style={{ padding: ".5em .7em" }}>
            {[...new Set([15, 30, 45, 60, 90, 120, durationMin])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
      </div>

      <label className="field">
        <span>What the call is about <small>shown to the client</small></span>
        <textarea name="topic" rows={3} required maxLength={3000} placeholder="e.g. Walk through the new client portal before launch" />
      </label>
      <label className="field">
        <span>Personal note <small>optional, added to the email</small></span>
        <textarea name="note" rows={3} maxLength={2000} />
      </label>

      {state.error && <p className="editor-status" style={{ color: "#e59a9a" }}>{state.error}</p>}
      {state.conflicts && (
        <div className="confirm-box">
          <strong>That time overlaps:</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{state.conflicts.map((c) => <li key={c}>{c}</li>)}</ul>
          <p className="muted">Pick another time, or send it anyway.</p>
          <div className="editor-actions">
            <button type="submit" name="force" value="1" className="btn-ghost" disabled={pending}>Send anyway</button>
          </div>
        </div>
      )}

      <div className="editor-actions">
        <button type="submit" className="btn-solid" disabled={pending}>{pending ? "Sending…" : "Send invite"}</button>
        <small className="muted" style={{ color: "var(--on-ink-faint)" }}>
          This holds the time on your Google Calendar with a Meet link, then emails them to accept, pick another time, or decline.
        </small>
      </div>
    </form>
  );
}
