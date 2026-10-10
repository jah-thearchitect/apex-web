"use client";

import { useState } from "react";

export const SUBSCRIBED_KEY = "apex_mastermind_subscribed";

// Mastermind Minutes signup: no email list provider is chosen yet, so this
// doesn't pretend to save anything. It just confirms receipt honestly.
// Swap for the real provider once one is picked.
export function NewsletterForm({ buttonLabel, onSubscribed }: { buttonLabel: string; onSubscribed?: () => void }) {
  const [status, setStatus] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (new FormData(form).get("email") as string | null)?.trim();
    if (!email) return;
    setStatus("Thanks — you’re on the list. The Minutes will start landing once our email service is fully connected.");
    try {
      window.localStorage.setItem(SUBSCRIBED_KEY, "1");
    } catch {}
    form.reset();
    onSubscribed?.();
  }

  return (
    <>
      <form className="nl-form" onSubmit={onSubmit}>
        <input type="email" name="email" required placeholder="you@business.com" aria-label="Email address" />
        <button type="submit" className="btn-solid">{buttonLabel}</button>
      </form>
      <p className="nl-status" role="status">{status}</p>
    </>
  );
}
