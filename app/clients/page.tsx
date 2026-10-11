import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { FeatureImage, PhotoHero } from "@/components/SiteImages";

export const metadata: Metadata = {
  title: "Clients",
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

// Text wordmarks until the owner sends logo files; keep the same links.
const BUILDS = [
  { name: "Elite Speed Athletics", href: "https://elitespeedathletics.com" },
  { name: "Affordable Living & Supportive Services", href: "https://affordablelivingservices.org" },
  { name: "Nolaz Creationz", href: "https://nolazcreationz.com" },
  { name: "Ben Lippen Athletics", href: "https://benlippenathletics.com" },
];

export default function ClientsPage() {
  return (
    <PageShell>
      <PhotoHero src="/images/photo-lobby.webp" position="center 40%">
          <p className="eyebrow">CLIENTS</p>
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
              Real business owners who were ready to expand to the next level, and partnered with the firm to get there. Each name below links through to the live build &mdash; logo artwork is on its way.
            </p>
          </div>
          <div className="logo-grid">
            {BUILDS.map((b) => (
              <a className="logo-tile" key={b.href} href={b.href} target="_blank" rel="noopener noreferrer">
                <span className="mark">{b.name}</span>
                <span className="tag">Logo coming soon</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
