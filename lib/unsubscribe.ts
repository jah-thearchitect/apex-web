import "server-only";
import { prisma } from "./prisma";

/** Marks the subscriber with this token as unsubscribed. Returns their email, or null for an unknown token. */
export async function unsubscribeByToken(token: string): Promise<string | null> {
  const sub = await prisma.subscriber.findUnique({ where: { token } });
  if (!sub) return null;
  if (sub.status !== "UNSUBSCRIBED") {
    await prisma.subscriber.update({ where: { id: sub.id }, data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() } });
  }
  return sub.email;
}
