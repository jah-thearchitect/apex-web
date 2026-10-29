"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookingWidget } from "./BookingWidget";

export function ManageBooking({ token, invite = false }: { token: string; invite?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reschedule" | "decline">("idle");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    const res = await fetch(`/api/booking/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setStatus(((await res.json().catch(() => ({}))) as { error?: string }).error || "That didn't go through. Please try again.");
  }

  async function cancel() {
    if (!window.confirm("Cancel this call?")) return;
    setBusy(true);
    const res = await fetch(`/api/booking/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setStatus("That didn't go through. Please try again.");
  }

  if (mode === "reschedule") {
    return (
      <div>
        <button type="button" className="bk-link" onClick={() => setMode("idle")} style={{ marginBottom: 20 }}>&larr; {invite ? "Back" : "Keep my current time"}</button>
        <BookingWidget mode="reschedule" token={token} onDone={() => { setMode("idle"); setStatus(invite ? "You're booked. A confirmation is on its way." : "Moved. A new confirmation is on its way."); router.refresh(); }} />
      </div>
    );
  }
  if (invite) {
    return mode === "decline" ? (
      <div className="bk-manage" style={{ flexDirection: "column", alignItems: "stretch", maxWidth: 560 }}>
        <label className="field">
          <span>Want to tell us why? <small>(optional)</small></span>
          <textarea rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn-ghost danger" onClick={() => respond("decline")} disabled={busy}>{busy ? "Sending…" : "Decline the call"}</button>
          <button type="button" className="bk-link" onClick={() => setMode("idle")} disabled={busy}>Back</button>
        </div>
        {status && <p className="bk-status">{status}</p>}
      </div>
    ) : (
      <div className="bk-manage">
        <button type="button" className="btn-solid" onClick={() => respond("accept")} disabled={busy}>{busy ? "Confirming…" : "Accept this time"}</button>
        <button type="button" className="btn-ghost" onClick={() => setMode("reschedule")} disabled={busy}>Pick a different time</button>
        <button type="button" className="btn-ghost danger" onClick={() => setMode("decline")} disabled={busy}>Decline</button>
        {status && <p className="bk-status">{status}</p>}
      </div>
    );
  }
  return (
    <div className="bk-manage">
      <button type="button" className="btn-solid" onClick={() => setMode("reschedule")} disabled={busy}>Pick a different time</button>
      <button type="button" className="btn-ghost danger" onClick={cancel} disabled={busy}>{busy ? "Cancelling…" : "Cancel this call"}</button>
      {status && <p className="bk-status">{status}</p>}
    </div>
  );
}
