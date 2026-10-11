import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRing } from "@/components/ArrowRing";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PageShell } from "@/components/PageShell";
import { PhotoHero } from "@/components/SiteImages";
import { formatDate } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Mastermind Minutes",
  description: "Short, direct reads on scaling, branding, and capital from Apex Capital Consultants.",
};

export default async function MinutesIndex() {
  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true },
  });

  return (
    <PageShell>
      <PhotoHero src="/images/minutes-notebook.webp" position="center 60%">
          <p className="eyebrow">THE MASTERMIND MINUTES</p>
          <h1>A few minutes that sharpen how you run your business.</h1>
          <p>Short, direct reads on scaling, branding, and capital &mdash; the kind of thinking that puts you ahead before your competitors catch on.</p>
      </PhotoHero>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          {posts.length === 0 ? (
            <p className="minutes-empty">The first Minutes are on the way. Join below to get them when they land.</p>
          ) : (
            <div className="post-list">
              {posts.map((p) => (
                <Link key={p.slug} href={`/minutes/${p.slug}`} className="post-card">
                  {p.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverImage} alt="" className="post-card-img" />
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
