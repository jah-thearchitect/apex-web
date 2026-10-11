import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PageShell } from "@/components/PageShell";
import { cleanHtml, formatDate, readingMinutes } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getPost(slug: string) {
  return prisma.post.findFirst({ where: { slug, publishedAt: { not: null } } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: { type: "article", title: post.title, description: post.excerpt || undefined, images: post.coverImage ? [post.coverImage] : undefined },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  return (
    <PageShell>
      <article>
        <section className="page-hero post-hero">
          <div className="wrap post-wrap">
            <Link href="/minutes" className="eyebrow eyebrow-link">THE MASTERMIND MINUTES</Link>
            <h1>{post.title}</h1>
            <p className="post-meta">
              {post.publishedAt ? formatDate(post.publishedAt) : ""} &middot; {readingMinutes(post.bodyHtml)} min read
            </p>
          </div>
        </section>
        <section style={{ paddingTop: 0 }}>
          <div className="wrap post-wrap">
            {post.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.coverImage} alt="" className="post-cover" />
            )}
            <div className="prose" dangerouslySetInnerHTML={{ __html: cleanHtml(post.bodyHtml) }} />
          </div>
        </section>
      </article>

      <section className="on-ink-2">
        <div className="wrap">
          <div className="newsletter">
            <div>
              <p className="eyebrow">THE MASTERMIND MINUTES</p>
              <h3>Get the next one by email.</h3>
              <p>One email per post. Unsubscribe anytime.</p>
            </div>
            <div>
              <NewsletterForm buttonLabel="Join the Minutes" source="post" />
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
