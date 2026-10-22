"use server";

import { revalidatePath } from "next/cache";
import { emailBriefLink, emailRequestDone, emailRequestQuestion, emailUpdateLink } from "@/lib/briefs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

type Result = { ok: true; message: string } | { ok: false; error: string };

/**
 * Sends the build brief by hand (prototype deals, or a resend). Reuses the
 * client's brief in progress if there is one, so they never get two.
 */
export async function sendBuildBrief(clientId: string): Promise<Result> {
  await requireAdmin();
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Client not found." };
  const brief =
    (await prisma.buildBrief.findFirst({ where: { clientId, status: { not: "SUBMITTED" } }, orderBy: { createdAt: "desc" } })) ??
    (await prisma.buildBrief.create({ data: { clientId } }));
  try {
    await emailBriefLink(brief, client);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The email didn't send." };
  }
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/requests");
  return { ok: true, message: `Build brief sent to ${client.email}.` };
}

/** Lets the client edit a submitted brief again (same link). */
export async function reopenBrief(id: string): Promise<Result> {
  await requireAdmin();
  const brief = await prisma.buildBrief.update({ where: { id }, data: { status: "STARTED", submittedAt: null } }).catch(() => null);
  if (!brief) return { ok: false, error: "Brief not found." };
  revalidatePath(`/admin/requests/brief/${id}`);
  return { ok: true, message: "Reopened. The client's link works again; resend it from their page if needed." };
}

export async function sendUpdateLink(clientId: string): Promise<Result> {
  await requireAdmin();
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Client not found." };
  try {
    await emailUpdateLink(client);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The email didn't send." };
  }
  return { ok: true, message: `Update link sent to ${client.email}.` };
}

/**
 * Emails the client a follow-up question on their update request, records
 * it in the request's thread, and marks the request as waiting on them.
 */
export async function askClient(requestId: string, question: string): Promise<Result> {
  await requireAdmin();
  const body = question.trim().slice(0, 4000);
  if (!body) return { ok: false, error: "Write your question first." };
  const req = await prisma.changeRequest.findUnique({ where: { id: requestId }, include: { client: true } });
  if (!req) return { ok: false, error: "Request not found." };
  try {
    await emailRequestQuestion(req, req.client, body);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The email didn't send." };
  }
  await prisma.$transaction([
    prisma.requestMessage.create({ data: { requestId, from: "FIRM", body } }),
    prisma.changeRequest.update({ where: { id: requestId }, data: { status: "WAITING", completedAt: null } }),
  ]);
  revalidatePath(`/admin/requests/update/${requestId}`);
  revalidatePath("/admin/requests");
  return { ok: true, message: `Sent to ${req.email}.` };
}

/**
 * Marks an update request done. The note (what was done) is added to the
 * request's thread, and the client is emailed unless `notify` is false.
 */
export async function completeRequest(requestId: string, note: string, notify: boolean): Promise<Result> {
  await requireAdmin();
  const body = note.trim().slice(0, 4000);
  const req = await prisma.changeRequest.findUnique({ where: { id: requestId }, include: { client: true } });
  if (!req) return { ok: false, error: "Request not found." };
  if (notify) {
    try {
      await emailRequestDone(req, req.client, body);
    } catch (err) {
      const why = (err instanceof Error ? err.message : "unknown error").replace(/\.$/, "");
      return { ok: false, error: `Not marked done, because the email didn't send: ${why}. Try again, or untick the email box.` };
    }
  }
  await prisma.$transaction([
    ...(body ? [prisma.requestMessage.create({ data: { requestId, from: "FIRM", body } })] : []),
    prisma.changeRequest.update({ where: { id: requestId }, data: { status: "DONE", completedAt: new Date() } }),
  ]);
  revalidatePath(`/admin/requests/update/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin", "layout");
  return { ok: true, message: notify ? `Marked done and emailed ${req.email}.` : "Marked done (client not emailed)." };
}

const STATUSES = ["NEW", "IN_PROGRESS", "WAITING", "DONE"] as const;

export async function setRequestStatus(id: string, status: string): Promise<Result> {
  await requireAdmin();
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { ok: false, error: "Unknown status." };
  const s = status as (typeof STATUSES)[number];
  const cr = await prisma.changeRequest
    .update({ where: { id }, data: { status: s, completedAt: s === "DONE" ? new Date() : null } })
    .catch(() => null);
  if (!cr) return { ok: false, error: "Request not found." };
  revalidatePath(`/admin/requests/update/${id}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Status updated." };
}
