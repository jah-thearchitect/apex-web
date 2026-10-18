import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { openSlots, scheduleLabel } from "@/lib/postSchedule";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit post" };

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, subscriberCount] = await Promise.all([
    prisma.post.findUnique({ where: { id } }),
    prisma.subscriber.count({ where: { status: "ACTIVE" } }),
  ]);
  if (!post) notFound();

  return (
    <PostEditor
      subscriberCount={subscriberCount}
      slots={await openSlots(4, post.id)}
      post={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        coverAlt: post.coverAlt,
        seoTitle: post.seoTitle,
        bodyHtml: post.bodyHtml,
        published: !!post.publishedAt,
        scheduledLabel: post.scheduledAt && !post.publishedAt ? scheduleLabel(post.scheduledAt) : null,
        sentAt: post.sentAt?.toISOString() ?? null,
        sentCount: post.sentCount,
      }}
    />
  );
}
