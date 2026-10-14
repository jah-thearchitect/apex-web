"use client";

import { useRef, useState } from "react";
import type { FileRef } from "@/lib/briefQuestions";

const LIMIT = 4 * 1024 * 1024;
const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.svg,.heic,.pdf,.ai,.eps,.psd,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip";

// Originals are kept whenever they fit (logos stay crisp). Only a photo
// over the 4 MB request cap is shrunk, to 2400px WebP, before upload.
async function fitUnderLimit(file: File): Promise<File> {
  if (file.size <= LIMIT || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function FileField({
  uploadUrl, files, onChange, disabled, max = 30,
}: { uploadUrl: string; files: FileRef[]; onChange: (f: FileRef[]) => void; disabled?: boolean; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  async function add(list: FileList | null) {
    if (!list || disabled) return;
    setError("");
    let current = files;
    for (const original of Array.from(list)) {
      if (current.length >= max) { setError(`Up to ${max} files here.`); break; }
      setBusy(`Uploading ${original.name}…`);
      const file = await fitUnderLimit(original);
      if (file.size > LIMIT) { setError(`${original.name} is over 4 MB. Share a Google Drive or Dropbox link in the notes instead.`); continue; }
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch(uploadUrl, { method: "POST", body: form });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { setError(json.error ?? `${original.name} didn't upload.`); continue; }
        current = [...current, json as FileRef];
        onChange(current);
      } catch {
        setError(`${original.name} didn't upload. Check your connection and try again.`);
      }
    }
    setBusy("");
    if (input.current) input.current.value = "";
  }

  return (
    <div className="ff">
      <label
        className={`ff-drop${over ? " over" : ""}${disabled ? " off" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
      >
        <input ref={input} type="file" multiple accept={ACCEPT} disabled={disabled || !!busy} onChange={(e) => add(e.target.files)} />
        <span>{busy || <>Drop files here or <u>browse</u></>}</span>
        <small>Images, PDFs, Office files, ZIP · up to 4 MB each</small>
      </label>
      {error && <p className="ff-error" role="alert">{error}</p>}
      {files.length > 0 && (
        <ul className="ff-list">
          {files.map((f) => (
            <li key={f.path}>
              <span>{f.name}</span>
              <small>{kb(f.size)}</small>
              {!disabled && (
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((x) => x.path !== f.path))}>×</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
