import { NextResponse } from "next/server";
import { saveClientUpload } from "@/lib/briefs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await prisma.client.findUnique({ where: { requestToken: token }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  try {
    const result = await saveClientUpload(file, `requests/${client.id}/`);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.file);
  } catch (err) {
    console.error("Update request upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
