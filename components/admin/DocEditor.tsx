"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  duplicateInvoice, recordManualPayment, saveInvoice, saveQuote, sendInvoice, sendQuote, voidInvoice,
} from "@/app/admin/billing-actions";
import { depositCents, formatMoney, lineTotal, parseDollars, subtotal } from "@/lib/money";

type Row = { key: number; description: string; details: string; quantity: string; price: string };
type Catalog = { id: string; name: string; details: string; unitCents: number };
type ClientOpt = { id: string; businessName: string; email: string };

export type DocEditorProps = {
  type: "quote" | "invoice";
  clients: ClientOpt[];
  catalog: Catalog[];
  defaults: { clientId: string; depositPercent: number; validUntil: string; dueDate: string; issueDate: string; terms: string; notes: string };
  doc?: {
    id: string;
    number: string;
    token: string;
    status: string;
    displayStatus: string;
    clientId: string;
    title: string;
    intro?: string;
    terms?: string;
    notes?: string;
    validUntil?: string;
    depositPercent?: number;
    kind?: "STANDARD" | "DEPOSIT" | "RETAINER";
    issueDate?: string;
    dueDate?: string;
    sentAt: string | null;
    locked: boolean;
    items: { description: string; details: string; quantity: number; unitCents: number }[];
    relatedLinks?: { label: string; href: string }[];
  };
};

let nextKey = 1;
const toRow = (i: { description: string; details: string; quantity: number; unitCents: number }): Row => ({
  key: nextKey++, description: i.description, details: i.details, quantity: String(i.quantity), price: (i.unitCents / 100).toFixed(2),
});
const blankRow = (): Row => ({ key: nextKey++, description: "", details: "", quantity: "1", price: "" });

