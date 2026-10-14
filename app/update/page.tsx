import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { UpdateLookupForm } from "@/components/UpdateLookupForm";

export const metadata: Metadata = {
  title: "Client Updates",
  description: "Existing Apex clients can request changes and updates to their builds.",
};

export default function ClientUpdatesPage() {
  return (
    <PageShell>
      <section className="brief-wrap">
        <div className="inquiry-panel">
          <p className="eyebrow">CLIENT UPDATES</p>
          <h3>Need a change on your build?</h3>
          <p>
            Apex clients can request updates anytime: new text or photos, a new page or feature, or a fix. Enter the email Apex has on file and
            we&rsquo;ll send your private update link.
          </p>
          <UpdateLookupForm />
          <p className="update-aside">
            Not a client yet? <Link href="/consultation">Book a consultation</Link>.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
