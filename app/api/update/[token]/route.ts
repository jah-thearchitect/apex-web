import { NextResponse } from "next/server";
import { notifyFirm } from "@/lib/billing";
import { OTHER, UPDATE_KINDS, UPDATE_URGENCY, type FileRef } from "@/lib/briefQuestions";
import { emailReceived } from "@/lib/briefs";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAILY_LIMIT = 20;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function cleanFiles(raw: unknown, prefix: string): FileRef[] {
  if (!Array.isArray(raw)) return [];
  const out: FileRef[] = [];
  for (const f of raw.slice(0, 15)) {
    if (!f || typeof f !== "object") continue;
    const { path, name, size } = f as Record<string, unknown>;
    if (typeof path !== "string" || !path.startsWith(prefix) || path.includes("..")) continue;
    out.push({ path: path.slice(0, 300), name: String(name ?? "file").slice(0, 200), size: Number(size) || 0 });
  }
  return out;
}

// An existing client's change request, from their permanent /update link.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await prisma.client.findUnique({ where: { requestToken: token } });
  if (!client) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = str(body.name, 120);
  const email = str(body.email, 254).toLowerCase();
  const build = str(body.build, 200) || client.businessName;
  const kindPick = str(body.kind, 80);
  const kind = kindPick === OTHER ? `Other: ${str(body.kindOther, 120) || "unspecified"}` : kindPick;
  const details = str(body.details, 6000);
  const location = str(body.location, 1500);
  const urgency = str(body.urgency, 80);
  const files = cleanFiles(body.files, `requests/${client.id}/`);

  if (!name || !EMAIL_RE.test(email) || !details || !UPDATE_KINDS.includes(kindPick) || !UPDATE_URGENCY.includes(urgency)) {
    return NextResponse.json({ error: "Fill in your name, email, the kind of change, how soon, and what needs to change." }, { status: 400 });
  }

  const since = new Date(Date.now() - 86_400_000);
  if ((await prisma.changeRequest.count({ where: { clientId: client.id, createdAt: { gte: since } } })) >= DAILY_LIMIT) {
    return NextResponse.json({ error: "That's a lot of requests for one day. Email Apex directly and we'll sort it out." }, { status: 429 });
  }

  const cr = await prisma.changeRequest.create({
    data: { clientId: client.id, name, email, build, kind, details, location, urgency, files },
  });
  const flag = urgency.startsWith("Urgent") ? "URGENT " : "";
  await notifyFirm(`${flag}Update request: ${client.businessName} (${kind})`, [
    `${name} (${email}) asked for an update on ${build}.`,
    `Kind: ${kind}. How soon: ${urgency}.`,
    ...(location ? [`Where: ${location}`] : []),
    "",
    details,
    "",
    `${files.length} file${files.length === 1 ? "" : "s"} attached.`,
    `Open it: ${SITE_URL}/admin/requests/update/${cr.id}`,
  ]);
  await emailReceived(email, name, "update", client);
  return NextResponse.json({ ok: true });
}
