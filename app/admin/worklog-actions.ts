"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { WORK_CATEGORIES } from "@/lib/workLogShared";

export type WorkLogState = { error?: string; saved?: number };

/** Adds a work-log entry, or updates one when the form carries an `id`. */
export async function saveWorkLog(_prev: WorkLogState, form: FormData): Promise<WorkLogState> {
  await requireAdmin();
  const str = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const id = str("id", 40);
  const clientId = str("clientId", 40);
  const date = str("date", 10);
  const category = str("category", 60);
  const title = str("title", 160);

  if (!clientId || !(await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }))) return { error: "Pick which client this work was for." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { error: "Pick the date the work was done." };
  if (!(WORK_CATEGORIES as readonly string[]).includes(category)) return { error: "Pick a category." };
  if (!title) return { error: "Give it a short title, like “Added staff permissions”." };

  const hours = Math.max(0, Math.round(Number(form.get("hours")) || 0));
  const mins = Math.max(0, Math.round(Number(form.get("mins")) || 0));
  const total = Math.min(24 * 60, hours * 60 + mins);

  const data = {
    clientId,
    workDate: new Date(`${date}T00:00:00.000Z`),
    project: str("project", 120) || null,
    category,
    title,
    details: str("details", 4000) || null,
    minutes: total > 0 ? total : null,
    visible: form.get("visible") === "on",
  };
  if (id) {
    const found = await prisma.workLog.updateMany({ where: { id }, data });
    if (!found.count) return { error: "That entry no longer exists." };
    revalidatePath("/admin/worklog");
    redirect(`/admin/worklog?client=${clientId}&month=${date.slice(0, 7)}`);
  }
  await prisma.workLog.create({ data });
  revalidatePath("/admin/worklog");
  return { saved: Date.now() };
}

export async function deleteWorkLog(id: string): Promise<void> {
  await requireAdmin();
  const e = await prisma.workLog.findUnique({ where: { id } });
  if (e) await prisma.workLog.delete({ where: { id } });
  revalidatePath("/admin/worklog");
  redirect(e ? `/admin/worklog?client=${e.clientId}&month=${e.workDate.toISOString().slice(0, 7)}` : "/admin/worklog");
}
