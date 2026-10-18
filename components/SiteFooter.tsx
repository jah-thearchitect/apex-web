import Link from "next/link";
import { SITE_NAME, SOCIAL, TAGLINE } from "@/lib/site";
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
          <a className="foot-social" href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" aria-label="Apex Capital Consultants on Facebook">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21h2.9z" />
            </svg>
            <span>Follow on Facebook</span>
          </a>
        </div>
        <div className="foot-col">
          <h4>What We Do</h4>
          <ul>
            <li><Link href="/what-we-do">The Six Disciplines</Link></li>
            <li><Link href="/what-we-do#how-we-work">How We Work</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/minutes">The Mastermind Minutes</Link></li>
          </ul>
        </div>
        <div className="foot-col">
          <h4>Firm</h4>
          <ul>
            <li><Link href="/firm">The Firm</Link></li>
            <li><Link href="/clients">Clients &amp; Builds</Link></li>
            <li><Link href="/consultation">Consultation</Link></li>
            <li><Link href="/consultation#inquiry">Contact</Link></li>
            <li><Link href="/update">Client Updates</Link></li>
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
