import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Terms", robots: { index: false } };

export default function TermsPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="wrap">
          <p className="eyebrow">TERMS</p>
          <h1>Terms of Use</h1>
        </div>
      </section>
      <section style={{ paddingTop: 0 }}>
        <div className="wrap legal">
          <p className="notice">The full terms of use are being finalized.</p>
          <p>
            This site is provided by {SITE_NAME} for general information about the firm and its services. Nothing on it is an offer of financing, legal advice, or a binding agreement. Any engagement with the firm is governed by a separate written agreement.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
