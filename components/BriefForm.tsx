"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  missingIn, OTHER, SECTIONS, visibleQuestions, visibleSections,
  type Answers, type FileRef, type Question,
} from "@/lib/briefQuestions";
import { FileField } from "./FileField";

type SaveState = "" | "saving" | "saved" | "error";

export function BriefForm({
  token, businessName, initialAnswers, initialStep,
}: { token: string; businessName: string; initialAnswers: Answers; initialStep: number }) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const sections = useMemo(() => visibleSections(answers), [answers]);
  const [current, setCurrent] = useState(() => (SECTIONS[initialStep] ?? SECTIONS[0]).id);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [save, setSave] = useState<SaveState>("");
  const [error, setError] = useState("");
  const [later, setLater] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const latest = useRef(answers);
  const dirty = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  // A section can disappear (e.g. "No" to payments); fall back to the nearest one.
  const index = Math.max(0, sections.findIndex((s) => s.id === current));
  const section = sections[index] ?? sections[0];
  const stepFor = (id: string) => Math.max(0, SECTIONS.findIndex((s) => s.id === id));

  const persist = useCallback(async (submit = false) => {
    setSave("saving");
    try {
      const res = await fetch(`/api/brief/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: latest.current, step: stepFor(current), submit }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSave("error");
        return { ok: false as const, error: (json.error as string) ?? "Couldn't save. Check your connection.", section: json.section as string | undefined };
      }
      dirty.current = false;
      setSave("saved");
      return { ok: true as const };
    } catch {
      setSave("error");
      return { ok: false as const, error: "Couldn't save. Check your connection and try again." };
    }
  }, [token, current]);

  // Autosave a moment after typing stops.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => { persist(); }, 1200);
    return () => clearTimeout(t);
  }, [answers, persist]);

  // Leaving the tab: hand any unsaved answers to the browser to deliver.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden" && dirty.current) {
        navigator.sendBeacon(`/api/brief/${token}`, new Blob([JSON.stringify({ answers: latest.current, step: stepFor(current) })], { type: "application/json" }));
        dirty.current = false;
      }
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [token, current]);

  function set(id: string, value: Answers[string] | ((prev: Answers[string] | undefined) => Answers[string])) {
    dirty.current = true;
    setLater(false);
    setError("");
    setAnswers((a) => {
      const next = { ...a, [id]: typeof value === "function" ? value(a[id]) : value };
      latest.current = next;
      return next;
    });
    if (missing.has(id)) setMissing((m) => { const n = new Set(m); n.delete(id); return n; });
  }

  function go(id: string) {
    setCurrent(id);
    setMissing(new Set());
    setError("");
    if (dirty.current) persist();
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function next() {
    const gaps = missingIn(section, answers);
    if (gaps.length) {
      setMissing(new Set(gaps.map((q) => q.id)));
      setError("Fill in the required answers to continue.");
      document.getElementById(`q-${gaps[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (index < sections.length - 1) return go(sections[index + 1].id);

    setSubmitting(true);
    const r = await persist(true);
    setSubmitting(false);
    if (r.ok) {
      setDone(true);
      requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } else {
      setError(r.error);
      if (r.section) setCurrent(r.section);
    }
  }

  if (done) {
    return (
      <div className="brief" ref={top}>
        <div className="brief-done">
          <p className="eyebrow">BUILD BRIEF RECEIVED</p>
          <h1>Thank you. We have everything we need to start.</h1>
          <p>Your answers for {businessName} are in, and a copy of the confirmation is in your inbox. We&rsquo;ll reach out if anything needs a closer look.</p>
        </div>
      </div>
    );
  }

  const pct = Math.round(((index + 1) / sections.length) * 100);

  return (
    <div className="brief" ref={top}>
      <div className="brief-head">
        <p className="eyebrow">BUILD BRIEF &middot; {businessName.toUpperCase()}</p>
        <h1>Let&rsquo;s get everything in one pass.</h1>
        <p className="brief-lede">Answer what you can and skip anything that doesn&rsquo;t apply. Your answers save as you go, so you can come back anytime with the link in your email.</p>
        <div className="brief-progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        <div className="brief-meta">
          <span>Step {index + 1} of {sections.length}</span>
          <span className={`brief-save ${save}`} aria-live="polite">
            {save === "saving" ? "Saving…" : save === "saved" ? "Saved" : save === "error" ? "Not saved yet" : ""}
          </span>
        </div>
      </div>

      <div className="brief-body">
        <nav className="brief-nav" aria-label="Brief sections">
          {sections.map((s, i) => {
            const complete = i < index || (i !== index && missingIn(s, answers).length === 0 && hasAny(s.questions, answers));
            return (
              <button key={s.id} type="button" className={`${s.id === section.id ? "on" : ""}${complete ? " done" : ""}`} onClick={() => go(s.id)}>
                {s.title}
              </button>
            );
          })}
        </nav>

        <section className="brief-panel">
          <h2>{section.title}</h2>
          <p className="brief-intro">{section.intro}</p>
          <div className="brief-qs">
            {visibleQuestions(section, answers).map((q) => (
              <QuestionField key={q.id} q={q} answers={answers} set={set} token={token} flagged={missing.has(q.id)} />
            ))}
          </div>

          {error && <p className="brief-error" role="alert">{error}</p>}
          {later && <p className="brief-later">Saved. Come back anytime with the link in your email.</p>}

          <div className="brief-foot">
            {index > 0 ? (
              <button type="button" className="bk-link" onClick={() => go(sections[index - 1].id)}>&larr; Back</button>
            ) : <span />}
            <div className="brief-foot-right">
              <button type="button" className="bk-link" onClick={async () => { await persist(); setLater(true); }}>Finish later</button>
              <button type="button" className="btn-solid" onClick={next} disabled={submitting}>
                {index === sections.length - 1 ? (submitting ? "Submitting…" : "Submit brief") : "Continue →"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function hasAny(qs: Question[], a: Answers) {
  return qs.some((q) => {
    const v = a[q.id];
    return Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "";
  });
}

function QuestionField({
  q, answers, set, token, flagged,
}: { q: Question; answers: Answers; set: (id: string, v: Answers[string] | ((prev: Answers[string] | undefined) => Answers[string])) => void; token: string; flagged: boolean }) {
  const value = answers[q.id];
  const label = (
    <span className="bq-label">
      {q.label}
      {q.required && <em className="bq-req">Required</em>}
    </span>
  );

  let control: React.ReactNode;
  if (q.type === "choice") {
    const options = [...q.options, ...(q.other ? [OTHER] : [])];
    const chosen = Array.isArray(value) ? (value as string[]) : typeof value === "string" && value ? [value] : [];
    // Built from the latest saved state, so quick taps never drop a pick.
    const toggle = (o: string) =>
      set(q.id, (prev) => {
        if (q.multi) {
          const list = Array.isArray(prev) ? (prev as string[]) : [];
          return list.includes(o) ? list.filter((x) => x !== o) : [...list, o];
        }
        return prev === o ? "" : o;
      });
    control = (
      <>
        <div className="bq-chips" role={q.multi ? "group" : "radiogroup"}>
          {options.map((o) => (
            <button
              key={o} type="button" role={q.multi ? "checkbox" : "radio"} aria-checked={chosen.includes(o)}
              className={`bq-chip${chosen.includes(o) ? " on" : ""}`} onClick={() => toggle(o)}
            >
              {o}
            </button>
          ))}
        </div>
        {chosen.includes(OTHER) && (
          <input
            className="bq-input bq-other" placeholder="Tell us more" aria-label={`${q.label}: other`}
            value={String(answers[`${q.id}__other`] ?? "")} onChange={(e) => set(`${q.id}__other`, e.target.value)}
          />
        )}
      </>
    );
  } else if (q.type === "files") {
    control = <FileField uploadUrl={`/api/brief/${token}/upload`} files={(value as FileRef[]) ?? []} onChange={(f) => set(q.id, f)} />;
  } else if (q.type === "textarea") {
    control = (
      <textarea
        id={`f-${q.id}`} className="bq-input" rows={4} placeholder={q.placeholder}
        value={typeof value === "string" ? value : ""} onChange={(e) => set(q.id, e.target.value)}
      />
    );
  } else {
    control = (
      <input
        id={`f-${q.id}`} className="bq-input" type={q.type} placeholder={q.placeholder}
        value={typeof value === "string" ? value : ""} onChange={(e) => set(q.id, e.target.value)}
      />
    );
  }

  const Wrapper = q.type === "choice" || q.type === "files" ? "div" : "label";
  return (
    <Wrapper id={`q-${q.id}`} className={`bq${flagged ? " flagged" : ""}`} {...(Wrapper === "label" ? { htmlFor: `f-${q.id}` } : {})}>
      {label}
      {q.hint && <span className="bq-hint">{q.hint}</span>}
      {control}
      {flagged && <span className="bq-flag">Required</span>}
    </Wrapper>
  );
}
