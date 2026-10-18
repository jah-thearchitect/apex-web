import "server-only";
import { revalidatePath } from "next/cache";
import { sendPostToSubscribers } from "./newsletter";
import { prisma } from "./prisma";
import { addDays, formatInZone, zonedToUtc, zonedYmd } from "./tz";

// The Minutes publish on Sundays and Wednesdays at 9:00 AM Eastern.
export const POST_TZ = "America/New_York";
const POST_DAYS = [0, 3]; // Sunday, Wednesday
const POST_HOUR = 9;

export type PublishResult = { ok: true; sent: number; alreadySent: boolean } | { ok: false; error: string };

/**
 * Publishes a post and, if asked, emails it to every active subscriber.
 * Used by Publish in admin and by the scheduled-post cron. The sentAt claim
 * is atomic, so a double click or an overlapping cron run can't send twice.
 */
export async function publishAndSend(id: string, sendEmail: boolean): Promise<PublishResult> {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { ok: false, error: "Post not found." };
  if (!post.bodyHtml.replace(/<[^>]+>/g, "").trim()) return { ok: false, error: "The post body is empty." };

  const published = post.publishedAt
    ? await prisma.post.update({ where: { id }, data: { scheduledAt: null } })
    : await prisma.post.update({ where: { id }, data: { publishedAt: new Date(), scheduledAt: null } });
  revalidatePath("/minutes");
  revalidatePath(`/minutes/${post.slug}`);
  revalidatePath("/admin/posts");

  if (!sendEmail) return { ok: true, sent: 0, alreadySent: !!post.sentAt };

  const claim = await prisma.post.updateMany({ where: { id, sentAt: null }, data: { sentAt: new Date() } });
  if (claim.count === 0) return { ok: true, sent: 0, alreadySent: true };

  const result = await sendPostToSubscribers(published);
  if (result.sent === 0 && result.error) {
    // Nothing went out, so release the claim and allow a retry.
    await prisma.post.update({ where: { id }, data: { sentAt: null } });
    return { ok: false, error: `The post is published, but the email didn’t go out: ${result.error}` };
  }
  // A partial send keeps sentAt set so nobody gets the post twice.
  await prisma.post.update({ where: { id }, data: { sentCount: result.sent } });
  revalidatePath("/admin/posts");
  if (result.error) return { ok: false, error: `Sent to ${result.sent} of ${result.total} subscribers, then stopped: ${result.error}` };
  return { ok: true, sent: result.sent, alreadySent: false };
}

/** "Sun, Oct 25 · 9:00 AM ET" */
export function scheduleLabel(date: Date) {
  const day = formatInZone(date, POST_TZ, { weekday: "short", month: "short", day: "numeric" });
  const time = formatInZone(date, POST_TZ, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time} ET`;
}

/**
 * The next open Sunday/Wednesday 9 AM slots (skipping ones another
 * scheduled post already holds), for the quick picks in the editor.
 */
export async function openSlots(count = 4, exceptPostId?: string) {
  const taken = new Set(
    (await prisma.post.findMany({
      where: { scheduledAt: { not: null }, publishedAt: null, NOT: exceptPostId ? { id: exceptPostId } : undefined },
      select: { scheduledAt: true },
    })).map((p) => p.scheduledAt!.getTime())
  );
  const now = Date.now();
  const today = zonedYmd(new Date(), POST_TZ);
  const slots: { iso: string; label: string }[] = [];
  for (let i = 0; i < 60 && slots.length < count; i++) {
    const day = addDays(today.y, today.m, today.d, i);
    if (!POST_DAYS.includes(day.weekday)) continue;
    const at = zonedToUtc(day.y, day.m, day.d, POST_HOUR, 0, POST_TZ);
    if (at.getTime() <= now + 10 * 60_000 || taken.has(at.getTime())) continue;
    slots.push({ iso: at.toISOString(), label: scheduleLabel(at) });
  }
  return slots;
}

/** "2026-10-25T09:00" entered as Eastern time → the UTC instant. */
export function easternLocalToUtc(local: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  return zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], POST_TZ);
}

/** Publishes every post whose scheduled time has come. Returns what happened. */
export async function publishDuePosts() {
  const due = await prisma.post.findMany({
    where: { scheduledAt: { lte: new Date() }, publishedAt: null },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });
  const results: { slug: string; ok: boolean; sent?: number; error?: string }[] = [];
  for (const p of due) {
    const r = await publishAndSend(p.id, p.scheduleSendEmail && !p.sentAt);
    // A post that couldn't go live (e.g. empty body) is unscheduled, so the
    // firm gets one alert instead of one every hour.
    if (!r.ok) await prisma.post.updateMany({ where: { id: p.id, publishedAt: null }, data: { scheduledAt: null } });
    results.push(r.ok ? { slug: p.slug, ok: true, sent: r.sent } : { slug: p.slug, ok: false, error: r.error });
  }
  return results;
}
