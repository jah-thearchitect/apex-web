import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRing } from "@/components/ArrowRing";
import { PageShell } from "@/components/PageShell";
import { PhotoHero } from "@/components/SiteImages";

export const metadata: Metadata = {
  title: "Services",
  description: "The services behind Apex's six disciplines: structuring, websites & platforms, marketing, app development, AI integration, and business funding.",
};

const ENGAGEMENTS = [
  {
    title: "Single Build",
    body: "One defined project with a clear finish line: a new entity, a platform, an app, or an AI system. Scoped up front and delivered as a foundation you own.",
  },
  {
    title: "Monthly Partnership",
    body: "An ongoing retainer for the work that never stops: marketing, platform upkeep, and AI systems that keep running. Every month closes with a written report of what was done.",
  },
  {
    title: "Funding Access",
    body: "Introductions to lenders and financing partners when capital is what stands between the business and its next build.",
  },
];

const SERVICES: { title: string; lede: string; items: string[] }[] = [
  {
    title: "Business Structuring & Incorporating",
    lede: "The paperwork that protects what you build, settled first.",
    items: ["Entity formation", "EIN & state registrations", "Ownership & operating structure", "Business banking setup", "Annual filing calendar"],
  },
  {
    title: "Business Websites & Platforms",
    lede: "The system your business runs on, not just a page that describes it.",
    items: ["Brand websites & landing pages", "E-commerce stores", "Client & member portals", "Booking & payment flows", "Domain & business email setup", "Hosting, security & maintenance"],
  },
  {
    title: "Marketing & Visibility",
    lede: "Getting the platform in front of the people who need it.",
    items: ["SEO", "Paid ads management", "Social content", "Email newsletters", "CRM & marketing automation", "Brand identity & design systems", "Analytics & reporting"],
  },
  {
    title: "Business App Development",
    lede: "Software built around how your business actually operates.",
    items: ["Client portals", "Booking & scheduling systems", "Internal dashboards & admin tools", "Mobile-ready web apps", "Integrations with the tools you already use"],
  },
  {
    title: "Business AI Integration",
    lede: "Agents and systems that turn repeatable work into leverage.",
    items: ["AI chat & voice agents", "Workflow automation", "Document & data processing", "Content systems", "Team training on AI tools"],
  },
  {
    title: "Business Funding",
    lede: "Capital to execute on everything above.",
    items: ["Funding readiness review", "Lender & financing introductions", "Capital planning for builds"],
  },
];

export default function ServicesPage() {
  return (
    <PageShell>
      <PhotoHero src="/images/six-disciplines.webp">
        <p className="eyebrow">SERVICES</p>
        <h1>Everything It Takes to Build, Expand, and Profit.</h1>
        <p>
          Every service below belongs to one of the six disciplines. Start with the one your business needs now, or let the firm combine them into a single plan.
        </p>
      </PhotoHero>

      <section className="on-paper">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">HOW TO WORK WITH APEX</p>
            <h2>Three Ways to Engage.</h2>
          </div>
          <div className="types">
            {ENGAGEMENTS.map((e) => (
              <div className="type-card" key={e.title}>
                <h3>{e.title}</h3>
                <p>{e.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">SERVICES BY DISCIPLINE</p>
            <h2>What the Firm Builds.</h2>
          </div>
          <div className="disciplines">
            {SERVICES.map((s, i) => (
              <div className="discipline service-row" key={s.title}>
                <span className="tag">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.lede}</p>
                </div>
                <ul className="service-list">
                  {s.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="on-ink-2">
        <div className="wrap cta-band">
          <div>
            <p className="eyebrow">NOT SURE WHERE TO START?</p>
            <h2>Start With a Conversation.</h2>
            <p>Tell the firm where the business stands today. You&rsquo;ll leave with a clear first step.</p>
          </div>
          <div className="cta-actions">
            <Link className="btn-solid" href="/consultation">Book a Consultation</Link>
            <Link className="arrow-link" href="/what-we-do">The Six Disciplines <ArrowRing /></Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
