import Link from "next/link";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Posts" };

export default async function AdminPosts() {
  const [posts, active] = await Promise.all([
    prisma.post.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.subscriber.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">THE MASTERMIND MINUTES</p>
          <h1>Posts</h1>
          <p className="admin-sub">
            {active} active subscriber{active === 1 ? "" : "s"} &middot; <Link href="/admin/subscribers">manage</Link>
          </p>
        </div>
        <Link className="btn-solid" href="/admin/posts/new">New post</Link>
      </div>

      {posts.length === 0 ? (
        <p className="admin-empty">No posts yet. Start with &ldquo;New post&rdquo;.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Status</th><th>Emailed</th><th>Updated</th></tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/posts/${p.id}`}>{p.title}</Link></td>
                <td>
                  <span className={`pill ${p.publishedAt ? "pill-live" : ""}`}>{p.publishedAt ? "Published" : "Draft"}</span>
                </td>
                <td>{p.sentAt ? `${p.sentCount} · ${formatDate(p.sentAt)}` : "—"}</td>
                <td>{formatDate(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
