"use client";

import { useState } from "react";

// Placeholder fields: the owner is sending his real paper inquiry form.
// Replace these (here and in app/api/inquiry/route.ts) when it arrives.
export function InquiryForm() {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSending(true);
    setStatus("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setStatus("Thanks — got it. The firm will follow up directly.");
        form.reset();
      } else {
        setStatus(data.error ?? "Something went wrong and your inquiry wasn’t sent. Please try again.");
      }
    } catch {
      setStatus("Something went wrong and your inquiry wasn’t sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <form className="inquiry-form" onSubmit={onSubmit}>
        <input type="text" name="name" placeholder="Your name" required maxLength={120} aria-label="Your name" />
        <input type="email" name="email" placeholder="you@business.com" required maxLength={254} aria-label="Email address" />
        <textarea name="details" placeholder="What do you want built?" required maxLength={5000} aria-label="What do you want built?" />
        {/* Honeypot: hidden from people, filled in by naive bots. */}
        <div className="hp-field" aria-hidden="true">
          <label>
            Company website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <button type="submit" className="btn-solid" disabled={sending}>
          {sending ? "Sending…" : "Send Inquiry"}
        </button>
      </form>
      <p className="inquiry-status" role="status">{status}</p>
    </>
  );
}
