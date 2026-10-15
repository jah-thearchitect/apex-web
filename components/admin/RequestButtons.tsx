"use client";

import { useState, useTransition } from "react";
import { reopenBrief, sendBuildBrief, sendUpdateLink, setRequestStatus } from "@/app/admin/request-actions";

type Result = { ok: true; message: string } | { ok: false; error: string };

const ACTIONS = {
  sendBrief: sendBuildBrief,
  sendUpdateLink,
  reopenBrief,
} as const;

/** A button that runs one admin request action and shows what happened. */
export function RequestAction({
  action, id, label, confirm, solid,
}: { action: keyof typeof ACTIONS; id: string; label: string; confirm?: string; solid?: boolean }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  return (
    <span className="link-box">
      <button
        type="button" className={solid ? "btn-solid" : "btn-ghost"} disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r: Result = await ACTIONS[action](id);
            setNote(r.ok ? r.message : r.error);
          });
        }}
      >
        {pending ? "Working…" : label}
      </button>
      {note && <span className="action-note" role="status">{note}</span>}
    </span>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="link-box">
      <code>{url}</code>
      <button type="button" className="btn-ghost" onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}>{copied ? "Copied" : "Copy"}</button>
    </span>
  );
}

const LABEL: Record<string, string> = { NEW: "New", IN_PROGRESS: "In progress", WAITING: "Waiting on client", DONE: "Done" };

export function RequestStatusPicker({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(status);
  const [note, setNote] = useState("");
  return (
    <span className="link-box">
      <span className="tab-row" role="radiogroup" aria-label="Status">
        {Object.entries(LABEL).map(([k, v]) => (
          <button
            key={k} type="button" role="radio" aria-checked={value === k} disabled={pending}
            className={value === k ? "btn-solid" : "btn-ghost"}
            onClick={() => start(async () => {
              const r = await setRequestStatus(id, k);
              if (r.ok) setValue(k);
              setNote(r.ok ? "" : r.error);
            })}
          >
            {v}
          </button>
        ))}
      </span>
      {note && <span className="action-note">{note}</span>}
    </span>
  );
}
