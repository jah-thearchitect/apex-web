"use client";

import { useState } from "react";
import { OTHER, UPDATE_KINDS, UPDATE_URGENCY, type FileRef } from "@/lib/briefQuestions";
import { FileField } from "./FileField";

export function UpdateRequestForm({
  token, businessName, defaultName, defaultEmail,
}: { token: string; businessName: string; defaultName: string; defaultEmail: string }) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [build, setBuild] = useState(businessName);
  const [kind, setKind] = useState("");
  const [kindOther, setKindOther] = useState("");
  const [details, setDetails] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState("");
  const [files, setFiles] = useState<FileRef[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !kind || !urgency || !details.trim()) {
      setError("Fill in your name, email, the kind of change, how soon, and what needs to change.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/update/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, build, kind, kindOther, details, location, urgency, files }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Your request didn't go through. Try again.");
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your request didn't go through. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="brief-done">
        <p className="eyebrow">REQUEST RECEIVED</p>
        <h1>We&rsquo;ve got it.</h1>
        <p>Your update request is with Apex, and a confirmation is on its way to {email}. We&rsquo;ll follow up with timing.</p>
        <button type="button" className="btn-ghost" style={{ marginTop: 24 }} onClick={() => {
          setSent(false); setKind(""); setKindOther(""); setDetails(""); setLocation(""); setUrgency(""); setFiles([]);
        }}>Send another request</button>
      </div>
    );
  }

  return (
    <form className="brief-panel update-form" onSubmit={submit} noValidate>
      <div className="bq-row">
        <label className="bq"><span className="bq-label">Your name <em className="bq-req">Required</em></span>
          <input className="bq-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="bq"><span className="bq-label">Your email <em className="bq-req">Required</em></span>
          <input className="bq-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
      </div>
      <label className="bq"><span className="bq-label">Which site or build?</span>
        <input className="bq-input" value={build} onChange={(e) => setBuild(e.target.value)} />
      </label>

      <div className="bq">
        <span className="bq-label">What kind of change? <em className="bq-req">Required</em></span>
        <div className="bq-chips" role="radiogroup">
          {UPDATE_KINDS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={`bq-chip${kind === k ? " on" : ""}`} onClick={() => setKind(k)}>{k}</button>
          ))}
        </div>
        {kind === OTHER && <input className="bq-input bq-other" placeholder="What kind of change?" value={kindOther} onChange={(e) => setKindOther(e.target.value)} />}
      </div>

      <label className="bq"><span className="bq-label">What needs to change? <em className="bq-req">Required</em></span>
        <span className="bq-hint">Be as specific as you can: the exact new wording, what&rsquo;s wrong and what you expected, or how the new feature should work.</span>
        <textarea className="bq-input" rows={6} value={details} onChange={(e) => setDetails(e.target.value)} />
      </label>

      <label className="bq"><span className="bq-label">Where on the site?</span>
        <span className="bq-hint">Paste the page link, or describe where it is.</span>
        <input className="bq-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="https://yoursite.com/about" />
      </label>

      <div className="bq">
        <span className="bq-label">How soon do you need it? <em className="bq-req">Required</em></span>
        <div className="bq-chips" role="radiogroup">
          {UPDATE_URGENCY.map((u) => (
            <button key={u} type="button" role="radio" aria-checked={urgency === u} className={`bq-chip${urgency === u ? " on" : ""}`} onClick={() => setUrgency(u)}>{u}</button>
          ))}
        </div>
      </div>

      <div className="bq">
        <span className="bq-label">Files</span>
        <span className="bq-hint">New photos, documents, or a screenshot of the problem.</span>
        <FileField uploadUrl={`/api/update/${token}/upload`} files={files} onChange={setFiles} max={15} />
      </div>

      {error && <p className="brief-error" role="alert">{error}</p>}
      <div className="brief-foot">
        <span />
        <button type="submit" className="btn-solid" disabled={sending}>{sending ? "Sending…" : "Send request →"}</button>
      </div>
    </form>
  );
}
