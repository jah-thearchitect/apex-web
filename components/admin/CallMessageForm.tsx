"use client";

import { useActionState, useState } from "react";
import { sendCallMessageAction, type CallMessageState } from "@/app/admin/booking-actions";

// Things worth asking a client to have ready. Each one adds a bullet to the note.
const PREP = [
  "A link to your current website and social pages",
  "What you want this project to accomplish, and your timeline",
  "Your logo, photos, or any documents you want us to see",
  "Your budget range",
  "A list of questions you'd like answered",
  "Examples of sites or brands you like",
];

const LEAD = "To make the best use of our time, please have these ready:";

export function CallMessageForm({ bookingId, email, defaultSubject, defaultBody }: { bookingId: string; email: string; defaultSubject: string; defaultBody: string }) {
  const [state, action, pending] = useActionState<CallMessageState, FormData>(sendCallMessageAction.bind(null, bookingId), {});
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  function addPrep(item: string) {
    const line = `- ${item}`;
    const lines = body.split("\n");
    if (lines.includes(line)) return;
    const lead = lines.findIndex((l) => l.trim() === LEAD);
    if (lead >= 0) {
      let j = lead + 1;
      while (lines[j]?.startsWith("- ")) j++;
      lines.splice(j, 0, line);
    } else {
      // Put the list just before the closing "Reply to this email" paragraph, or at the end.
      const reply = lines.findIndex((l) => l.startsWith("Reply to this email"));
      lines.splice(reply >= 0 ? reply : lines.length, 0, LEAD, line, "");
    }
    setBody(lines.join("\n"));
  }

  return (
    <form action={action} className="editor-fields" style={{ maxWidth: 760 }}>
      <label className="field">
        <span>To</span>
        <input value={email} readOnly />
      </label>
      <label className="field">
        <span>Subject</span>
        <input name="subject" required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <div className="field">
        <span>Ask them to have ready <small>tap to add to your note</small></span>
        <div className="slot-picks" style={{ margin: 0 }}>
          {PREP.map((p) => (
            <button type="button" key={p} className={`slot${body.includes(`- ${p}`) ? " on" : ""}`} onClick={() => addPrep(p)}>{p}</button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Message <small>the call date, time, and Meet link are added below it automatically</small></span>
        <textarea name="body" rows={14} required maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      {state.error && <p className="editor-status" style={{ color: "#e59a9a" }}>{state.error}</p>}
      {state.sent && <p className="editor-status">Sent to {email}. You were blind-copied.</p>}
      <div className="editor-actions">
        <button type="submit" className="btn-solid" disabled={pending}>{pending ? "Sending…" : "Send to client"}</button>
        <small style={{ color: "var(--on-ink-faint)" }}>Replies come to your inbox.</small>
      </div>
    </form>
  );
}
