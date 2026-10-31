"use client";

import { useState } from "react";

/** Copies `text` to the clipboard and says so. */
export function CopyButton({ text, label = "Copy", className = "btn-ghost" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2500);
        } catch {
          window.prompt("Copy this text:", text);
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}
