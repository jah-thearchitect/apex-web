import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink, RequestAction } from "@/components/admin/RequestButtons";
import { PrintButton } from "@/components/docs/DocButtons";
import { answerText, visibleQuestions, visibleSections, type Answers, type FileRef } from "@/lib/briefQuestions";
import { briefUrl } from "@/lib/briefs";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Build brief" };

const STATUS: Record<string, string> = { SENT: "Sent, not started", STARTED: "In progress", SUBMITTED: "Submitted" };

const fileHref = (path: string) => `/api/admin/file/${path.split("/").map(encodeURIComponent).join("/")}`;
const isLink = (s: string) => /^https?:\/\/\S+$/.test(s.trim());

export default async function BriefView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.buildBrief.findUnique({ where: { id }, include: { client: true, invoice: true } });
  if (!b) notFound();
  const a = (b.answers ?? {}) as Answers;

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin/requests" className="admin-back">&larr; All requests</Link>
          <h1>Build brief: {b.client.businessName}</h1>
          <p className="admin-sub">
            <span className={`pill ${b.status === "SUBMITTED" ? "pill-live" : ""}`}>{STATUS[b.status]}</span>
            {b.submittedAt && <> &middot; Submitted {formatDate(b.submittedAt)}</>}
            {b.invoice && <> &middot; After deposit <Link href={`/admin/invoices/${b.invoice.id}`}>{b.invoice.number}</Link></>}
            {" "}&middot; <Link href={`/admin/clients/${b.clientId}`}>Client page</Link>
          </p>
        </div>
        <div className="editor-actions">
          <PrintButton />
          {b.status === "SUBMITTED" ? (
            <RequestAction action="reopenBrief" id={b.id} label="Reopen for edits" confirm="Reopen this brief so the client can change their answers?" />
          ) : (
            <RequestAction action="sendBrief" id={b.clientId} label="Resend link" />
          )}
        </div>
      </div>

      {b.status !== "SUBMITTED" && (
        <p className="admin-sub" style={{ marginBottom: 8 }}>
          Showing answers saved so far. Client link: <CopyLink url={briefUrl(b.token)} />
        </p>
      )}

      <div className="brief-view">
        {visibleSections(a).map((s) => (
          <section key={s.id}>
            <h2>{s.title}</h2>
            <dl>
              {visibleQuestions(s, a).map((q) => {
                const files = q.type === "files" && Array.isArray(a[q.id]) ? (a[q.id] as FileRef[]) : null;
                const text = answerText(q, a);
                return (
                  <div key={q.id} style={{ display: "contents" }}>
                    <dt>{q.label}</dt>
                    {files ? (
                      files.length ? (
                        <dd>
                          {files.map((f, i) => (
                            <span key={f.path}>{i > 0 && <br />}<a href={fileHref(f.path)} target="_blank" rel="noopener">{f.name}</a></span>
                          ))}
                        </dd>
                      ) : <dd className="empty">—</dd>
                    ) : text ? (
                      <dd>{isLink(text) ? <a href={text} target="_blank" rel="noopener noreferrer">{text}</a> : text}</dd>
                    ) : (
                      <dd className="empty">—</dd>
                    )}
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
