import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Consultation",
  description: "Start with a conversation. Tell Apex where your business stands today and what you want built.",
};

export default function ConsultationPage() {
  return (
    <PageShell>
      <section className="page-hero" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <p className="eyebrow">CONSULTATION</p>
          <h1>Start With a Conversation.</h1>
          <p>Tell us where your business stands today, and which discipline you need first.</p>
        </div>
      </section>

      {/* Scheduling: the Google Calendar Appointment Schedules link goes here
          once the owner sends it. Until then the CTA points at the inquiry form. */}
      <section>
        <div className="wrap">
          <div className="consult-panel">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.4" stroke="currentColor" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="1" />
              <path d="M3 9h18M8 3v4M16 3v4" />
            </svg>
            <span className="tag">Scheduling opens soon</span>
            <p>A live calendar is being connected here. In the meantime, tell us what you want built below and the firm will follow up to set a time.</p>
            <a className="btn-solid" href="#inquiry">Tell Us What You Want Built</a>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="inquiry-panel" id="inquiry">
            <p className="eyebrow">INQUIRY</p>
            <h3>Describe what you want built.</h3>
            <p>
              Give us the short version &mdash; what the business does, what you want built or fixed, and anything you&rsquo;ve already tried. The firm will follow up directly.
            </p>
            <InquiryForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
