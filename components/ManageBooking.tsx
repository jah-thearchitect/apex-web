"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookingWidget } from "./BookingWidget";

export function ManageBooking({ token }: { token: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reschedule">("idle");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

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
        <button type="button" className="bk-link" onClick={() => setMode("idle")} style={{ marginBottom: 20 }}>&larr; Keep my current time</button>
        <BookingWidget mode="reschedule" token={token} onDone={() => { setMode("idle"); setStatus("Moved. A new confirmation is on its way."); router.refresh(); }} />
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
