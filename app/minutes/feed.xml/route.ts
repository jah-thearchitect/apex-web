import { cleanHtml } from "@/lib/posts";
import { prisma } from "@/lib/prisma";
import { DESCRIPTION, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Post bodies reference images by site path; feed readers need full URLs.
const absolute = (html: string) => html.replace(/(src|href)="\//g, `$1="${SITE_URL}/`);

// RSS for The Mastermind Minutes (linked from /minutes), newest 30 posts.
export async function GET() {
  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });
  const items = posts.map((p) => {
    const url = `${SITE_URL}/minutes/${p.slug}`;
    return `<item>
  <title>${esc(p.title)}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <pubDate>${p.publishedAt!.toUTCString()}</pubDate>
  ${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ""}
  <content:encoded><![CDATA[${absolute(cleanHtml(p.bodyHtml)).replace(/]]>/g, "]]]]><![CDATA[>")}]]></content:encoded>
</item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>The Mastermind Minutes | Apex Capital Consultants</title>
  <link>${SITE_URL}/minutes</link>
  <atom:link href="${SITE_URL}/minutes/feed.xml" rel="self" type="application/rss+xml"/>
  <description>${esc(DESCRIPTION)}</description>
  <language>en-us</language>
  ${posts[0]?.publishedAt ? `<lastBuildDate>${posts[0].publishedAt.toUTCString()}</lastBuildDate>` : ""}
${items.join("\n")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
