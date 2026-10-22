import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { RequestReplyForm } from "@/components/RequestReplyForm";
import { RequestThread } from "@/components/RequestThread";
import { CLIENT_STATUS } from "@/lib/briefQuestions";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your update request", robots: { index: false, follow: false } };

export default async function RequestThreadPage({ params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const r = await prisma.changeRequest.findFirst({
    where: { id, client: { requestToken: token } },
    include: { client: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!r) notFound();

  return (
    <PageShell>
      <section className="brief-wrap">
        <div className="brief update">
          <div className="brief-head">
            <div className="req-nav">
              <Link href={`/update/${token}`} className="admin-back">&larr; All your requests</Link>
              <Link href={`/update/${token}#new`} className="btn-ghost">+ Send a new request</Link>
            </div>
            <p className="eyebrow" style={{ marginTop: 18 }}>UPDATE REQUEST &middot; {r.client.businessName.toUpperCase()}</p>
            <h1>{r.kind}</h1>
            <p className="brief-lede">
              Sent {formatDate(r.createdAt)} &middot; <span className="pill">{CLIENT_STATUS[r.status]}</span>
            </p>
          </div>

          <div className="brief-panel request-summary">
            <p className="thread-meta">Your request</p>
            <p className="thread-body">{r.details}</p>
            {r.location && <p className="thread-files">Where: {r.location}</p>}
          </div>

          <RequestThread messages={r.messages} clientName="You" />
          <RequestReplyForm token={token} requestId={r.id} />
          <p className="update-aside">
            Something different you need done? <Link href={`/update/${token}#new`}>Send a new request</Link>; you can have more than one open at a time.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
