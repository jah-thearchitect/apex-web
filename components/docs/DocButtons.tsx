"use client";

import { useState } from "react";

export function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <button type="button" className="doc-btn" onClick={() => window.print()}>
      {label}
    </button>
  );
}

/** Asks the server for a Stripe Checkout link, then goes there. */
export function PayButton({ token, label }: { token: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/pay/${token}`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && json.url) {
        window.location.href = json.url;
        return;
      }
      setError(json.error ?? "Payment couldn't be started. Please try again.");
    } catch {
      setError("Payment couldn't be started. Please try again.");
    }
    setBusy(false);
  }

  return (
    <>
      <button type="button" className="doc-btn doc-btn-solid" onClick={pay} disabled={busy}>
        {busy ? "Opening secure checkout…" : label}
      </button>
      {error && <p className="doc-alert">{error}</p>}
    </>
  );
}
