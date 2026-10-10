import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "What We Do",
  description: "The Six Disciplines: structuring, websites & platforms, marketing & visibility, app development, AI integration, and business funding — one accountable firm.",
};

const DISCIPLINES: { title: string; body: string; caps?: string[] }[] = [
  {
    title: "Business Structuring & Incorporating",
    body: "Entity formation, structuring, and the paperwork that protects what you build — settled before anything else gets built on top of it.",
  },
  {
    title: "Business Websites & Platforms",
    body: "We call it a website. We build it as a platform — the enterprise-level system your business runs on, not just a page that describes it: clear positioning, real conversion paths, e-commerce when you're selling directly, and the craft to hold up under scrutiny.",
  },
  {
    title: "Marketing & Visibility",
    body: "Positioning, content, and campaigns that get a platform in front of the people who need it — built with the same systems-first approach as everything else the firm builds, not bolted on after the fact.",
    caps: ["SEO", "Paid Ads Management", "Social Content", "CRM & Marketing Automation", "Brand Identity & Design Systems", "Analytics & Reporting"],
  },
  {
    title: "Business App Development",
    body: "Client portals, booking systems, and internal platforms built around how your business actually operates — systems that function and grow with you, not templates you outgrow.",
  },
  {
    title: "Business AI Integration",
    body: "Agents and systems that streamline the repeatable work and turn it into leverage — built to expand what a business can do and capitalize on it financially, not just automate for its own sake.",
  },
  {
    title: "Business Funding",
    body: "Access to lenders and financing partners for the businesses that need capital to execute on the disciplines above.",
  },
];

const STEPS = [
  { num: "01 / PLAN", title: "Lock the architecture", body: "The structure gets decided before a line of code is written or a contractor is hired." },
  { num: "02 / TEMPLATE", title: "Build the pattern, not the exception", body: "Every solution starts as a reusable template, then gets configured to your business." },
  { num: "03 / PROVE", title: "Manual before automatic", body: "New automation runs on manual triggers first, and only moves to a schedule once it's proven." },
  { num: "04 / SCALE", title: "Hand over a foundation", body: "The goal isn't a finished project. It's something built to keep taking weight as you grow." },
];

export default function WhatWeDoPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="wrap">
          <p className="eyebrow">WHAT WE DO</p>
          <h1>The Six Disciplines</h1>
          <p>
            Every discipline stands on its own. You don&rsquo;t have to start with structuring &mdash; begin wherever your business is today, and Apex meets you there. Plan, build, market, fund, and grow &mdash; one accountable firm instead of five different vendors.
          </p>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="disciplines">
            {DISCIPLINES.map((d, i) => (
              <div className="discipline" key={d.title}>
                <span className="tag">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{d.title}</h3>
                  <p>{d.body}</p>
                  {d.caps && (
                    <div className="cap-list">
                      {d.caps.map((c) => (
                        <span className="cap" key={c}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="sub-head" id="how-we-work">
            <span className="tag">How We Work</span>
            <h3>No One-Off Builds</h3>
          </div>
          <p style={{ color: "var(--on-ink-soft)", maxWidth: "58ch", marginBottom: 36 }}>
            The same four rules apply whether we&rsquo;re building for a client or for one of Apex&rsquo;s own companies.
          </p>
          <div className="process">
            {STEPS.map((s) => (
              <div className="p-step" key={s.num}>
                <span className="num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
