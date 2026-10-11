import Image from "next/image";
import Link from "next/link";
import { ArrowRing } from "@/components/ArrowRing";
import { NewsletterForm } from "@/components/NewsletterForm";
import { NewsletterModal } from "@/components/NewsletterModal";
import { PageShell } from "@/components/PageShell";

const TEASERS = [
  { href: "/firm", img: "/images/firm-blueprint.webp", tag: "The Firm", title: "Who We Are", body: "How Apex operates, and the standard every build is held to." },
  { href: "/what-we-do", img: "/images/line-platforms.webp", tag: "What We Do", title: "Six Disciplines", body: "Platforms, marketing, AI, funding, and everything between — start wherever you are." },
  { href: "/clients", img: "/images/clients-skyline.webp", tag: "Clients", title: "Real Businesses, Real Builds", body: "Any sector, any stage — built for owners serious about expanding." },
];

export default function Home() {
  return (
    <>
      <PageShell showHome={false}>
        <section className="hero hero-has-img">
          <Image src="/images/hero-peak.webp" alt="" fill priority sizes="100vw" className="hero-img" />
          <div className="hero-shade" aria-hidden="true" />
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
                  <Image src={t.img} alt="" width={640} height={360} sizes="(max-width: 900px) 100vw, 400px" className="teaser-img" />
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
                <NewsletterForm buttonLabel="Join the Minutes" source="home" />
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
