import Link from "next/link";
import { notFound } from "next/navigation";
import { AskClientForm } from "@/components/admin/AskClientForm";
import { RequestStatusPicker } from "@/components/admin/RequestButtons";
import { RequestThread } from "@/components/RequestThread";
import { invoiceDisplayStatus } from "@/lib/billing";
import type { FileRef } from "@/lib/briefQuestions";
import { formatMoney, subtotal } from "@/lib/money";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Update request" };

const fileHref = (path: string) => `/api/admin/file/${path.split("/").map(encodeURIComponent).join("/")}`;

export default async function UpdateRequestView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await prisma.changeRequest.findUnique({
    where: { id },
    include: { client: true, invoice: { include: { items: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!r) notFound();
  const files = (Array.isArray(r.files) ? r.files : []) as FileRef[];

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin/requests" className="admin-back">&larr; All requests</Link>
          <h1>{r.kind}</h1>
          <p className="admin-sub">
            <Link href={`/admin/clients/${r.clientId}`}>{r.client.businessName}</Link> &middot; {r.name} &middot;{" "}
            <a href={`mailto:${r.email}`}>{r.email}</a> &middot; {formatDate(r.createdAt)}
          </p>
        </div>
        <div className="editor-actions">
          {r.invoice ? (
            <Link className="btn-ghost" href={`/admin/invoices/${r.invoice.id}`}>
              {r.invoice.number} &middot; {formatMoney(subtotal(r.invoice.items))} &middot; {invoiceDisplayStatus(r.invoice)}
            </Link>
          ) : (
            <Link className="btn-solid" href={`/admin/invoices/new?request=${r.id}`}>Create invoice</Link>
          )}
        </div>
      </div>

      <RequestStatusPicker key={r.status} id={r.id} status={r.status} />

      <div className="brief-view">
        <section>
          <dl>
            <dt>Build</dt><dd>{r.build}</dd>
            <dt>How soon</dt><dd><span className={`pill ${r.urgency.startsWith("Urgent") ? "req-urgent" : ""}`}>{r.urgency}</span></dd>
            <dt>What needs to change</dt><dd>{r.details}</dd>
            <dt>Where</dt>
            {r.location ? (
              <dd>{/^https?:\/\/\S+$/.test(r.location) ? <a href={r.location} target="_blank" rel="noopener noreferrer">{r.location}</a> : r.location}</dd>
            ) : <dd className="empty">—</dd>}
            <dt>Files</dt>
            {files.length ? (
              <dd>{files.map((f, i) => <span key={f.path}>{i > 0 && <br />}<a href={fileHref(f.path)} target="_blank" rel="noopener">{f.name}</a></span>)}</dd>
            ) : <dd className="empty">—</dd>}
            {r.completedAt && <><dt>Completed</dt><dd>{formatDate(r.completedAt)}</dd></>}
          </dl>
        </section>
        <section>
          <h2>Follow-up</h2>
          <RequestThread messages={r.messages} clientName={r.name} fileHref={fileHref} />
          <AskClientForm requestId={r.id} email={r.email} />
        </section>
      </div>
    </>
  );
}
