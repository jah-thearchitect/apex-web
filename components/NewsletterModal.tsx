"use client";

import { useEffect, useState } from "react";
import { NewsletterForm, SUBSCRIBED_KEY } from "./NewsletterForm";

const DISMISSED_KEY = "apex_mastermind_dismissed";

// Soft one-time prompt, not a hard gate: skip entirely if already
// subscribed or dismissed in this browser, and never block first paint.
export function NewsletterModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let already = false;
    try {
      already =
        window.localStorage.getItem(SUBSCRIBED_KEY) === "1" ||
        window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {}
    if (already) return;
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  }

  return (
    <div
      className={`modal-backdrop${open ? " open" : ""}`}
      aria-hidden={!open}
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="mmTitle">
        <button className="modal-close" onClick={dismiss} tabIndex={open ? 0 : -1}>Close</button>
        <p className="eyebrow">THE MASTERMIND MINUTES</p>
        <h3 id="mmTitle">Get the Minutes before you leave.</h3>
        <p>A few minutes on scaling, branding, and capital &mdash; straight to your inbox, no fluff.</p>
        {open && <NewsletterForm buttonLabel="Join" />}
      </div>
    </div>
  );
}