export function DocEditor({ type, clients, catalog, defaults, doc }: DocEditorProps) {
  const router = useRouter();
  const isQuote = type === "quote";
  const [clientId, setClientId] = useState(doc?.clientId ?? defaults.clientId);
  const [title, setTitle] = useState(doc?.title ?? "");
  const [intro, setIntro] = useState(doc?.intro ?? "");
  const [terms, setTerms] = useState(doc?.terms ?? defaults.terms);
  const [notes, setNotes] = useState(doc?.notes ?? defaults.notes);
  const [validUntil, setValidUntil] = useState(doc?.validUntil ?? defaults.validUntil);
  const [depositPercent, setDepositPercent] = useState(String(doc?.depositPercent ?? defaults.depositPercent));
  const [kind, setKind] = useState(doc?.kind ?? "STANDARD");
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? defaults.issueDate);
  const [dueDate, setDueDate] = useState(doc?.dueDate ?? defaults.dueDate);
  const [rows, setRows] = useState<Row[]>(doc?.items.length ? doc.items.map(toRow) : [blankRow()]);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  const locked = !!doc?.locked;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const parsed = rows.map((r) => ({ quantity: Math.max(1, Math.round(Number(r.quantity) || 1)), unitCents: parseDollars(r.price) ?? 0 }));
  const total = subtotal(parsed);

  function touch<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); };
  }
  function updateRow(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirty(true);
  }
  function addCatalog(id: string) {
    const c = catalog.find((x) => x.id === id);
    if (!c) return;
    setRows((rs) => [...rs.filter((r) => r.description || r.price), toRow({ description: c.name, details: c.details, quantity: 1, unitCents: c.unitCents })]);
    setDirty(true);
  }

  async function save(): Promise<{ id: string } | null> {
    const items = rows.map((r) => ({ description: r.description, details: r.details, quantity: Number(r.quantity) || 1, unitCents: parseDollars(r.price) ?? NaN }));
    const bad = items.find((i) => i.description.trim() && !Number.isFinite(i.unitCents));
    if (bad) { setStatus(`Check the price on "${bad.description}".`); return null; }
    const res = isQuote
      ? await saveQuote({ id: doc?.id, clientId, title, intro, terms, validUntil: validUntil || null, depositPercent: Number(depositPercent) || 0, items })
      : await saveInvoice({ id: doc?.id, clientId, title, notes, kind, issueDate, dueDate, items });
    if (!res.ok) { setStatus(res.error); return null; }
    setDirty(false);
    if (!doc) router.replace(`/admin/${isQuote ? "quotes" : "invoices"}/${res.id}`);
    else router.refresh();
    return { id: res.id };
  }

  const run = (fn: () => Promise<void>) => start(async () => { setStatus(""); await fn(); });
  const onSave = () => run(async () => { if (await save()) setStatus("Saved."); });
  const onSend = () => {
    const client = clients.find((c) => c.id === clientId);
    if (!window.confirm(`Email this ${type} to ${client?.email ?? "the client"}?`)) return;
    run(async () => {
      const saved = await save();
      if (!saved) return;
      const res = isQuote ? await sendQuote(saved.id) : await sendInvoice(saved.id);
      setStatus(res.ok ? `Sent to ${client?.email}.` : res.error);
      router.refresh();
    });
  };
  const onPaid = () => {
    const method = window.prompt("How was it paid? (check, cash, bank transfer, Zelle…)", "check");
    if (method === null || !doc) return;
    run(async () => { const r = await recordManualPayment(doc.id, method); setStatus(r.ok ? "Marked paid." : r.error); router.refresh(); });
  };
  const onVoid = () => {
    if (!doc || !window.confirm("Void this invoice? The client's link will show it as void.")) return;
    run(async () => { const r = await voidInvoice(doc.id); setStatus(r.ok ? "Voided." : r.error); router.refresh(); });
  };

  const publicHref = doc ? `/${isQuote ? "q" : "i"}/${doc.token}` : null;

  return (
    <div className="post-editor">
      <div className="admin-head">
        <div>
          <Link href={`/admin/${isQuote ? "quotes" : "invoices"}`} className="admin-back">&larr; All {isQuote ? "quotes" : "invoices"}</Link>
          <h1>{doc ? `${isQuote ? "Quote" : "Invoice"} ${doc.number}` : `New ${type}`}</h1>
          <p className="admin-sub">
            {doc && <span className={`pill ${["Paid", "Accepted"].includes(doc.displayStatus) ? "pill-live" : ""}`}>{doc.displayStatus}</span>}
            {doc?.sentAt && <> &middot; sent {new Date(doc.sentAt).toLocaleDateString()}</>}
            {dirty && <> &middot; unsaved changes</>}
          </p>
          {doc?.relatedLinks?.map((l) => (
            <p className="admin-sub" key={l.href}><Link href={l.href}>{l.label}</Link></p>
          ))}
        </div>
        <div className="editor-actions">
          {publicHref && <a className="arrow-link" href={publicHref} target="_blank" rel="noopener noreferrer">Client view</a>}
          {!locked && <button type="button" className="btn-ghost" onClick={onSave} disabled={pending}>Save draft</button>}
          {!locked && <button type="button" className="btn-solid" onClick={onSend} disabled={pending || total <= 0 || !clientId}>{doc?.sentAt ? "Save & resend" : `Send ${type}`}</button>}
        </div>
      </div>

      {status && <p className="editor-status" role="status">{status}</p>}
      {locked && <p className="editor-status">This {type} is {doc?.displayStatus.toLowerCase()} and can no longer be edited.</p>}

      <fieldset disabled={locked} className="editor-fields doc-fieldset">
        <div className="field-grid">
          <label className="field">
            <span>Client</span>
            <select value={clientId} onChange={(e) => touch(setClientId)(e.target.value)} required>
              <option value="">Choose a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName} — {c.email}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Title</span>
            <input value={title} maxLength={200} onChange={(e) => touch(setTitle)(e.target.value)} placeholder={isQuote ? "Website & platform build" : "October retainer"} />
          </label>
        </div>

        {isQuote ? (
          <div className="field-grid">
            <label className="field"><span>Valid until</span><input type="date" value={validUntil} onChange={(e) => touch(setValidUntil)(e.target.value)} /></label>
            <label className="field"><span>Deposit to start (%)</span><input type="number" min={0} max={100} value={depositPercent} onChange={(e) => touch(setDepositPercent)(e.target.value)} /></label>
          </div>
        ) : (
          <div className="field-grid">
            <label className="field">
              <span>Type</span>
              <select value={kind} onChange={(e) => touch(setKind)(e.target.value as typeof kind)}>
                <option value="STANDARD">Standard</option>
                <option value="RETAINER">Monthly retainer</option>
                <option value="DEPOSIT">Deposit</option>
              </select>
            </label>
            <div className="field-grid tight">
              <label className="field"><span>Issue date</span><input type="date" value={issueDate} onChange={(e) => touch(setIssueDate)(e.target.value)} /></label>
              <label className="field"><span>Due date</span><input type="date" value={dueDate} onChange={(e) => touch(setDueDate)(e.target.value)} /></label>
            </div>
          </div>
        )}

        {isQuote && (
          <label className="field">
            <span>Introduction <small>shown above the line items</small></span>
            <textarea rows={3} value={intro} maxLength={5000} onChange={(e) => touch(setIntro)(e.target.value)} placeholder="A short summary of what this proposal covers and the outcome." />
          </label>
        )}

        <div className="field">
          <span>Line items</span>
          <div className="line-items">
            <div className="line-head"><span>Description</span><span>Qty</span><span>Price</span><span>Amount</span><span /></div>
            {rows.map((r, idx) => (
              <div className="line-row" key={r.key}>
                <div className="line-desc">
                  <input value={r.description} maxLength={300} placeholder="Item or service" onChange={(e) => updateRow(r.key, { description: e.target.value })} />
                  <textarea rows={1} value={r.details} maxLength={2000} placeholder="Details (optional)" onChange={(e) => updateRow(r.key, { details: e.target.value })} />
                </div>
                <input className="line-qty" inputMode="numeric" value={r.quantity} onChange={(e) => updateRow(r.key, { quantity: e.target.value })} aria-label="Quantity" />
                <input className="line-price" inputMode="decimal" value={r.price} placeholder="0.00" onChange={(e) => updateRow(r.key, { price: e.target.value })} aria-label="Price" />
                <span className="line-amount">{formatMoney(lineTotal(parsed[idx]))}</span>
                <button type="button" className="line-remove" aria-label="Remove line" onClick={() => { setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [blankRow()])); setDirty(true); }}>&times;</button>
              </div>
            ))}
            <div className="line-tools">
              <button type="button" className="btn-ghost" onClick={() => setRows((rs) => [...rs, blankRow()])}>+ Add line</button>
              {catalog.length > 0 && (
                <select value="" onChange={(e) => addCatalog(e.target.value)} aria-label="Add a saved item">
                  <option value="">+ Add saved item…</option>
                  {catalog.map((c) => <option key={c.id} value={c.id}>{c.name} — {formatMoney(c.unitCents)}</option>)}
                </select>
              )}
            </div>
            <div className="line-total">
              <span>Total</span><strong>{formatMoney(total)}</strong>
            </div>
            {isQuote && Number(depositPercent) > 0 && (
              <div className="line-total sub"><span>Deposit ({depositPercent}%)</span><span>{formatMoney(depositCents(total, Number(depositPercent)))}</span></div>
            )}
          </div>
        </div>

        <label className="field">
          <span>{isQuote ? "Terms" : "Notes"} <small>{isQuote ? "shown below the totals" : "shown at the bottom of the invoice"}</small></span>
          <textarea rows={4} value={isQuote ? terms : notes} maxLength={10000} onChange={(e) => touch(isQuote ? setTerms : setNotes)(e.target.value)} />
        </label>
      </fieldset>

      {!isQuote && doc && (
        <div className="editor-danger">
          {doc.status !== "PAID" && doc.status !== "VOID" && doc.status !== "DRAFT" && <button type="button" className="btn-ghost" onClick={onPaid} disabled={pending}>Record payment received</button>}
          <form action={duplicateInvoice.bind(null, doc.id)}><button type="submit" className="btn-ghost">Duplicate as new draft</button></form>
          {doc.status !== "PAID" && doc.status !== "VOID" && <button type="button" className="btn-ghost danger" onClick={onVoid} disabled={pending}>Void invoice</button>}
        </div>
      )}
    </div>
  );
}
