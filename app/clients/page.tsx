import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { FeatureImage, PhotoHero } from "@/components/SiteImages";

export const metadata: Metadata = {
  title: "Clients & Builds",
  description: "Apex works with business owners serious about expanding — whatever the business, whatever stage it's in. The readiness to grow is the qualifier.",
};

// No industry/sector list anywhere on this page: readiness, not industry.
const QUALIFIERS = [
  {
    title: "A Real Business, Not Just An Idea",
    body: "You run something real — a product, a service, or a cause — not a concept on a napkin. You just need the platform, systems, and capital to match the ambition.",
  },
  {
    title: "Ready To Invest In The Next Level",
    body: "You’re not chasing a quick fix. You’re ready to build the kind of infrastructure a growing business actually needs.",
  },
  {
    title: "Done Coordinating Five Vendors",
    body: "You’re ready for one accountable firm — platforms, marketing, AI, and capital working together, instead of a freelancer for each.",
  },
];

// Logos live in /public/images/builds. No href = not live yet (tile shows
// "In progress" and isn't a link). `dark` puts light-colored logos on ink.
type Build = { name: string; logo: string; href?: string; dark?: boolean };
const BUILDS: Build[] = [
  { name: "Committed", logo: "committed", href: "https://www.justcommitted.com" },
  { name: "Prospects", logo: "prospects", href: "https://prospectsrecruiting.com" },
  { name: "Elite Speed Athletics", logo: "elite-speed", href: "https://elitespeedathletics.com" },
  { name: "Ben Lippen Athletics", logo: "ben-lippen", href: "https://benlippenathletics.com" },
  { name: "Nola's Creationz", logo: "nolas-creationz", href: "https://nolazcreationz.com" },
  { name: "Affordable Living & Supportive Services", logo: "alss", href: "https://affordablelivingservices.org" },
  { name: "Trackmasterz Recruiting Platform", logo: "trackmasterz", dark: true },
  { name: "Toys for Tots 5K Trail Run", logo: "toys-for-tots-5k", href: "https://toys4tots5k.vercel.app" },
];

export default function ClientsPage() {
  return (
    <PageShell>
      <PhotoHero src="/images/photo-lobby.webp" position="center 40%">
          <p className="eyebrow">CLIENTS &amp; BUILDS</p>
          <h1>Real Businesses, Real Builds</h1>
          <p>
            Apex works with business owners serious about expanding &mdash; whatever the business, whatever stage it&rsquo;s in. The sector isn&rsquo;t the qualifier. The readiness to grow is.
          </p>
      </PhotoHero>

      <section className="on-paper">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">WHO QUALIFIES</p>
            <h2>Readiness, Not Industry.</h2>
            <p>Apex doesn&rsquo;t screen by sector. Three things matter more than what the business does.</p>
          </div>
          <div className="types">
            {QUALIFIERS.map((q) => (
              <div className="type-card" key={q.title}>
                <h3>{q.title}</h3>
                <p>{q.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div style={{ marginBottom: "clamp(40px, 6vw, 64px)" }}>
            <FeatureImage src="/images/clients-skyline.webp" />
          </div>
          <div className="section-head">
            <p className="eyebrow">SELECTED BUILDS</p>
            <h2>Client Builds</h2>
            <p>
              Real business owners who were ready to expand to the next level, and partnered with the firm to get there. Each logo links through to the live build.
            </p>
          </div>
          <div className="logo-grid">
            {BUILDS.map((b) => {
              const inner = (
                <>
                  <span className={`logo-face${b.dark ? " dark" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/images/builds/${b.logo}.webp`} alt={b.name} loading="lazy" />
                  </span>
                  <span className="tag">{b.href ? b.name : `${b.name} · In progress`}</span>
                </>
              );
              return b.href ? (
                <a className="logo-tile" key={b.logo} href={b.href} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              ) : (
                <div className="logo-tile static" key={b.logo}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
