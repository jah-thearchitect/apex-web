import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/posts";
import { createClientFromContact } from "@/app/admin/billing-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact" };

export default async function ContactDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { inquiries: { orderBy: { createdAt: "desc" } }, client: { select: { id: true } } },
  });
  if (!contact) notFound();
  const sub = await prisma.subscriber.findUnique({ where: { email: contact.email } });
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email;

  return (
    <>
      <div className="admin-head">
        <div>
          <Link href="/admin/contacts" className="admin-back">&larr; All contacts</Link>
          <h1>{name}</h1>
          <p className="admin-sub">
            <a href={`mailto:${contact.email}`}>{contact.email}</a> &middot; first seen {formatDate(contact.createdAt)}
            {sub && <> &middot; Minutes: {sub.status === "ACTIVE" ? "subscribed" : "unsubscribed"}</>}
          </p>
        </div>
        {contact.client ? (
          <Link className="btn-ghost" href={`/admin/clients/${contact.client.id}`}>View client</Link>
        ) : (
          <form action={createClientFromContact.bind(null, contact.id)}>
            <button type="submit" className="btn-solid">Make client</button>
          </form>
        )}
      </div>

      <h2 className="admin-h2">Inquiries</h2>
      {contact.inquiries.length === 0 ? (
        <p className="admin-empty">No inquiries from this contact.</p>
      ) : (
        <div className="inquiry-list">
          {contact.inquiries.map((q) => (
            <article key={q.id} className="inquiry-item">
              <p className="pill">{formatDate(q.createdAt)}</p>
              <p className="inquiry-body">{q.details}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
