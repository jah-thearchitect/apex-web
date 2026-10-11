"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearFailures, isLocked, recordFailure } from "@/lib/loginRateLimit";
import { sendPostToSubscribers } from "@/lib/newsletter";
import { cleanHtml, slugify } from "@/lib/posts";
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
    bodyHtml: cleanHtml(input.bodyHtml),
  };

  const post = input.id
    ? await prisma.post.update({ where: { id: input.id }, data })
    : await prisma.post.create({ data });

  revalidatePath("/minutes");
  revalidatePath(`/minutes/${post.slug}`);
  revalidatePath("/admin");
  return { ok: true, id: post.id, slug: post.slug };
}

export type PublishResult = { ok: true; sent: number; alreadySent: boolean } | { ok: false; error: string };

/**
 * Publishes the post and, if asked, emails it to every active subscriber.
 * The sentAt claim is atomic: a double click or two open tabs can't send
 * the same post twice.
 */
export async function publishPost(id: string, sendEmail: boolean): Promise<PublishResult> {
  await requireAdmin();
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return { ok: false, error: "Post not found." };
  if (!post.bodyHtml.replace(/<[^>]+>/g, "").trim()) return { ok: false, error: "The post body is empty." };

  const published = post.publishedAt
    ? post
    : await prisma.post.update({ where: { id }, data: { publishedAt: new Date() } });
  revalidatePath("/minutes");
  revalidatePath(`/minutes/${post.slug}`);
  revalidatePath("/admin");

  if (!sendEmail) return { ok: true, sent: 0, alreadySent: !!post.sentAt };

  const claim = await prisma.post.updateMany({ where: { id, sentAt: null }, data: { sentAt: new Date() } });
  if (claim.count === 0) return { ok: true, sent: 0, alreadySent: true };

  const result = await sendPostToSubscribers(published);
  if (result.sent === 0 && result.error) {
    // Nothing went out, so release the claim and let the admin retry.
    await prisma.post.update({ where: { id }, data: { sentAt: null } });
    return { ok: false, error: `The post is published, but the email didn’t go out: ${result.error}` };
  }
  // A partial send keeps sentAt set so nobody gets the post twice.
  await prisma.post.update({ where: { id }, data: { sentCount: result.sent } });
  revalidatePath("/admin");
  if (result.error) {
    return { ok: false, error: `Sent to ${result.sent} of ${result.total} subscribers, then stopped: ${result.error}` };
  }
  return { ok: true, sent: result.sent, alreadySent: false };
}

export async function unpublishPost(id: string) {
  await requireAdmin();
  const post = await prisma.post.update({ where: { id }, data: { publishedAt: null } });
  revalidatePath("/minutes");
  revalidatePath(`/minutes/${post.slug}`);
  revalidatePath("/admin");
}

export async function deletePost(id: string) {
  await requireAdmin();
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) redirect("/admin");
  if (post.sentAt) throw new Error("A post that was emailed can’t be deleted — unpublish it instead.");
  await prisma.post.delete({ where: { id } });
  revalidatePath("/minutes");
  revalidatePath("/admin");
  redirect("/admin");
}
