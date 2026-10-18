import { PostEditor } from "@/components/admin/PostEditor";
import { openSlots } from "@/lib/postSchedule";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "New post" };

export default async function NewPost() {
  const subscriberCount = await prisma.subscriber.count({ where: { status: "ACTIVE" } });
  return <PostEditor subscriberCount={subscriberCount} slots={await openSlots(4)} />;
}
