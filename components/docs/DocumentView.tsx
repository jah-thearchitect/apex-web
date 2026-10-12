import type { BusinessSettings } from "@/generated/prisma/client";
import { LogoMark } from "@/components/LogoMark";
import { formatMoney, lineTotal, subtotal } from "@/lib/money";
import { formatDate } from "@/lib/posts";

type Item = { id: string; description: string; details: string; quantity: number; unitCents: number };
type ClientInfo = {
  businessName: string; contactName: string; email: string;
  addressLine1: string | null; addressLine2: string | null; city: string | null; state: string | null; postalCode: string | null;
};

// The printed look shared by quotes and invoices: light paper, black + gold
// mark, firm details top-left, bill-to and dates below, items table, totals.
export function DocumentView({
  kind, number, title, settings, client, items, meta, status, intro, children, footerNote, extraTotals,
}: {
  kind: "Quote" | "Invoice";
  number: string;
  title: string;
  settings: BusinessSettings;
  client: ClientInfo;
  items: Item[];
  meta: { label: string; value: string }[];
  status?: { label: string; tone: "paid" | "due" | "neutral" | "void" };
  intro?: string;
  footerNote?: string;
  extraTotals?: { label: string; cents: number; strong?: boolean }[];
  children?: React.ReactNode;
}) {
  const total = subtotal(items);
  const firmAddress = [
    settings.addressLine1, settings.addressLine2,
    [settings.city, settings.state].filter(Boolean).join(", ") + (settings.postalCode ? ` ${settings.postalCode}` : ""),
  ].filter((l) => l && l.trim());
  const clientAddress = [
    client.addressLine1, client.addressLine2,
    [client.city, client.state].filter(Boolean).join(", ") + (client.postalCode ? ` ${client.postalCode}` : ""),
  ].filter((l) => l && l.trim());

  return (
    <article className="doc">
      <header className="doc-head">
        <div className="doc-brand">
          <span className="doc-brand-box">Apex</span>
          <LogoMark tone="light" width={52} />
        </div>
        <div className="doc-title">
          <p className="doc-kind">{kind}</p>
          <p className="doc-number">{number}</p>
          {status && <span className={`doc-status doc-status-${status.tone}`}>{status.label}</span>}
        </div>
      </header>

      <div className="doc-parties">
        <div>
          <p className="doc-label">From</p>
          <p className="doc-strong">{settings.legalName}</p>
          {firmAddress.map((l) => <p key={l}>{l}</p>)}
          {settings.billingEmail && <p>{settings.billingEmail}</p>}
          {settings.phone && <p>{settings.phone}</p>}
        </div>
        <div>
          <p className="doc-label">{kind === "Quote" ? "Prepared for" : "Bill to"}</p>
          <p className="doc-strong">{client.businessName}</p>
          {client.contactName !== client.businessName && <p>{client.contactName}</p>}
          {clientAddress.map((l) => <p key={l}>{l}</p>)}
          <p>{client.email}</p>
        </div>
        <dl className="doc-meta">
          {meta.map((m) => (
            <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>
          ))}
        </dl>
      </div>

      <h1 className="doc-heading">{title}</h1>
      {intro && <p className="doc-intro">{intro}</p>}

      <table className="doc-items">
        <thead>
          <tr><th>Description</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>
                <span className="doc-item-name">{i.description}</span>
                {i.details && <span className="doc-item-details">{i.details}</span>}
              </td>
              <td className="num">{i.quantity}</td>
              <td className="num">{formatMoney(i.unitCents)}</td>
              <td className="num">{formatMoney(lineTotal(i))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="doc-totals">
        <div className="doc-total-row doc-total-main"><span>Total</span><span>{formatMoney(total)}</span></div>
        {extraTotals?.map((t) => (
          <div key={t.label} className={`doc-total-row${t.strong ? " doc-total-main" : ""}`}><span>{t.label}</span><span>{formatMoney(t.cents)}</span></div>
        ))}
      </div>

      {children}

      {footerNote && <p className="doc-footer-note">{footerNote}</p>}
      <p className="doc-generated">{settings.legalName} &middot; {kind} {number} &middot; {formatDate(new Date())}</p>
    </article>
  );
}
