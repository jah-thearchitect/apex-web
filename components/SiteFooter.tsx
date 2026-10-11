import Link from "next/link";
import { SITE_NAME, TAGLINE } from "@/lib/site";
import { LogoMark } from "@/components/LogoMark";

export function SiteFooter() {
  return (
    <footer>
      <div className="wrap foot-grid">
        <div>
          <Link className="brand" href="/" aria-label="Apex Capital Consultants, home">
            <span className="brand-box">Apex</span>
            <LogoMark width={46} />
          </Link>
          <p className="foot-tagline">{TAGLINE}</p>
        </div>
        <div className="foot-col">
          <h4>What We Do</h4>
          <ul>
            <li><Link href="/what-we-do">The Six Disciplines</Link></li>
            <li><Link href="/what-we-do#how-we-work">How We Work</Link></li>
            <li><Link href="/minutes">The Mastermind Minutes</Link></li>
          </ul>
        </div>
        <div className="foot-col">
          <h4>Firm</h4>
          <ul>
            <li><Link href="/firm">The Firm</Link></li>
            <li><Link href="/clients">Clients</Link></li>
            <li><Link href="/consultation">Consultation</Link></li>
            <li><Link href="/consultation#inquiry">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="wrap foot-bottom">
        <span>&copy; {new Date().getFullYear()} {SITE_NAME}</span>
        <span className="foot-legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/admin" rel="nofollow">Admin</Link>
        </span>
      </div>
    </footer>
  );
}
