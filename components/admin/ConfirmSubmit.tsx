"use client";

/** A submit button that asks before submitting its form. */
export function ConfirmSubmit({ message, children, className }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
