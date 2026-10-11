import { PostEditor } from "@/components/admin/PostEditor";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "New post" };

export default async function NewPost() {
  const subscriberCount = await prisma.subscriber.count({ where: { status: "ACTIVE" } });
  return <PostEditor subscriberCount={subscriberCount} />;
}
