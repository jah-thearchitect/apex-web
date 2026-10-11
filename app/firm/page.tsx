import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { PhotoHero } from "@/components/SiteImages";

export const metadata: Metadata = {
  title: "The Firm",
  description: "Apex is a brand management firm built to help businesses build, expand, and make money — platforms, AI, marketing, and capital under one accountable team.",
};

export default function FirmPage() {
  return (
    <PageShell>
      <PhotoHero src="/images/firm-blueprint.webp" position="right center">
          <p className="eyebrow">THE FIRM</p>
          <h1>Built to help businesses build, expand, and make money.</h1>
      </PhotoHero>

      <section>
        <div className="wrap about">
          <div>
            <p>
              Apex exists for one reason: to help businesses build, expand, and reach the next level &mdash; and make money doing it. If a business can imagine it, the firm can build it: platforms, AI systems, marketing, and the capital to fund it all, under one accountable team instead of five disconnected vendors.
            </p>
            <p>
              We are a brand management firm. We build and integrate the AI, platforms, marketing, and capital a business needs to start, expand, and make money &mdash; no matter the sector.
            </p>
          </div>
          <div>
            <p className="about-quote">
              &ldquo;Every build is held to one standard: it has to be a genuinely good experience for whoever touches it &mdash; the business owner, their customer, or the software doing the work.&rdquo;
            </p>
          </div>
        </div>
      </section>

      <section className="on-ink-2">
        <div className="wrap">
          <p className="statement">We work quietly in the background&nbsp;<em>&mdash; so your brand is what clients see out front.</em></p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <p className="statement">
            We don&rsquo;t just build websites. We engineer <em>enterprise-level platforms</em> that elevate how a business looks, operates, and grows.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
