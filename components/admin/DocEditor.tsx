"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  duplicateInvoice, recordManualPayment, remindInvoice, saveInvoice, saveQuote, sendInvoice, sendQuote, setInvoiceAutoReminders, voidInvoice,
} from "@/app/admin/billing-actions";
import { AUTO_LABEL, type ReminderKind } from "@/lib/invoiceReminderRules";
import type { FileRef } from "@/lib/briefQuestions";
import { depositCents, formatMoney, lineTotal, parseDollars, subtotal } from "@/lib/money";
import { FileField } from "../FileField";

type Row = { key: number; description: string; details: string; quantity: string; price: string };
type Catalog = { id: string; name: string; details: string; unitCents: number };
type ClientOpt = { id: string; businessName: string; email: string; paymentMethod?: string };

export type DocEditorProps = {
  type: "quote" | "invoice";
  clients: ClientOpt[];
  catalog: Catalog[];
  defaults: {
    clientId: string; depositPercent: number; validUntil: string; dueDate: string; issueDate: string; terms: string; notes: string;
    /** Prefill for a new document (e.g. billing an update request). */
    title?: string;
    items?: { description: string; details: string; quantity: number; unitCents: number }[];
    changeRequestId?: string;
    note?: string;
  };
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
    /** Files emailed along with the document. */
    files?: FileRef[];
    /** Invoices: automatic 48/72-hour reminders on or off, and the reminders already sent (newest first). */
    autoReminders?: boolean;
    reminders?: { kind: string; at: string }[];
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
  const [title, setTitle] = useState(doc?.title ?? defaults.title ?? "");
  const [intro, setIntro] = useState(doc?.intro ?? "");
  const [terms, setTerms] = useState(doc?.terms ?? defaults.terms);
  const [notes, setNotes] = useState(doc?.notes ?? defaults.notes);
  const [validUntil, setValidUntil] = useState(doc?.validUntil ?? defaults.validUntil);
  const [depositPercent, setDepositPercent] = useState(String(doc?.depositPercent ?? defaults.depositPercent));
  const [kind, setKind] = useState(doc?.kind ?? "STANDARD");
  const [issueDate, setIssueDate] = useState(doc?.issueDate ?? defaults.issueDate);
  const [dueDate, setDueDate] = useState(doc?.dueDate ?? defaults.dueDate);
  const [rows, setRows] = useState<Row[]>(
    doc?.items.length ? doc.items.map(toRow) : defaults.items?.length ? defaults.items.map((i) => ({ ...toRow(i), price: i.unitCents ? toRow(i).price : "" })) : [blankRow()]
  );
  const [files, setFiles] = useState<FileRef[]>(doc?.files ?? []);
  const [autoOn, setAutoOn] = useState(doc?.autoReminders ?? true);
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
      ? await saveQuote({ id: doc?.id, clientId, title, intro, terms, validUntil: validUntil || null, depositPercent: Number(depositPercent) || 0, items, files })
      : await saveInvoice({ id: doc?.id, clientId, title, notes, kind, issueDate, dueDate, items, files, changeRequestId: doc ? undefined : defaults.changeRequestId });
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
    const preferred = clients.find((c) => c.id === clientId)?.paymentMethod;
    const method = window.prompt("How was it paid? (Gusto, check, cash, bank transfer, Zelle…)", preferred === "GUSTO" ? "Gusto" : "check");
    if (method === null || !doc) return;
    run(async () => { const r = await recordManualPayment(doc.id, method); setStatus(r.ok ? "Marked paid." : r.error); router.refresh(); });
  };
  const onVoid = () => {
    if (!doc || !window.confirm("Void this invoice? The client's link will show it as void.")) return;
    run(async () => { const r = await voidInvoice(doc.id); setStatus(r.ok ? "Voided." : r.error); router.refresh(); });
  };

  const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  const onRemind = () => {
    if (!doc) return;
    const to = clients.find((c) => c.id === clientId)?.email ?? "the client";
    const last = doc.reminders?.[0];
    const hrs = last ? Math.round((Date.now() - new Date(last.at).getTime()) / 3_600_000) : null;
    const note = last && hrs !== null && hrs < 24 ? `\n\nA reminder already went out ${hrs < 1 ? "less than an hour" : `${hrs} hour${hrs === 1 ? "" : "s"}`} ago.` : "";
    if (!window.confirm(`Email ${to} a reminder about invoice ${doc.number}?${note}`)) return;
    run(async () => { const r = await remindInvoice(doc.id); setStatus(r.ok ? `Reminder sent to ${to}.` : r.error); router.refresh(); });
  };
  const onToggleAuto = (on: boolean) => {
    if (!doc) return;
    setAutoOn(on);
    run(async () => {
      const r = await setInvoiceAutoReminders(doc.id, on);
      if (!r.ok) { setAutoOn(!on); setStatus(r.error); return; }
      setStatus(on ? "Automatic reminders are on." : "Automatic reminders are off for this invoice.");
    });
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
          {!doc && defaults.note && <p className="admin-sub">{defaults.note}</p>}
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
            <span>Client <small><Link href="/admin/clients/new">+ New client</Link></small></span>
            <select value={clientId} onChange={(e) => touch(setClientId)(e.target.value)} required>
              <option value="">{clients.length ? "Choose a client…" : "No clients yet — add one first"}</option>
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

        <div className="field">
          <span>Attachments <small>optional: images, PDFs, or documents. They go with the email each time you send this {type}.</small></span>
          <FileField uploadUrl="/api/admin/attachments" files={files} onChange={(f) => { setFiles(f); setDirty(true); }} max={5} disabled={locked} />
        </div>
      </fieldset>

      {!isQuote && doc && (doc.status === "SENT" || doc.status === "VIEWED") && (
        <div className="field" style={{ borderTop: "1px solid var(--line-ink)", marginTop: 32, paddingTop: 24 }}>
          <span>Payment reminders <small>emailed to the client about this unpaid invoice</small></span>
          <div className="editor-actions">
            <button type="button" className="btn-solid" onClick={onRemind} disabled={pending}>Send reminder now</button>
            <label className="check">
              <input type="checkbox" checked={autoOn} onChange={(e) => onToggleAuto(e.target.checked)} disabled={pending} />
              Remind automatically 48 and 72 hours after sending
            </label>
          </div>
          <small style={{ color: "var(--on-ink-faint)" }}>
            {doc.reminders && doc.reminders.length > 0
              ? `Sent: ${doc.reminders.map((r) => `${when(r.at)} (${r.kind === "MANUAL" ? "by you" : `${AUTO_LABEL[r.kind as ReminderKind] ?? r.kind}, automatic`})`).join(" · ")}`
              : "No reminders sent yet."}
            {autoOn ? " Automatic reminders go out between 8 am and 7 pm Eastern, and stop once the invoice is paid." : ""}
          </small>
        </div>
      )}

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
