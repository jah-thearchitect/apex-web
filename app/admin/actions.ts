"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearFailures, isLocked, recordFailure } from "@/lib/loginRateLimit";
import { cleanHtml, slugify } from "@/lib/posts";
import { easternLocalToUtc, publishAndSend, scheduleLabel, type PublishResult } from "@/lib/postSchedule";
import { prisma } from "@/lib/prisma";
import { endSession, requireAdmin, startSession } from "@/lib/session";

// Compared against when the email doesn't exist, so a wrong email and a
// wrong password take the same time to reject.
let dummyHash: string | undefined;
function getDummyHash() {
  dummyHash ??= bcrypt.hashSync("no-such-admin-password", 12);
  return dummyHash;
}

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return "Enter your email and password.";

  if (await isLocked(email)) return "Too many attempts. Try again in 15 minutes.";

  const admin = await prisma.admin.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? getDummyHash());
  if (!admin || !ok) {
    await recordFailure(email);
    return "That email and password don’t match.";
  }

  await clearFailures(email);
  await startSession(admin.id);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/");
}

export type PostInput = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  coverAlt?: string;
  seoTitle?: string;
  bodyHtml: string;
};

export type SaveResult = { ok: true; id: string; slug: string } | { ok: false; error: string };

export async function savePost(input: PostInput): Promise<SaveResult> {
  await requireAdmin();
  const title = input.title.trim().slice(0, 200);
  if (!title) return { ok: false, error: "Add a title first." };
  const slug = slugify(input.slug || title);
  if (!slug) return { ok: false, error: "The URL needs at least one letter or number." };

  const clash = await prisma.post.findFirst({ where: { slug, NOT: input.id ? { id: input.id } : undefined } });
  if (clash) return { ok: false, error: `Another post already uses /minutes/${slug}. Change the URL.` };

  const data = {
    title,
    slug,
    excerpt: input.excerpt.trim().slice(0, 400),
    coverImage: input.coverImage?.startsWith("/media/minutes/") ? input.coverImage : null,
    coverAlt: (input.coverAlt ?? "").trim().slice(0, 200),
    seoTitle: (input.seoTitle ?? "").trim().slice(0, 120),
    bodyHtml: cleanHtml(input.bodyHtml),
  };

  const post = input.id
    ? await prisma.post.update({ where: { id: input.id }, data })
    : await prisma.post.create({ data });

  revalidatePath("/minutes");
  revalidatePath(`/minutes/${post.slug}`);
  revalidatePath("/admin/posts");
  return { ok: true, id: post.id, slug: post.slug };
}

export type { PublishResult } from "@/lib/postSchedule";

/** Publish now (and optionally email). Clears any schedule on the post. */
export async function publishPost(id: string, sendEmail: boolean): Promise<PublishResult> {
  await requireAdmin();
  return publishAndSend(id, sendEmail);
}

export type ScheduleResult = { ok: true; label: string } | { ok: false; error: string };

/**
 * Schedules a draft to publish itself. `when` is a slot's ISO time, or an
 * Eastern "YYYY-MM-DDTHH:mm" from the date picker.
 */
export async function schedulePost(id: string, when: string, sendEmail: boolean): Promise<ScheduleResult> {
  await requireAdmin();
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { ok: false, error: "Post not found." };
  if (post.publishedAt) return { ok: false, error: "This post is already live." };
  if (!post.bodyHtml.replace(/<[^>]+>/g, "").trim()) return { ok: false, error: "The post body is empty." };
  const at = /Z$/.test(when) ? new Date(when) : easternLocalToUtc(when);
  if (!at || Number.isNaN(at.getTime())) return { ok: false, error: "Pick a date and time." };
  if (at.getTime() < Date.now() + 5 * 60_000) return { ok: false, error: "Pick a time at least a few minutes from now." };
  if (at.getTime() > Date.now() + 366 * 86_400_000) return { ok: false, error: "Pick a time within the next year." };
  await prisma.post.update({ where: { id }, data: { scheduledAt: at, scheduleSendEmail: sendEmail } });
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
  return { ok: true, label: scheduleLabel(at) };
}

export async function unschedulePost(id: string) {
  await requireAdmin();
  await prisma.post.update({ where: { id }, data: { scheduledAt: null } });
  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
}

export async function unpublishPost(id: string) {
  await requireAdmin();
  const post = await prisma.post.update({ where: { id }, data: { publishedAt: null } });
  revalidatePath("/minutes");
  revalidatePath(`/minutes/${post.slug}`);
  revalidatePath("/admin/posts");
}

export async function deletePost(id: string) {
  await requireAdmin();
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) redirect("/admin/posts");
  if (post.sentAt) throw new Error("A post that was emailed can’t be deleted — unpublish it instead.");
  await prisma.post.delete({ where: { id } });
  revalidatePath("/minutes");
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}
