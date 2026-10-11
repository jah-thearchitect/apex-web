import "server-only";
import { Resend } from "resend";
import { prisma } from "./prisma";
import { cleanHtml, formatDate } from "./posts";
import { SITE_URL } from "./site";

type Mailable = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  bodyHtml: string;
  publishedAt: Date | null;
};

export function unsubscribeUrl(token: string) {
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Email clients ignore <style> blocks unevenly, so the post body gets
// inline styles per tag. Light background: dark-themed email renders badly
// in Outlook and in clients that force their own dark mode.
function inlineBodyStyles(html: string) {
  const styles: Record<string, string> = {
    p: "margin:0 0 16px;font-size:16px;line-height:1.65;color:#2b2d31;",
    h2: "margin:28px 0 12px;font-family:Georgia,serif;font-size:24px;font-weight:500;line-height:1.25;color:#101113;",
    h3: "margin:24px 0 10px;font-family:Georgia,serif;font-size:19px;font-weight:500;color:#101113;",
    blockquote: "margin:20px 0;padding:4px 0 4px 18px;border-left:2px solid #B4863C;font-family:Georgia,serif;font-style:italic;color:#2b2d31;",
    ul: "margin:0 0 16px;padding-left:22px;",
    ol: "margin:0 0 16px;padding-left:22px;",
    li: "margin:0 0 6px;font-size:16px;line-height:1.6;color:#2b2d31;",
    a: "color:#2f5f7a;text-decoration:underline;",
    img: "display:block;max-width:100%;height:auto;margin:20px 0;",
    hr: "border:none;border-top:1px solid #e3e3de;margin:28px 0;",
  };
  return html.replace(/<(p|h2|h3|blockquote|ul|ol|li|a|img|hr)(\s|>|\/)/g, (_m, tag: string, next: string) => `<${tag} style="${styles[tag]}"${next}`);
}

export function renderPostEmail(post: Mailable, token: string) {
  const url = `${SITE_URL}/minutes/${post.slug}`;
  const date = post.publishedAt ? formatDate(post.publishedAt) : "";
  const cover = post.coverImage
    ? `<img src="${esc(post.coverImage)}" alt="" style="display:block;width:100%;max-width:600px;height:auto;margin:0 0 28px;">`
    : "";
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F1F1EE;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F1EE;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<tr><td style="background:#0A0B0D;padding:22px 32px;">
  <span style="display:inline-block;border:1px solid #8a6a36;padding:5px 12px;font-family:Georgia,serif;font-size:17px;color:#EDEEEC;">Apex</span>
  <span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#9CA0A0;margin-left:12px;">THE MASTERMIND MINUTES</span>
</td></tr>
<tr><td style="padding:36px 32px 8px;">
  ${cover}
  <p style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8A6220;">${esc(date)}</p>
  <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:30px;font-weight:500;line-height:1.2;color:#101113;">${esc(post.title)}</h1>
  ${inlineBodyStyles(cleanHtml(post.bodyHtml))}
  <p style="margin:28px 0 8px;"><a href="${url}" style="display:inline-block;background:#0A0B0D;color:#EDEEEC;font-family:'Courier New',monospace;font-size:13px;letter-spacing:1px;text-decoration:none;padding:12px 20px;">Read on the site</a></p>
</td></tr>
<tr><td style="padding:24px 32px 32px;border-top:1px solid #e3e3de;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#8A8D8F;">You're getting this because you joined The Mastermind Minutes from Apex Capital Consultants.
  <a href="${unsubscribeUrl(token)}" style="color:#8A8D8F;">Unsubscribe</a></p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    post.title,
    date,
    "",
    cleanHtml(post.bodyHtml).replace(/<\/(p|h2|h3|li|blockquote)>/g, "\n\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim(),
    "",
    `Read on the site: ${url}`,
    "",
    `Unsubscribe: ${unsubscribeUrl(token)}`,
  ].join("\n");

  return { html, text };
}

/**
 * Emails a post to every active subscriber. Never throws: on failure it
 * reports how many went out before it stopped.
 */
export async function sendPostToSubscribers(post: Mailable): Promise<{ sent: number; total: number; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { sent: 0, total: 0, error: "RESEND_API_KEY / NEWSLETTER_FROM_EMAIL not set." };

  const subscribers = await prisma.subscriber.findMany({
    where: { status: "ACTIVE" },
    select: { email: true, token: true },
  });
  const resend = new Resend(apiKey);
  let sent = 0;

  // Resend's batch endpoint takes up to 100 emails per call. Each email is
  // individual (own To and own unsubscribe link) so no one sees the list.
  for (let i = 0; i < subscribers.length; i += 100) {
    const chunk = subscribers.slice(i, i + 100);
    let error: { message: string } | null;
    try {
      ({ error } = await resend.batch.send(
      chunk.map((s) => {
        const { html, text } = renderPostEmail(post, s.token);
        return {
          from,
          to: s.email,
          subject: post.title,
          html,
          text,
          headers: {
            "List-Unsubscribe": `<${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(s.token)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      })
      ));
    } catch (err) {
      error = { message: err instanceof Error ? err.message : "network error" };
    }
    if (error) return { sent, total: subscribers.length, error: error.message };
    sent += chunk.length;
  }
  return { sent, total: subscribers.length };
}
