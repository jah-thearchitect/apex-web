import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/session";
import { LogoMark } from "@/components/LogoMark";

export default async function AdminDash({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="admin-bar">
        <div className="wrap admin-bar-row">
          <Link className="brand" href="/admin">
            <span className="brand-box">Apex</span>
            <LogoMark width={40} />
            <span className="brand-sub">ADMIN</span>
          </Link>
          <nav className="admin-nav">
            <Link href="/admin">Overview</Link>
            <Link href="/admin/clients">Clients</Link>
            <Link href="/admin/quotes">Quotes</Link>
            <Link href="/admin/invoices">Invoices</Link>
            <Link href="/admin/bookings">Bookings</Link>
            <span className="admin-nav-sep" aria-hidden="true" />
            <Link href="/admin/posts">Posts</Link>
            <Link href="/admin/contacts">Contacts</Link>
            <Link href="/admin/subscribers">Subscribers</Link>
            <Link href="/admin/settings">Settings</Link>
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
