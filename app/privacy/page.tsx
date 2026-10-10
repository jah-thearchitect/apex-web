import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = { title: "Privacy", robots: { index: false } };

// Interim text only. Per the handoff, the full policy is written once the
// email list provider and form backend are final, so it describes what the
// site actually collects. Keep this page accurate to the code until then.
export default function PrivacyPage() {
  return (
    <PageShell>
      <section className="page-hero">
        <div className="wrap">
          <p className="eyebrow">PRIVACY</p>
          <h1>Privacy Policy</h1>
        </div>
      </section>
      <section style={{ paddingTop: 0 }}>
        <div className="wrap legal">
          <p className="notice">The full privacy policy is being finalized. Here is what this site collects today.</p>
          <h2>Inquiry form</h2>
          <p>
            When you send an inquiry from the Consultation page, the name, email address, and message you enter are emailed to the firm so we can follow up. They are delivered through our email provider, Resend, and are not stored in a database on this site.
          </p>
          <h2>Newsletter signup</h2>
          <p>
            The Mastermind Minutes signup is not yet connected to an email service. Email addresses entered there are not sent or stored anywhere. Your browser remembers that you signed up or dismissed the prompt so it isn&rsquo;t shown again.
          </p>
          <h2>Analytics</h2>
          <p>
            We use Vercel Web Analytics to count page views. It does not use cookies and does not identify individual visitors.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
