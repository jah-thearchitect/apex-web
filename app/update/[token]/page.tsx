import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { UpdateRequestForm } from "@/components/UpdateRequestForm";
import { CLIENT_STATUS } from "@/lib/briefQuestions";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Request an update", robots: { index: false, follow: false } };

export default async function UpdateRequestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await prisma.client.findUnique({
    where: { requestToken: token },
    include: { changeRequests: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!c) notFound();

  return (
    <PageShell>
      <section className="brief-wrap">
        <div className="brief update">
          <div className="brief-head">
            <p className="eyebrow">UPDATE REQUEST &middot; {c.businessName.toUpperCase()}</p>
            <h1>What do you need changed?</h1>
            <p className="brief-lede">
              Tell us what to update and it comes straight to Apex. This link is yours to keep, so bookmark it for next time.
            </p>
          </div>
          {c.changeRequests.length > 0 && (
            <div className="request-list">
              <p className="thread-meta">Your requests</p>
              <ul>
                {c.changeRequests.map((r) => (
                  <li key={r.id}>
                    <Link href={`/update/${token}/r/${r.id}`}>{r.kind}</Link>
                    <small>{formatDate(r.createdAt)}</small>
                    <span className={`pill${r.status === "WAITING" ? " req-urgent" : ""}`}>{CLIENT_STATUS[r.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <UpdateRequestForm token={token} businessName={c.businessName} defaultName={c.contactName} defaultEmail={c.email} />
        </div>
      </section>
    </PageShell>
  );
}
