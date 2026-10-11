import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { unsubscribeByToken } from "@/lib/unsubscribe";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

// Opening the link only shows a button. Mail scanners follow links in
// emails automatically, so a plain GET must never unsubscribe anyone.
async function confirmUnsubscribe(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const { redirect } = await import("next/navigation");
  const email = token ? await unsubscribeByToken(token) : null;
  redirect(email ? "/unsubscribe?done=1" : "/unsubscribe?invalid=1");
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; invalid?: string }>;
}) {
  const { token, done, invalid } = await searchParams;

  return (
    <PageShell>
      <section className="page-hero">
        <div className="wrap">
          <p className="eyebrow">THE MASTERMIND MINUTES</p>
          {done ? (
            <>
              <h1>You&rsquo;re unsubscribed.</h1>
              <p>You won&rsquo;t get any more Minutes. If that was a mistake, you can join again from the home page anytime.</p>
            </>
          ) : invalid || !token ? (
            <>
              <h1>That link didn&rsquo;t work.</h1>
              <p>Use the unsubscribe link at the bottom of any Minutes email.</p>
            </>
          ) : (
            <>
              <h1>Unsubscribe from the Minutes?</h1>
              <p>You&rsquo;ll stop getting new posts by email. Posts stay readable on the site.</p>
              <form action={confirmUnsubscribe} style={{ marginTop: 28 }}>
                <input type="hidden" name="token" value={token} />
                <button type="submit" className="btn-solid">Unsubscribe</button>
              </form>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
