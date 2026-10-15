"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FileRef } from "@/lib/briefQuestions";
import { FileField } from "./FileField";

/** The client's answer to a follow-up question on their update request. */
export function RequestReplyForm({ token, requestId }: { token: string; requestId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileRef[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) { setError("Write your answer or attach a file."); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/update/${token}/r/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, files }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Your reply didn't go through. Try again.");
      setText("");
      setFiles([]);
      setSent(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your reply didn't go through. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="brief-panel update-form" onSubmit={submit} noValidate>
      <label className="bq">
        <span className="bq-label">Your answer</span>
        <textarea className="bq-input" rows={5} value={text} onChange={(e) => { setText(e.target.value); setSent(false); setError(""); }} />
      </label>
      <div className="bq">
        <span className="bq-label">Files</span>
        <FileField uploadUrl={`/api/update/${token}/upload`} files={files} onChange={(f) => { setFiles(f); setSent(false); }} max={15} />
      </div>
      {error && <p className="brief-error" role="alert">{error}</p>}
      {sent && <p className="brief-later" role="status">Sent. Apex has your answer.</p>}
      <div className="brief-foot">
        <span />
        <button type="submit" className="btn-solid" disabled={sending}>{sending ? "Sending…" : "Send answer →"}</button>
      </div>
    </form>
  );
}
