import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRing } from "@/components/ArrowRing";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PageShell } from "@/components/PageShell";
import { PhotoHero } from "@/components/SiteImages";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

type SP = Promise<{ page?: string }>;
const pageOf = (raw?: string) => Math.max(1, Math.floor(Number(raw)) || 1);

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const page = pageOf((await searchParams).page);
  return {
    title: page > 1 ? `The Mastermind Minutes: Page ${page}` : "The Mastermind Minutes: Business Growth Blog",
    description: "Short, direct reads on scaling, branding, and capital from Apex Capital Consultants.",
    alternates: {
      canonical: page > 1 ? `${SITE_URL}/minutes?page=${page}` : `${SITE_URL}/minutes`,
      types: { "application/rss+xml": `${SITE_URL}/minutes/feed.xml` },
    },
  };
}

// Page 1: the newest post featured wide, then the rest in a grid. Older
// posts continue on ?page=2, 3, ... (12 per page) so every post stays linked.
export default async function MinutesIndex({ searchParams }: { searchParams: SP }) {
  const page = pageOf((await searchParams).page);
  const where = { publishedAt: { not: null } };
  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { slug: true, title: true, excerpt: true, coverImage: true, coverAlt: true, publishedAt: true },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const featured = page === 1 ? posts[0] : undefined;
  const grid = featured ? posts.slice(1) : posts;

  return (
    <PageShell>
      <PhotoHero src="/images/minutes-notebook.webp" position="center 60%">
          <p className="eyebrow">THE MASTERMIND MINUTES</p>
          <h1>A few minutes that sharpen how you run your business.</h1>
          <p>Short, direct reads on scaling, branding, and capital &mdash; the kind of thinking that puts you ahead before your competitors catch on.</p>
      </PhotoHero>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          {total === 0 ? (
            <p className="minutes-empty">The first Minutes are on the way. Join below to get them when they land.</p>
          ) : (
            <>
              {featured && (
                <Link href={`/minutes/${featured.slug}`} className={`post-card post-featured${featured.coverImage ? "" : " no-img"}`}>
                  {featured.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.coverImage} alt={featured.coverAlt} className="post-card-img" />
                  )}
                  <div className="post-card-body">
                    <span className="tag">Latest &middot; {featured.publishedAt ? formatDate(featured.publishedAt) : ""}</span>
                    <h2>{featured.title}</h2>
                    {featured.excerpt && <p>{featured.excerpt}</p>}
                    <span className="arrow-link go">Read <ArrowRing /></span>
                  </div>
                </Link>
              )}
              {grid.length > 0 && (
                <div className="post-grid">
                  {grid.map((p) => (
                    <Link key={p.slug} href={`/minutes/${p.slug}`} className="post-card">
                      {p.coverImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.coverImage} alt={p.coverAlt} className="post-card-img" loading="lazy" />
                      )}
                      <div className="post-card-body">
                        <span className="tag">{p.publishedAt ? formatDate(p.publishedAt) : ""}</span>
                        <h2>{p.title}</h2>
                        {p.excerpt && <p>{p.excerpt}</p>}
                        <span className="arrow-link go">Read <ArrowRing /></span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {pages > 1 && (
                <nav className="post-pager" aria-label="More posts">
                  {page > 1 ? <Link href={page === 2 ? "/minutes" : `/minutes?page=${page - 1}`} rel="prev">&larr; Newer</Link> : <span />}
                  <span>Page {page} of {pages}</span>
                  {page < pages ? <Link href={`/minutes?page=${page + 1}`} rel="next">Older &rarr;</Link> : <span />}
                </nav>
              )}
            </>
          )}
        </div>
      </section>

      <section className="on-ink-2">
        <div className="wrap">
          <div className="newsletter">
            <div>
              <p className="eyebrow">GET THEM BY EMAIL</p>
              <h3>New Minutes, straight to your inbox.</h3>
              <p>One email per post. Unsubscribe anytime.</p>
            </div>
            <div>
              <NewsletterForm buttonLabel="Join the Minutes" source="minutes" />
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
