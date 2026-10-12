import { deleteCatalogItem, saveCatalogItem, saveSettings } from "@/app/admin/billing-actions";
import { getSettings } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [s, catalog, sp] = await Promise.all([
    getSettings(),
    prisma.catalogItem.findMany({ orderBy: { name: "asc" } }),
    searchParams,
  ]);
  const stripe = stripeConfigured();
  const webhook = !!process.env.STRIPE_WEBHOOK_SECRET;
  const f = (name: keyof typeof s, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      <span>{label}</span>
      <input name={name} defaultValue={String(s[name] ?? "")} {...props} />
    </label>
  );

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">CLIENT PORTAL</p>
          <h1>Settings</h1>
          <p className="admin-sub">Printed on every quote and invoice.</p>
        </div>
      </div>
      {sp.saved && <p className="editor-status">Saved.</p>}

      <form action={saveSettings} className="editor-fields">
        <h2 className="admin-h2">Business details</h2>
        <div className="field-grid">
          {f("legalName", "Legal business name", { required: true, maxLength: 160 })}
          {f("billingEmail", "Billing email (shown on documents)", { type: "email", maxLength: 254 })}
          {f("phone", "Phone (optional)", { maxLength: 40 })}
        </div>
        <div className="field-grid">
          {f("addressLine1", "Mailing address", { maxLength: 160 })}
          {f("addressLine2", "Address line 2", { maxLength: 160 })}
          {f("city", "City", { maxLength: 80 })}
          <div className="field-grid tight">
            {f("state", "State", { maxLength: 40 })}
            {f("postalCode", "ZIP", { maxLength: 20 })}
          </div>
        </div>

        <h2 className="admin-h2">Defaults</h2>
        <div className="field-grid">
          {f("paymentTermsDays", "Invoice due after (days)", { type: "number", min: 0, max: 120 })}
          {f("depositPercent", "Deposit to start a build (%)", { type: "number", min: 0, max: 100 })}
          {f("quoteValidDays", "Quotes valid for (days)", { type: "number", min: 1, max: 365 })}
        </div>
        <label className="field">
          <span>Invoice footer <small>default note at the bottom of invoices</small></span>
          <textarea name="invoiceFooter" rows={2} defaultValue={s.invoiceFooter} maxLength={1000} />
        </label>
        <label className="field">
          <span>Standard quote terms <small>pre-filled on new quotes; editable per quote</small></span>
          <textarea name="quoteTerms" rows={6} defaultValue={s.quoteTerms} maxLength={10000} placeholder="Payment schedule, revision rounds, timelines, ownership of work, cancellation…" />
        </label>
        <div className="editor-actions"><button type="submit" className="btn-solid">Save settings</button></div>
      </form>

      <h2 className="admin-h2" style={{ marginTop: 48 }}>Saved line items</h2>
      <p className="admin-sub" style={{ marginBottom: 16 }}>Reusable services (e.g. &ldquo;Monthly Partnership&rdquo;) you can drop into any quote or invoice.</p>
      {catalog.length > 0 && (
        <table className="admin-table" style={{ marginBottom: 20 }}>
          <tbody>
            {catalog.map((c) => (
              <tr key={c.id}>
                <td>{c.name}{c.details && <><br /><small>{c.details}</small></>}</td>
                <td>{formatMoney(c.unitCents)}</td>
                <td style={{ textAlign: "right" }}>
                  <form action={deleteCatalogItem.bind(null, c.id)}><button className="btn-ghost danger" type="submit">Remove</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form action={saveCatalogItem} className="field-grid catalog-form">
        <label className="field"><span>Name</span><input name="name" required maxLength={200} placeholder="Monthly Partnership" /></label>
        <label className="field"><span>Price ($)</span><input name="price" required inputMode="decimal" placeholder="1750.00" /></label>
        <label className="field"><span>Details (optional)</span><input name="details" maxLength={2000} placeholder="Marketing, platform upkeep, AI systems, monthly report" /></label>
        <div className="editor-actions" style={{ alignSelf: "end" }}><button className="btn-ghost" type="submit">Add item</button></div>
      </form>

      <h2 className="admin-h2" style={{ marginTop: 48 }}>Online payments (Stripe)</h2>
      <ul className="check-list">
        <li className={stripe ? "ok" : ""}>{stripe ? "Secret key connected" : "Add STRIPE_SECRET_KEY in Vercel → Settings → Environment Variables"}</li>
        <li className={webhook ? "ok" : ""}>
          {webhook ? "Webhook connected" : <>In Stripe → Developers → Webhooks, add the endpoint <code>{SITE_URL}/api/stripe/webhook</code> with the events <code>checkout.session.completed</code> and <code>checkout.session.async_payment_succeeded</code>, then add its signing secret as STRIPE_WEBHOOK_SECRET in Vercel</>}
        </li>
      </ul>
    </>
  );
}
