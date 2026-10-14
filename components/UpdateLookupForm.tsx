"use client";

import { useState } from "react";

export function UpdateLookupForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"" | "sending" | "sent">("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const website = String(new FormData(e.currentTarget).get("website") ?? "");
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/update/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "That didn't go through. Try again.");
      setState("sent");
    } catch (err) {
      setState("");
      setError(err instanceof Error ? err.message : "That didn't go through. Try again.");
    }
  }

  if (state === "sent") {
    return (
      <p className="inquiry-status" role="status">
        If {email} is on file as an Apex client, your private update link is on its way. Check your inbox in a minute or two.
      </p>
    );
  }

  return (
    <form className="inquiry-form" onSubmit={submit}>
      <input type="email" required placeholder="The email Apex has on file" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-label="Your email" />
      <label className="hp-field" aria-hidden="true">
        Company website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" className="btn-solid" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email my link →"}</button>
      {error && <p className="inquiry-status" role="alert">{error}</p>}
    </form>
  );
}
