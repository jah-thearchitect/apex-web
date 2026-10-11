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
          <h2>The Mastermind Minutes</h2>
          <p>
            When you join the Mastermind Minutes, we store your email address, the date you joined, and which signup form you used. We use it only to email you new Minutes posts, sent through Resend. We don&rsquo;t sell or share the list.
          </p>
          <p>
            Every email has an unsubscribe link. Unsubscribing stops all further emails right away; we keep a record that you unsubscribed so you aren&rsquo;t added back by mistake. Your browser also remembers that you signed up or dismissed the signup prompt, so it isn&rsquo;t shown again.
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
