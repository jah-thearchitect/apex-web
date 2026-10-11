"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TAGLINE } from "@/lib/site";
import { LogoMark } from "@/components/LogoMark";

const NAV = [
  { href: "/firm", label: "The Firm" },
  { href: "/what-we-do", label: "What We Do" },
  { href: "/clients", label: "Clients" },
  { href: "/minutes", label: "The Minutes" },
  { href: "/consultation", label: "Consultation" },
];

// Interior pages get the "← Home" link next to Menu. It was added to fix a
// reported navigation dead-end, so every page but Home must keep it.
export function SiteHeader({ showHome = true }: { showHome?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="site">
        <div className="wrap utility-bar">
          <span className="status">
            <span className="dot" /> ALL SECTORS &middot; ONE FIRM
          </span>
        </div>
        <div className="wrap nav-row">
          <Link className="brand" href="/" aria-label="Apex Capital Consultants, home">
            <LogoMark width={46} />
            <span className="brand-box">Apex</span>
            <span className="brand-sub">BRAND&nbsp;MANAGEMENT&nbsp;FIRM</span>
          </Link>
          <div className="nav-right">
            {showHome && (
              <Link className="back-home" href="/">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" stroke="currentColor" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                <span>Home</span>
              </Link>
            )}
            <button
              className="menu-btn"
              aria-expanded={open}
              aria-controls="overlayMenu"
              onClick={() => setOpen(true)}
            >
              <span className="bars"><span /><span /></span> Menu
            </button>
          </div>
        </div>
      </header>

      <div className={`overlay${open ? " open" : ""}`} id="overlayMenu" aria-hidden={!open}>
        <div className="overlay-top">
          <span className="brand">
            <LogoMark width={46} />
            <span className="brand-box">Apex</span>
          </span>
          <button className="menu-btn" aria-label="Close menu" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
            <span className="bars"><span /><span /></span> Close
          </button>
        </div>
        <nav className="overlay-links">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="overlay-foot">
          <span>{TAGLINE}</span>
        </div>
      </div>
    </>
  );
}
