import Link from "next/link";
import { ArrowRing } from "@/components/ArrowRing";
import { NewsletterForm } from "@/components/NewsletterForm";
import { NewsletterModal } from "@/components/NewsletterModal";
import { PageShell } from "@/components/PageShell";

const TEASERS = [
  { href: "/firm", tag: "The Firm", title: "Who We Are", body: "How Apex operates, and the standard every build is held to." },
  { href: "/what-we-do", tag: "What We Do", title: "Six Disciplines", body: "Platforms, marketing, AI, funding, and everything between — start wherever you are." },
  { href: "/clients", tag: "Clients", title: "Real Businesses, Real Builds", body: "Any sector, any stage — built for owners serious about expanding." },
];

export default function Home() {
  return (
    <>
      <PageShell showHome={false}>
        <section className="hero">
          <svg className="hero-bg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <radialGradient id="glow" cx="78%" cy="18%" r="60%">
                <stop offset="0%" stopColor="#A9C4D6" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#A9C4D6" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A0B0D" stopOpacity="0" />
                <stop offset="100%" stopColor="#0A0B0D" stopOpacity="1" />
              </linearGradient>
            </defs>
            <rect width="1200" height="800" fill="url(#glow)" />
            <g stroke="#EFEBDD" strokeOpacity="0.06" strokeWidth="1">
              <line x1="0" y1="120" x2="1200" y2="120" />
              <line x1="0" y1="280" x2="1200" y2="280" />
              <line x1="0" y1="440" x2="1200" y2="440" />
              <line x1="0" y1="600" x2="1200" y2="600" />
              <line x1="200" y1="0" x2="200" y2="800" />
              <line x1="500" y1="0" x2="500" y2="800" />
              <line x1="800" y1="0" x2="800" y2="800" />
              <line x1="1000" y1="0" x2="1000" y2="800" />
            </g>
            <polyline points="60,560 260,470 460,510 660,320 860,360 1060,150" fill="none" stroke="#CFE3EE" strokeWidth="1.5" strokeOpacity="0.5" />
            <circle cx="1060" cy="150" r="4" fill="#CFE3EE" />
            <rect width="1200" height="800" fill="url(#fade)" />
          </svg>
          <div className="wrap hero-inner">
            <p className="eyebrow">APEX CAPITAL CONSULTANTS &middot; BRAND MANAGEMENT FIRM</p>
            <h1>Start. Expand. <em>Profit.</em></h1>
            <p className="lede">
              We build and integrate the AI, platforms, and capital a business needs to grow &mdash; in any sector, under one accountable firm.
            </p>
            <div className="hero-ctas">
              <Link className="btn-solid" href="/consultation">Book a Consultation</Link>
              <Link className="arrow-link" href="/firm">Meet the Firm <ArrowRing /></Link>
            </div>
          </div>
        </section>

        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="teasers">
              {TEASERS.map((t) => (
                <Link key={t.href} className="teaser" href={t.href}>
                  <span className="tag">{t.tag}</span>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                  <span className="arrow-link go">Explore <ArrowRing /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="on-ink-2">
          <div className="wrap">
            <div className="newsletter">
              <div>
                <p className="eyebrow">THE MASTERMIND MINUTES</p>
                <h3>A few minutes that sharpen how you run your business.</h3>
                <p>Short, direct reads on scaling, branding, and capital &mdash; the kind of thinking that puts you ahead before your competitors catch on.</p>
              </div>
              <div>
                <NewsletterForm buttonLabel="Join the Minutes" />
                <p className="nl-note">We&rsquo;ll only use this to send the Minutes. Unsubscribe anytime.</p>
              </div>
            </div>
          </div>
        </section>
      </PageShell>
      <NewsletterModal />
    </>
  );
}
