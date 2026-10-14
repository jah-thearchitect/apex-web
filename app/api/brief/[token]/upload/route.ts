import { NextResponse } from "next/server";
import { saveClientUpload } from "@/lib/briefs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const brief = await prisma.buildBrief.findUnique({ where: { token }, select: { id: true, status: true } });
  if (!brief) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  if (brief.status === "SUBMITTED") return NextResponse.json({ error: "This brief was already submitted." }, { status: 409 });

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  try {
    const result = await saveClientUpload(file, `briefs/${brief.id}/`);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.file);
  } catch (err) {
    console.error("Brief upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
