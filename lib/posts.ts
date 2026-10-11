import sanitizeHtml from "sanitize-html";

export { slugify } from "./slug";

// Everything the editor can produce, and nothing else. Post HTML is
// sanitized on save and again on render, so a bad row can't inject script.
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "strong", "em", "u", "s", "a", "ul", "ol", "li",
    "blockquote", "hr", "img", "code", "pre",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt"],
  },
  allowedSchemes: ["https", "http", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
  },
  // Images only from our own uploads (served by /media/...).
  exclusiveFilter: (frame) => frame.tag === "img" && !String(frame.attribs.src ?? "").startsWith("/media/minutes/"),
};

export function cleanHtml(html: string) {
  return sanitizeHtml(html, SANITIZE);
}

export function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/New_York" });
}

/** Rough reading time from the HTML body, for the post header. */
export function readingMinutes(html: string) {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}
