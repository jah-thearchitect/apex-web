"use client";

import { useState } from "react";

export const SUBSCRIBED_KEY = "apex_mastermind_subscribed";

export function NewsletterForm({
  buttonLabel,
  source,
  onSubscribed,
}: {
  buttonLabel: string;
  source: string;
  onSubscribed?: () => void;
}) {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setSending(true);
    setStatus("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus(json.error ?? "Something went wrong and you weren’t added. Please try again.");
        return;
      }
      setStatus("You’re on the list. New Minutes will land in your inbox.");
      try {
        window.localStorage.setItem(SUBSCRIBED_KEY, "1");
      } catch {}
      form.reset();
      onSubscribed?.();
    } catch {
      setStatus("Something went wrong and you weren’t added. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <form className="nl-form" onSubmit={onSubmit}>
        <div className="nl-names">
          <input type="text" name="firstName" required maxLength={60} placeholder="First name" aria-label="First name" autoComplete="given-name" />
          <input type="text" name="lastName" maxLength={80} placeholder="Last name (optional)" aria-label="Last name (optional)" autoComplete="family-name" />
        </div>
        <input type="email" name="email" required maxLength={254} placeholder="you@business.com" aria-label="Email address" autoComplete="email" />
        <div className="hp-field" aria-hidden="true">
          <label>
            Company website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <button type="submit" className="btn-solid" disabled={sending}>
          {sending ? "Joining…" : buttonLabel}
        </button>
      </form>
      <p className="nl-status" role="status">{status}</p>
    </>
  );
}
