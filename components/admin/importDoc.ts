import { marked } from "marked";

// Turning outside content (Markdown, Google Docs, Word, plain text) into the
// HTML the post editor understands. The server sanitizes again on save.

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true }) as string;
}

/** Plain text that's really Markdown: headings, bold, lists, or links. */
export function looksLikeMarkdown(text: string) {
  return /^#{1,6}\s|\*\*[^*]+\*\*|^\s*[-*+]\s|^\s*\d+\.\s|\[[^\]]+\]\([^)]+\)|^>\s/m.test(text);
}

export function textToHtml(text: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
}

/**
 * Fits pasted/imported HTML to the post format: Google Docs wraps its whole
 * paste in a <b> (which would bold everything), posts use h2/h3 only (h1 is
 * the post title), and inline styles/classes aren't needed.
 */
export function normalizeHtml(html: string): string {
  return html
    .replace(/<b[^>]*id="docs-internal-guid[^"]*"[^>]*>([\s\S]*)<\/b>/i, "$1")
    .replace(/<(\/?)h1(\s[^>]*)?>/gi, "<$1h2>")
    .replace(/<(\/?)h[4-6](\s[^>]*)?>/gi, "<$1h3>");
}

/** If the document opens with a top heading, use it as the title. */
function splitTitle(html: string): { html: string; title?: string } {
  const m = html.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return { html };
  const title = m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
  return { html: html.slice(m[0].length), title: title || undefined };
}

export type ImportedPost = {
  html: string;
  title?: string;
  /** From a Markdown file's front matter (the --- block at the top). */
  slug?: string;
  summary?: string;
  seoTitle?: string;
  /** data: URL or https URL of the cover image. */
  cover?: string;
  coverAlt?: string;
};

/**
 * Optional "front matter" at the top of a Markdown file fills the post's
 * fields, so one file carries the whole post:
 *   ---
 *   title: Is Your Business Running You?
 *   slug: is-your-business-running-you
 *   summary: One or two sentences...
 *   seoTitle: Headline for Google
 *   cover: data:image/webp;base64,...   (or an https:// image link)
 *   coverAlt: What the cover shows
 *   ---
 */
function splitFrontMatter(text: string): { body: string; fields: Record<string, string> } {
  const clean = text.replace(/^\uFEFF/, "");
  const m = clean.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { body: clean, fields: {} };
  const fields: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (kv) fields[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { body: clean.slice(m[0].length), fields };
}

/** Reads a .docx, .md, .txt or .html file into post HTML (+ a title if found). */
export async function importDocument(file: File): Promise<ImportedPost> {
  const name = file.name.toLowerCase();
  let raw: string;
  if (name.endsWith(".docx")) {
    if (file.size > 4 * 1024 * 1024) throw new Error("That document is over 4 MB. Remove some large images, or paste the text and add images separately.");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/import-docx", { method: "POST", body: form });
    const json = (await res.json().catch(() => ({}))) as { html?: string; error?: string };
    if (!res.ok || typeof json.html !== "string") throw new Error(json.error ?? "That document couldn't be read.");
    raw = json.html;
  } else {
    const text = await file.text();
    if (name.endsWith(".md") || name.endsWith(".markdown")) {
      const { body, fields } = splitFrontMatter(text);
      const split = splitTitle(markdownToHtml(body));
      const cover = fields.cover && /^(data:image\/(jpeg|png|webp|gif);base64,|https:\/\/)/.test(fields.cover) ? fields.cover : undefined;
      return {
        html: normalizeHtml(split.html),
        title: fields.title || split.title,
        slug: fields.slug,
        summary: fields.summary,
        seoTitle: fields.seotitle,
        cover,
        coverAlt: fields.coveralt,
      };
    }
    else if (name.endsWith(".html") || name.endsWith(".htm")) raw = (text.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? text);
    else if (name.endsWith(".txt")) raw = looksLikeMarkdown(text) ? markdownToHtml(text) : textToHtml(text);
    else throw new Error("Use a Word (.docx), Markdown (.md), text (.txt), or HTML file.");
  }
  const { html, title } = splitTitle(raw);
  return { html: normalizeHtml(html), title };
}

/**
 * A data: image URL as a File, decoded in place. (fetch() on a data: URL
 * would be blocked by the site's connect-src security policy.)
 */
export function dataUrlToFile(src: string, name = "image"): File {
  const m = src.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
  if (!m) throw new Error("Not a data URL.");
  const type = m[1];
  const raw = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new File([bytes], `${name}.${type.split("/")[1] ?? "png"}`, { type });
}
