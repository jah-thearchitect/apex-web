"use client";

import { useActionState, useEffect, useState } from "react";
import { saveWorkLog, type WorkLogState } from "@/app/admin/worklog-actions";
import { WORK_CATEGORIES } from "@/lib/workLogShared";

export type LogEntry = {
  id?: string;
  clientId: string;
  date: string;
  project: string;
  category: string;
  title: string;
  details: string;
  hours: string;
  mins: string;
  visible: boolean;
};

export function WorkLogForm({
  clients,
  projects,
  initial,
}: {
  clients: { id: string; name: string }[];
  /** Projects already used, by client id, to suggest as you type. */
  projects: Record<string, string[]>;
  initial: LogEntry;
}) {
  const editing = !!initial.id;
  const [state, action, pending] = useActionState<WorkLogState, FormData>(saveWorkLog, {});
  const [f, setF] = useState(initial);
  const set = <K extends keyof LogEntry>(k: K, v: LogEntry[K]) => setF((x) => ({ ...x, [k]: v }));
  const [justSaved, setJustSaved] = useState(false);

  // After adding an entry, keep client, date, category and project (the next
  // entry is usually the same) and clear what's specific to the last one.
  useEffect(() => {
    if (!state.saved) return;
    setF((x) => ({ ...x, title: "", details: "", hours: "", mins: "" }));
    setJustSaved(true);
    const t = setTimeout(() => setJustSaved(false), 4000);
    return () => clearTimeout(t);
  }, [state.saved]);

  const suggestions = projects[f.clientId] ?? [];

  return (
    <form action={action} className="editor-fields" style={{ maxWidth: 820 }}>
      {editing && <input type="hidden" name="id" value={initial.id} />}
      <div className="field-grid">
        <label className="field">
          <span>Client</span>
          <select name="clientId" required value={f.clientId} onChange={(e) => set("clientId", e.target.value)}>
            <option value="" disabled>Choose a client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Date worked</span>
          <input type="date" name="date" required value={f.date} onChange={(e) => set("date", e.target.value)} />
        </label>
        <label className="field">
          <span>Category</span>
          <select name="category" required value={f.category} onChange={(e) => set("category", e.target.value)}>
            {WORK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>Project <small>optional, e.g. Staff &amp; Board Member Build</small></span>
          <input name="project" maxLength={120} list="worklog-projects" value={f.project} onChange={(e) => set("project", e.target.value)} autoComplete="off" />
          <datalist id="worklog-projects">{suggestions.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        <div className="field">
          <span>Time spent <small>for your records only, never shown to the client</small></span>
          <div className="avail-range">
            <input type="number" name="hours" min={0} max={24} placeholder="0" value={f.hours} onChange={(e) => set("hours", e.target.value)} style={{ width: 80 }} aria-label="Hours" />
            <span>hr</span>
            <input type="number" name="mins" min={0} max={59} step={5} placeholder="0" value={f.mins} onChange={(e) => set("mins", e.target.value)} style={{ width: 80 }} aria-label="Minutes" />
            <span>min</span>
          </div>
        </div>
      </div>
      <label className="field">
        <span>What was done <small>short title</small></span>
        <input name="title" required maxLength={160} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Built the staff permissions screen" />
      </label>
      <label className="field">
        <span>Details <small>optional: what changed, why, anything worth remembering for the monthly report</small></span>
        <textarea name="details" rows={4} maxLength={4000} value={f.details} onChange={(e) => set("details", e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" name="visible" checked={f.visible} onChange={(e) => set("visible", e.target.checked)} />
        Include in the client&rsquo;s monthly report <small style={{ color: "var(--on-ink-faint)" }}>(untick for internal-only work)</small>
      </label>

      {state.error && <p className="editor-status" style={{ color: "#e59a9a" }}>{state.error}</p>}
      <div className="editor-actions">
        <button type="submit" className="btn-solid" disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Add to work log"}</button>
        {justSaved && <span className="editor-status" style={{ margin: 0 }}>Added.</span>}
      </div>
    </form>
  );
}
