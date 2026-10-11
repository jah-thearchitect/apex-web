import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/session";

export default async function AdminDash({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="admin-bar">
        <div className="wrap admin-bar-row">
          <Link className="brand" href="/admin">
            <span className="brand-box">Apex</span>
            <span className="brand-sub">ADMIN</span>
          </Link>
          <nav className="admin-nav">
            <Link href="/admin">Posts</Link>
            <Link href="/admin/subscribers">Subscribers</Link>
            <Link href="/" target="_blank">View site</Link>
            <form action={logout}>
              <button type="submit">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="wrap admin-main">{children}</main>
    </>
  );
}
