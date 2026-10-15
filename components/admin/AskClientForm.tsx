"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { askClient } from "@/app/admin/request-actions";

/** Emails the client a follow-up question on their update request. */
export function AskClientForm({ requestId, email }: { requestId: string; email: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="ask-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) { setNote("Write your question first."); return; }
        if (!window.confirm(`Email this question to ${email}?`)) return;
        start(async () => {
          const r = await askClient(requestId, text);
          setNote(r.ok ? r.message : r.error);
          if (r.ok) { setText(""); router.refresh(); }
        });
      }}
    >
      <label className="field">
        <span>Ask the client <small>Emailed to {email}. They answer on the site and can attach files.</small></span>
        <textarea rows={4} value={text} onChange={(e) => { setText(e.target.value); setNote(""); }} placeholder="Which photo should replace the current hero image? Send the highest-resolution version you have." />
      </label>
      <div className="link-box">
        <button type="submit" className="btn-solid" disabled={pending}>{pending ? "Sending…" : "Send question"}</button>
        {note && <span className="action-note" role="status">{note}</span>}
      </div>
    </form>
  );
}
