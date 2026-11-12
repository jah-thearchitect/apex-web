import "server-only";
import { get } from "@vercel/blob";

/** A file the owner uploaded to attach to an email: { path in the private store, original name, size }. */
export type Attached = { path: string; name: string; size: number };

export const MAX_ATTACHMENTS = 5;
// Gmail refuses mail over 25 MB, and attachments grow by about a third when
// encoded, so keep the raw total comfortably under that.
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
export const ATTACHMENT_PREFIX = "attachments/";

/** Parses the form's JSON list, keeping only files uploaded through the admin attachment upload. */
export function parseAttachments(raw: unknown): Attached[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw || "[]");
    } catch {
      return [];
    }
  }
  return (Array.isArray(list) ? list : [])
    .filter((f): f is Attached => !!f && typeof f === "object" && typeof (f as Attached).path === "string")
    .filter((f) => f.path.startsWith(ATTACHMENT_PREFIX) && !f.path.includes(".."))
    .slice(0, MAX_ATTACHMENTS)
    .map((f) => ({ path: f.path.slice(0, 300), name: String(f.name ?? "file").slice(0, 200), size: Number(f.size) || 0 }));
}

/** Reads each file from the private store, ready to attach to an email. Throws a plain-English error. */
export async function loadAttachments(files: Attached[]): Promise<{ filename: string; content: Buffer }[]> {
  let total = 0;
  const out: { filename: string; content: Buffer }[] = [];
  for (const f of files) {
    const result = await get(f.path, { access: "private" }).catch(() => null);
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error(`Couldn't read ${f.name}. Remove it and upload it again.`);
    }
    const content = Buffer.from(await new Response(result.stream).arrayBuffer());
    total += content.length;
    if (total > MAX_TOTAL_BYTES) throw new Error("The attachments add up to more than 15 MB. Remove one, or share a Google Drive link instead.");
    out.push({ filename: f.name.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "file", content });
  }
  return out;
}
