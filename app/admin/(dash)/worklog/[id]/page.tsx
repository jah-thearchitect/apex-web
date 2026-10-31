import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteWorkLog } from "@/app/admin/worklog-actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { WorkLogForm } from "@/components/admin/WorkLogForm";
import { prisma } from "@/lib/prisma";
import { ymdOf } from "@/lib/workLogShared";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit work log entry" };

export default async function EditWorkLog({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await prisma.workLog.findUnique({ where: { id } });
  if (!e) notFound();
  const clients = await prisma.client.findMany({ orderBy: { businessName: "asc" }, select: { id: true, businessName: true } });
  const projectRows = await prisma.workLog.findMany({ where: { project: { not: null } }, distinct: ["clientId", "project"], select: { clientId: true, project: true } });
  const projects: Record<string, string[]> = {};
  for (const r of projectRows) (projects[r.clientId] ??= []).push(r.project!);

  const back = `/admin/worklog?client=${e.clientId}&month=${ymdOf(e.workDate).slice(0, 7)}`;
  return (
    <>
      <div className="admin-head">
        <div>
          <Link href={back} className="admin-back">&larr; Work log</Link>
          <h1>Edit entry</h1>
          {e.requestId && <p className="admin-sub">Created automatically when this update request was marked done. Add the time you spent, or adjust the wording.</p>}
        </div>
      </div>
      <WorkLogForm
        clients={clients.map((c) => ({ id: c.id, name: c.businessName }))}
        projects={projects}
        initial={{
          id: e.id,
          clientId: e.clientId,
          date: ymdOf(e.workDate),
          project: e.project ?? "",
          category: e.category,
          title: e.title,
          details: e.details ?? "",
          hours: e.minutes ? String(Math.floor(e.minutes / 60)) : "",
          mins: e.minutes && e.minutes % 60 ? String(e.minutes % 60) : "",
          visible: e.visible,
        }}
      />
      <form action={deleteWorkLog.bind(null, e.id)} className="editor-danger">
        <ConfirmSubmit className="btn-ghost danger" message="Delete this work log entry? This can't be undone.">Delete entry</ConfirmSubmit>
      </form>
    </>
  );
}
