import { NextResponse } from "next/server";
import { notifyFirm } from "@/lib/billing";
import type { FileRef } from "@/lib/briefQuestions";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

const DAILY_LIMIT = 30;

// A client's reply on one of their update requests. Their permanent update
// token authorizes it; the request must belong to that client.
export async function POST(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const cr = await prisma.changeRequest.findFirst({ where: { id, client: { requestToken: token } }, include: { client: true } });
  if (!cr) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 6000) : "";
  const prefix = `requests/${cr.clientId}/`;
  const files: FileRef[] = (Array.isArray(body.files) ? body.files : [])
    .slice(0, 15)
    .filter((f): f is FileRef => !!f && typeof f === "object" && typeof (f as FileRef).path === "string")
    .filter((f) => f.path.startsWith(prefix) && !f.path.includes(".."))
    .map((f) => ({ path: f.path.slice(0, 300), name: String(f.name ?? "file").slice(0, 200), size: Number(f.size) || 0 }));
  if (!text && files.length === 0) return NextResponse.json({ error: "Write your answer or attach a file." }, { status: 400 });

  const since = new Date(Date.now() - 86_400_000);
  if ((await prisma.requestMessage.count({ where: { requestId: cr.id, from: "CLIENT", createdAt: { gte: since } } })) >= DAILY_LIMIT) {
    return NextResponse.json({ error: "That's a lot of replies for one day. Email Apex directly." }, { status: 429 });
  }

  await prisma.$transaction([
    prisma.requestMessage.create({ data: { requestId: cr.id, from: "CLIENT", body: text, files } }),
    // Back in the firm's queue (and the nav count) with the new information.
    prisma.changeRequest.update({ where: { id: cr.id }, data: { status: "NEW", completedAt: null } }),
  ]);
  await notifyFirm(`Reply on update request: ${cr.client.businessName} (${cr.kind})`, [
    `${cr.name} replied on their update request (${cr.kind}).`,
    "",
    text || "(No message, files only.)",
    "",
    ...(files.length ? [`${files.length} file${files.length === 1 ? "" : "s"} attached.`] : []),
    `Open it: ${SITE_URL}/admin/requests/update/${cr.id}`,
  ]);
  return NextResponse.json({ ok: true });
}
