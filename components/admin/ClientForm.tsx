"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveClient, type ClientInput } from "@/app/admin/billing-actions";

export function ClientForm({ client }: { client?: ClientInput & { id: string } }) {
  const router = useRouter();
  const [form, setForm] = useState<ClientInput>(
    client ?? { businessName: "", contactName: "", email: "", status: "LEAD" }
  );
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof ClientInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await saveClient({ ...form, id: client?.id });
      if (!res.ok) return setStatus(res.error);
      setStatus("Saved.");
      if (!client) router.push(`/admin/clients/${res.id}`);
      else router.refresh();
    });
  }

  const field = (k: keyof ClientInput, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      <span>{label}</span>
      <input value={(form[k] as string) ?? ""} onChange={set(k)} {...props} />
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="editor-fields">
      <div className="field-grid">
        {field("businessName", "Business name", { required: true, maxLength: 160 })}
        {field("contactName", "Contact name", { required: true, maxLength: 120 })}
        {field("email", "Email", { type: "email", required: true, maxLength: 254 })}
        {field("phone", "Phone", { maxLength: 40 })}
      </div>
      <div className="field-grid">
        {field("addressLine1", "Address", { maxLength: 160 })}
        {field("addressLine2", "Address line 2", { maxLength: 160 })}
        {field("city", "City", { maxLength: 80 })}
        <div className="field-grid tight">
          {field("state", "State", { maxLength: 40 })}
          {field("postalCode", "ZIP", { maxLength: 20 })}
        </div>
      </div>
      <label className="field">
        <span>Status</span>
        <select value={form.status ?? "LEAD"} onChange={set("status")}>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active client</option>
          <option value="PAST">Past client</option>
        </select>
      </label>
      <label className="field">
        <span>Payment method <small>how this client pays invoices</small></span>
        <select value={form.paymentMethod ?? "STRIPE"} onChange={set("paymentMethod")}>
          <option value="STRIPE">Online — card or bank via Stripe (shows Pay button)</option>
          <option value="GUSTO">Gusto direct deposit (no Pay button)</option>
          <option value="OFFLINE">Check or bank transfer (no Pay button)</option>
        </select>
      </label>
      <label className="field">
        <span>Notes <small>private, never shown to the client</small></span>
        <textarea rows={3} value={form.notes ?? ""} onChange={set("notes")} maxLength={5000} />
      </label>
      <div className="editor-actions">
        <button type="submit" className="btn-solid" disabled={pending}>{pending ? "Saving…" : client ? "Save client" : "Create client"}</button>
        {status && <span className="editor-status" style={{ margin: 0 }}>{status}</span>}
      </div>
    </form>
  );
}
